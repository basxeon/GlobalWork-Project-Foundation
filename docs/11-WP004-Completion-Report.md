# WP004 Completion Report — Case Module

Status: implementation complete, submitted for final review (WP004.5).

## Architecture Summary

The Case module follows the modular-monolith layering set out in `docs/08-Coding-Standard.md`: controllers contain no business rules, business logic lives in services, and TypeORM repositories are the only thing touching the database.

Two NestJS modules were added:

- **`CasesModule`** (`apps/api/src/cases/`) — `CasesController` (CRUD, transition, assign/unassign, search endpoints) backed by five single-purpose services:
  - `CasesService` — create/get/update/soft-delete only.
  - `CaseNumberService` — transaction-safe `GW-YYYY-#####` sequence generation (`case_number_sequences` table, `INSERT ... ON CONFLICT DO UPDATE`).
  - `StatusTransitionService` — the **only** writer of `cases.current_status_id` for a status change (the one exception is the initial `DRAFT` assignment inside `CasesService.create`'s own transaction, which is documented as not being a "transition" — see `docs/10-Case-API-Spec.md`). Enforces the state machine and the reason requirement, and writes `case_status_history` + a timeline event in the same transaction.
  - `AssignmentService` — the only writer of `case_assignments`. Enforces "at most one active assignment" and writes a timeline event in the same transaction.
  - `TimelineService` — the only writer of the `timeline` table (verified by grep during the WP004.1 review gate: no other file calls `getRepository(TimelineEvent)`).
  - `CaseSearchService` — a **dedicated** service for `GET /cases`, deliberately kept out of `CasesService` per the WP004.4 instruction. Built as a single `TypeORM` `QueryBuilder` chain + `getManyAndCount()` (one query + its paired count — not N+1).
  - `CaseStateMachine` — pure, stateless transition-legality rules, hardcoded on `case_statuses.code` (not `category`).

- **`CaseDomainModule`** (`apps/api/src/case-domain/`) — `CaseTypesController`/`CaseTypesService` and `CaseStatusesController`/`CaseStatusesService`, a lookup API (Read, Update name/sortOrder, Activate/Deactivate, guarded Delete). Create is intentionally not implemented — see the Known Limitations section of `docs/10-Case-API-Spec.md` for the scoping rationale.

Swagger (`@nestjs/swagger` decorators, no CLI plugin enabled) documents every endpoint: `@ApiOperation` summaries/descriptions, `@ApiBody`/`@ApiProperty` request examples on every DTO, `@ApiResponse` for both success and every documented error code, and `@ApiQuery` for every `GET /cases` filter. Verified by booting the app and fetching `/api/docs-json` — all 20 API paths present with populated schemas.

## Database Changes

No new migration and no schema change in this step (WP004.5). All five Case-module migrations were completed in earlier WP004 steps:

| Migration | Adds |
| --- | --- |
| `202607300001` | `companies`, `contacts`, `applicants` |
| `202607300002` | `users`, `case_types`, `case_statuses`, `cases`, `case_status_history`, `case_assignments` (+ unique partial index `case_assignments_one_active`), `timeline`; seeds 8 case types and 9 case statuses |
| `202607300003` | `applicants.company_id`, `cases.company_id` (both nullable, pending backfill) |
| `202607300004` | `case_number_sequences`; `cases.deleted_at`; indexes `idx_cases_active_created_at`, `idx_cases_applicant_id`, `idx_cases_case_type_id`, `idx_cases_current_status_id`; `timeline` column renames/additions (`title`, `description`, `created_by_id`, `entity_type`, `entity_id`, `metadata`) |
| `202607300005` | `cases.deleted_by` (FK to `users.id`) |

**Defect found and fixed during this step (no SQL change):** writing the first-ever real-database (not mocked) `TypeORM` connection for the Case module's integration tests surfaced that four entity properties — `Case.completedAt`, `Case.deletedAt`, `CaseAssignment.unassignedAt`, and `TimelineEvent.title` — were declared as `X | null` unions without an explicit `@Column({ type: ... })`. `reflect-metadata` collapses a union type's design-type to `Object`, so `TypeORM` couldn't map them and threw `DataTypeNotSupportedError` on `DataSource.initialize()`. This was invisible to every prior unit test because those mock the repository and never build a real `DataSource`. Fixed by adding explicit `type: 'timestamptz'` (the two `Date | null` columns and `unassignedAt`) and `type: 'varchar', length: 255` (`title`) to match the already-correct database columns — an ORM-mapping fix only, not a schema change.

## APIs

All endpoints are under the global `/api` prefix. Full request/response contracts are in `docs/10-Case-API-Spec.md` and the live Swagger UI (`GET /api/docs`).

**Cases** — `POST /cases`, `GET /cases` (search/filter/sort/paginate), `GET /cases/:id`, `PATCH /cases/:id`, `DELETE /cases/:id` (soft delete), `POST /cases/:id/transition`, `POST /cases/:id/assign`, `POST /cases/:id/unassign`.

**Case Types** — `GET /case-types`, `GET /case-types/:id`, `PATCH /case-types/:id`, `POST /case-types/:id/activate`, `POST /case-types/:id/deactivate`, `DELETE /case-types/:id` (409 if referenced by a case).

**Case Statuses** — the same six operations under `/case-statuses`.

## Tests

**Unit (mocked repositories), 56 tests across 7 suites** — `pnpm --dir apps/api test --runInBand`:
- `cases.service.spec.ts` (create/find/update/remove, including validation branches)
- `status-transition.service.spec.ts`, `assignment.service.spec.ts`
- `case-search.service.spec.ts` (every filter, join behavior, pagination, response shape)
- `case-types.service.spec.ts`, `case-statuses.service.spec.ts`
- `app.controller.spec.ts` (pre-existing)

**Integration (e2e, real PostgreSQL — not mocked), 7 tests across 2 new suites** — `pnpm --dir apps/api test:e2e` (requires `docker compose up -d postgres`, all 5 migrations applied, `DATABASE_URL` set; see README):
- `case-workflow.e2e-spec.ts` — one full workflow test: Create Case → Assign → Transition → Search (by `assignedUserId` + `caseNumber`) → Soft Delete → verify excluded from default search and visible with `includeDeleted=true` (with `deleted_by` recorded).
- `case-validation.e2e-spec.ts` — 6 tests: invalid UUID (400), invalid state-machine transition `DRAFT → COMPLETED` (400 `INVALID_STATUS_TRANSITION`), missing reason for `ON_HOLD` (400 `STATUS_REASON_REQUIRED`), creating a case with an inactive case type (404 `CASE_TYPE_NOT_FOUND`), transitioning to an inactive status (404 `STATUS_NOT_FOUND`), and acting on a soft-deleted case (404 `CASE_NOT_FOUND`).

**Verification run for this step:** `build` clean, `lint` clean, unit tests 56/56 passing, integration tests 7/7 passing (the case-module suites). See the summary block at the end of this report for the exact commands and output.

## Known Limitations

- No authentication, login, or RBAC. All actor ids (`createdById`, `changedById`, `assignedById`, `deletedById`) must be supplied explicitly by the caller.
- There is no API to create `users` rows (intentional — `users` is foundation-only per `docs/09-Case-Domain.md`); the e2e tests seed users directly via the app's own `DataSource`.
- No API sets `applicants.company_id` — it can only be written directly to the database. `cases.company_id` is copied from the applicant at case-creation time and is `null` if the applicant has none.
- Case type/status `Create` endpoints are not implemented (see the scope note in `docs/10-Case-API-Spec.md`); new rows come only from seed data.
- `GET /cases`'s `keyword` and `caseNumber` filters are `ILIKE` sequential scans — no supporting text index exists yet.
- Deactivating a case type/status does not retroactively affect cases already using it; activeness is only checked at creation/transition time.
- `apps/api/test/app.e2e-spec.ts` (Nest CLI's default scaffold test) fails independent of any Case module change — it expects a root `GET /` "Hello World!" route that doesn't exist; the app only exposes `GET /health` under `/api`. Pre-existing, out of WP004 scope.

## Remaining Work

- WP005 — Documents and StorageService (next, pending explicit approval to start)
- WP006 — Tasks
- WP007 — Dashboard
- WP008A/B — Storage Provider Framework / Storage Management UI
- Authentication and RBAC (referenced throughout WP004 as a hard prerequisite for production use)
- Case type/status Create endpoints, once a future work package defines the business rules
- An API to link an applicant to a company (currently DB-only)
- Optional: a supporting index if `keyword`/`caseNumber` search performance becomes a problem at real data volume
- Optional cleanup: fix or remove the stale `app.e2e-spec.ts` scaffold test (unrelated to Case module, noted here for visibility only)
