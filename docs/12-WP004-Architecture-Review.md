# WP004 Architecture Review — Case Module

Scope: review only. No code was modified, no migrations were created, and WP005 was not started.

## Executive Summary

The Case module (WP004) is functionally complete against its re-scoped Acceptance Criteria, well-layered, and reasonably well tested (56 unit + 7 real-database integration tests, all passing; build and lint clean). Service boundaries are mostly clean, with one intentional and clearly documented exception (initial `DRAFT` status assignment lives in `CasesService.create`, not `StatusTransitionService`). Transaction boundaries are correct everywhere a multi-step write occurs — no partial-write paths were found. Search is N+1-free and appropriately indexed for its exact-match filters.

Two things keep this from being production-ready: there is no authentication layer (out of scope by explicit prior decision, not a WP004 defect), and this review surfaced a real, previously-unflagged gap — `StatusTransitionService` and `AssignmentService` never validate the `changedById`/`assignedById` actor against the `users` table, unlike `CasesService.create`/`remove`, which do. A malformed actor id on those three endpoints will currently surface as a raw, unhandled 500 (Postgres FK violation) instead of a clean 404. This is safe from a data-integrity standpoint (the database constraint still blocks the write) but is a real robustness gap, and matters more in the absence of an auth layer that would otherwise guarantee valid actor ids upstream.

Documentation is consistent across the WP004-authored set (`CURRENT_STATE.md`, `README.md`, `docs/10-Case-API-Spec.md`, `docs/11-WP004-Completion-Report.md`), but `docs/04-Database.md` (a pre-WP004 planning document) was never updated and is now stale, and `WORKING_SET.md` — despite naming itself and `docs/06-API.md` in its own "files to update on completion" list — was not updated by any WP004 step.

**Recommendation: Go** — close WP004 and proceed with the roadmap. **No-Go for production traffic** until the actor-validation gap is closed and an applicant-to-company linkage path exists (see Readiness, below).

---

## Findings by Review Area

### 1. Architecture — Service Boundaries

| Service | Responsibility | Overlap? |
| --- | --- | --- |
| `CasesService` | create/get/update/soft-delete a case | Writes the *initial* `current_status_id` (`DRAFT`) and the first `case_status_history` row inside its own `create` transaction |
| `StatusTransitionService` | all *subsequent* status changes | The only writer of `current_status_id` after creation |
| `AssignmentService` | `case_assignments` writes | Sole writer (confirmed: no other file references `getRepository(CaseAssignment)`) |
| `TimelineService` | `timeline` writes | Sole writer (confirmed: no other file references `getRepository(TimelineEvent)`) |
| `CaseNumberService` | case-number sequence generation only | None |
| `CaseSearchService` | `GET /cases` query building, read-only | None — deliberately kept separate from `CasesService` per the WP004.4 instruction |
| `CaseStateMachine` | pure transition-legality function, no I/O | None |

The `CasesService`/`StatusTransitionService` overlap on `current_status_id` is real but intentional and documented (`docs/10-Case-API-Spec.md`'s "Initial status assignment note"): a case cannot have a status history before it exists, so the very first status write has to happen inside the creation transaction. No other boundary overlaps were found.

**New finding — actor validation is inconsistent across services.** `CasesService.create` validates `createdById` (404 `USER_NOT_FOUND` if missing/inactive) and `CasesService.remove` validates `deletedById` the same way. `StatusTransitionService.transition(caseId, targetCode, reason, changedBy)` and `AssignmentService.assign/unassign(..., assignedBy/changedBy)` do **not** validate their actor parameter against `users` at all — it is written straight into a `NOT NULL REFERENCES users(id)` column. A syntactically valid but non-existent UUID will fail at the database level with an unhandled foreign-key violation (raw 500), not the clean 404 the rest of the module uses. This does not risk data corruption (the FK constraint still blocks the write) but is a genuine consistency gap between four "write an actor id" code paths, three of which trust the caller.

### 2. Database

**Entities / relationships / FKs** (from the five WP004 migrations): `companies` 1–N `contacts`; `companies` 1–N `applicants` (nullable) and 1–N `cases` (nullable, denormalized — see below); `applicants` 1–N `cases`; `case_types` 1–N `cases`; `case_statuses` 1–N `cases` and 1–N `case_status_history` (both `from_status_id`/`to_status_id`); `users` referenced from `cases.created_by_id`, `cases.deleted_by`, `case_status_history.changed_by_id`, `case_assignments.user_id` **and** `case_assignments.assigned_by_id`, and `timeline.created_by_id`. All FKs use plain `REFERENCES` with default `NO ACTION` (no `ON DELETE CASCADE` anywhere) — appropriate for an audit-heavy domain where losing history on a parent delete would be wrong.

**Redundant column:** `cases.company_id` is an intentional denormalized snapshot of `applicants.company_id` (business rule 2, `docs/09-Case-Domain.md`) — it exists specifically so `CaseSearchService` can filter by company without a join. There is, however, **no database-level mechanism** (trigger, check constraint, or generated column) enforcing that it stays equal to the applicant's company. It is only synchronized once, at case-creation time, in application code. There is currently no API path that would cause drift (no endpoint updates `applicants.company_id`), so this is latent rather than active risk today.

**Missing indexes:**
- `case_status_history.case_id` has no index (Postgres does not auto-index FK columns). A future "case history" screen querying by `case_id` would sequential-scan this table as it grows.
- `case_assignments` has a unique **partial** index on `case_id` (`WHERE unassigned_at IS NULL`) which serves "find the active assignment" well, but there is no plain index for "all assignments ever for this case" or for "all cases currently assigned to user X" as a primary query (today `assignedUserId` search is only ever combined with a scan already anchored elsewhere).
- No index supports `GET /cases`'s `caseNumber`/`keyword` `ILIKE` filters — already documented as a known, deliberate limitation in `docs/10-Case-API-Spec.md`, confirmed accurate.

**Soft delete:** implemented on `cases` only (`deleted_at` + `deleted_by`), correctly excluded by default in both `CasesService.findOne`/service methods and `CaseSearchService`. Child audit tables (`case_status_history`, `case_assignments`, `timeline`) are *not* soft-deleted when their case is — this is correct by design (an audit trail should survive its subject's deletion) and is explicitly documented, not an oversight.

**Timeline:** append-only, single writer, `entity_type`/`entity_id` generalized for future Document/Task events — good forward compatibility.

**Documentation vs. schema — schema inconsistency found:** `docs/04-Database.md`'s `cases` row (`id, case_number, company_id, applicant_id, case_type_id, current_status_id, created_by_id, opened_at, created_at, updated_at, completed_at`) is missing `deleted_at` and `deleted_by`, and its table list has no entry at all for `case_types`, `case_statuses`, `case_status_history`, `case_assignments`, or `case_number_sequences` — five tables that exist in the real schema and are documented elsewhere (`docs/09-Case-Domain.md`, `docs/11-WP004-Completion-Report.md`) but never made it back into the Phase-0 planning document.

### 3. API

**REST consistency:** resource-oriented (`/cases`, `/case-types`, `/case-statuses`) with action sub-resources (`/cases/:id/transition`, `/assign`, `/unassign`, `/case-types/:id/activate`, `/deactivate`) for operations that need an audited side effect rather than a plain field update — a reasonable, consistent pattern.

**HTTP status codes:** `GET`→200, `PATCH`→200, `DELETE`→204 (explicit) throughout — consistent. Minor nitpick: `POST /cases/:id/transition`, `.../activate`, and `.../deactivate` return the Nest default 201 despite not creating a new resource (mutating an existing one); `POST /cases/:id/assign` creating a `case_assignments` row justifies 201 more naturally. Cosmetic, not a functional defect.

**DTO consistency:** every actor-id field is named after the verb it belongs to (`createdById`, `changedById`, `assignedById`, `deletedById`) rather than a single shared name — self-documenting per endpoint, but a real naming inconsistency across an otherwise-identical concept ("the acting user"). Likely moot once an auth layer supplies the actor implicitly instead of as a body field.

**Swagger completeness:** verified by fetching `/api/docs-json` — all 20 endpoints present, every DTO field has `@ApiProperty`/`@ApiPropertyOptional` with a description and example, every endpoint has `@ApiOperation` and `@ApiResponse` for its success code and every documented error code. **Gap:** response bodies are documented with a `description` string only, not a typed schema/example (no `@ApiResponse({ type: ... })` and no `@ApiProperty`-decorated response models for `Case`, `CaseAssignment`, etc.) — a Swagger UI consumer sees accurate prose but no example success-response JSON. Request-side documentation (what a consumer needs to *call* the API) is complete; response-side is prose-only.

**Error response consistency:** all business errors use `NotFoundException`/`BadRequestException`/`ConflictException` with a single bare string code (`CASE_NOT_FOUND`, `STATUS_REASON_REQUIRED`, `CASE_TYPE_IN_USE`, etc.), producing Nest's standard `{ statusCode, message, error }` shape uniformly across the module — consistent, and the 400/404/409 choices are appropriately mapped case by case.

### 4. Transactions

Every multi-step write is wrapped in exactly one `dataSource.transaction(...)` call, and no method spans two transactions for what should be one atomic operation:

- `CasesService.create` — applicant/type/user/status lookups, case-number generation, case insert, `case_status_history` insert, timeline event: **one transaction**.
- `StatusTransitionService.transition` — case/status lookups, state-machine check, case update, history insert, timeline event: **one transaction**.
- `AssignmentService.assign`/`unassign` — case/user lookups, closing the prior assignment, creating/closing the assignment, timeline event: **one transaction** each.
- `CasesService.update`/`remove`, `CaseTypesService`/`CaseStatusesService` update/activate/deactivate — each performs at most one write statement; no explicit transaction is needed and none is missing.

**No partial-write path was found.** The one nuance: `CaseTypesService.remove`/`CaseStatusesService.remove` do a `count()` check and then a separate `.remove()` call, not wrapped together in a transaction. Under concurrent load, a case could be created referencing the row between the count and the delete; the delete would then fail with a raw FK-violation 500 instead of the intended clean 409 `..._IN_USE`. The database constraint prevents actual data corruption either way — this is a narrow, low-probability error-code quality issue, not a correctness bug.

### 5. Performance

- **QueryBuilder / N+1:** `CaseSearchService` builds one query and calls `getManyAndCount()` — exactly two queries (data + count) regardless of how many filters are active, including the `assignedUserId` join. No N+1 anywhere in the module.
- **Indexes:** exact-match filters (`companyId`, `applicantId`, `caseTypeId`, `statusId`) are all backed by existing indexes; the `assignedUserId` join is protected against row duplication by the unique partial index on active assignments. `caseNumber`/`keyword` `ILIKE` filters are unindexed sequential scans (documented, deliberate, acceptable at current SME-scale data volumes).
- **Sorting:** `sortBy` is allow-listed to four fields via `IsIn` (no injection risk). `createdAt` sorting can use the partial index `idx_cases_active_created_at`; `openedAt` sorting has no dedicated index and would sort-scan. Low priority at current scale.
- **Pagination:** offset-based (`skip`/`take`) — simple and adequate for the project's stated SME scale (2–10 users); would degrade at very deep pages/large datasets, which is not a near-term concern here.

Bottleneck ranking: (1) `keyword`/`caseNumber` search at real data volume, (2) `openedAt` sort without a supporting index — both low-urgency given the target user count.

### 6. Testing

56 unit tests (mocked repositories) + 7 real-PostgreSQL integration tests, all currently passing; build and lint clean. Coverage is strong for the business-rule branches exercised across WP004.1–4.5's own review gates. Concrete gaps identified in this review:

- **No test verifies the explicit business rule that case-number generation is "safe under concurrent requests"** (`WORKING_SET.md`). The implementation (an atomic `INSERT ... ON CONFLICT DO UPDATE`) is architecturally sound, but nothing exercises it under actual concurrency (e.g., N parallel `POST /cases` asserting N unique sequential numbers).
- No HTTP-layer (controller/e2e) test exists for the case-type/case-status guarded-delete 409 path, or for `PATCH`/`activate`/`deactivate` beyond their incidental use as fixtures in `case-validation.e2e-spec.ts`.
- The one integration workflow test never exercises a second results page, `pageSize` truncation, or real multi-row `ORDER BY` behavior — search's HTTP-level pagination/sorting is only unit-tested against a mocked `QueryBuilder`.
- No automated check asserts the Swagger document is well-formed or complete (it was verified manually, once, for this review — not part of CI/the test suite).
- The claimed index usage in `docs/10-Case-API-Spec.md` is architecturally reasoned, not verified against a real query plan (`EXPLAIN ANALYZE`).

### 7. Documentation Consistency

`CURRENT_STATE.md`, `README.md`, `docs/10-Case-API-Spec.md`, and `docs/11-WP004-Completion-Report.md` are mutually consistent (migration list, endpoint list, test counts, known limitations all agree), and `docs/09-Case-Domain.md`'s business rules match the implemented state machine and validation rules. Two gaps found:

- `docs/04-Database.md` is stale (see Database findings above) — never updated across any WP004 step.
- `WORKING_SET.md` names `docs/06-API.md`, `CURRENT_STATE.md`, `docs/10-Case-API-Spec.md`, and `README.md` as files to update "on completion," and names `docs/06-API.md` in its own "Files Currently Being Modified" list — `docs/06-API.md` was never touched, and `WORKING_SET.md` itself was never updated to reflect WP004's completion (it still reads as an open objective with no closing note).

---

## Strengths

- Clean separation of a pure state-machine (`CaseStateMachine`), transactional business services, and a dedicated read-only search service — no god-service, no business logic in controllers.
- Every multi-step write is transactionally atomic; no partial-write paths exist.
- Search is N+1-free and appropriately indexed for its primary (exact-match) filters, with known limitations honestly documented rather than silently accepted.
- Timeline and status-history are genuinely append-only and single-writer, verified by direct code inspection, not just by convention.
- Integration tests exercise a real PostgreSQL connection and caught a real, latent defect (entity column type-mapping) that 56 passing mocked unit tests could not have found.
- Documentation for the WP004-authored set is thorough and internally consistent, including several places where a scoping decision was deliberately written down rather than silently made.

## Weaknesses

- Actor-id validation is inconsistent: two of five actor-bearing operations (`create`, `remove`) validate the actor; three (`transition`, `assign`, `unassign`) do not.
- The `cases.company_id` denormalization has no database-level consistency enforcement.
- Case-type/status guarded delete has a narrow check-then-act race (error-code quality only, not data integrity).
- Response bodies are not schema-documented in Swagger, only in prose.
- `docs/04-Database.md` and `WORKING_SET.md` were left stale relative to the actual completed work.

## Risks

- Without authentication, the actor-id fields are fully caller-supplied and unverified end-to-end for three endpoints — anyone reaching the API can act as any user id for those calls, and an invalid one currently produces an unhandled 500 rather than a clean error.
- No applicant-to-company linkage API means `cases.company_id` will be `null` for every case created through the current API/UI in practice, undermining the company-based search filter for real usage until either that API exists or data is backfilled directly.
- Missing indexes on `case_status_history.case_id`/`case_assignments.case_id` are a low risk today but will degrade as case volume grows and a "case history" or "my cases" view is built in a later WP.

## Technical Debt

**Critical:** none identified.

**Medium:**
- Inconsistent actor-id validation across `StatusTransitionService`/`AssignmentService` vs. `CasesService` (raw 500 instead of clean 404 on a bad actor id).
- `cases.company_id` denormalization has no DB-level consistency guard.
- `docs/04-Database.md` is stale relative to the real schema (missing 2 columns and 3+ tables).
- No concurrency test for the explicitly-required "safe under concurrent requests" case-number rule.
- Check-then-act race on case-type/status guarded delete.

**Low:**
- Missing non-partial indexes on `case_status_history.case_id` and `case_assignments.case_id`/`user_id`.
- `openedAt` sort has no supporting index.
- Cosmetic: 201 returned for non-creating actions (`transition`, `activate`, `deactivate`).
- Cosmetic: inconsistent actor-id field naming across DTOs.
- Swagger response bodies are prose-only, not schema/example-based.
- `WORKING_SET.md` and `docs/06-API.md` not updated per `WORKING_SET.md`'s own stated file list.
- Pre-existing, unrelated `app.e2e-spec.ts` scaffold-test failure (already documented, cosmetic CI noise).

## Recommendations

1. Add actor-id validation (existence + `active`) to `StatusTransitionService.transition` and `AssignmentService.assign`/`unassign`, matching the pattern already used in `CasesService`.
2. Wrap the case-type/status guarded-delete count-check and the delete itself in a single transaction (or re-check inside it) to close the race, even though the DB constraint already prevents actual corruption.
3. Refresh `docs/04-Database.md` to match the real schema, and either update `WORKING_SET.md`/`docs/06-API.md` or explicitly note in `WORKING_SET.md` why they were intentionally left as-is.
4. Before production use: design and build an applicant-to-company linkage path, and treat authentication/RBAC as a hard prerequisite, not a nice-to-have.
5. Add a concurrency test for `CaseNumberService` given it is an explicit, named business rule.
6. Consider adding non-partial indexes on `case_status_history.case_id` and `case_assignments.case_id` ahead of any "case history" or "my cases" feature (WP006/WP007-adjacent), rather than after a performance complaint.

None of the above block closing WP004 as scoped — they are follow-up items, not open defects in what was asked for.

## Go / No-Go Decision

**Go — for closing WP004 and proceeding with the roadmap.** The module delivers what was re-scoped and agreed across WP004.1–4.5, is transactionally sound, is free of N+1 and partial-write defects, and is backed by tests that include real-database integration coverage.

**No-Go — for production traffic**, until: (a) authentication/RBAC exists, (b) the actor-id validation gap is closed, and (c) an applicant-to-company linkage path exists so `cases.company_id` is populated in real usage rather than only in tests that write it directly.
