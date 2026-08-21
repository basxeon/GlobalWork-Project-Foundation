# Case API Spec

**Status:** WP004 complete. Case CRUD core, status transition, assignment, case-type/case-status lookup, and case search endpoints are implemented (see `WORKING_SET.md`).

All routes are under the global `/api` prefix (e.g. `POST /api/cases`). Authentication is not implemented; `createdById` must be supplied explicitly by the caller until WP001 authentication lands.

Every endpoint below is documented in the live Swagger UI at `GET /api/docs` (request/response schemas with examples, and the error responses listed per endpoint) — this document is the narrative version of the same contract.

## `POST /cases`

Creates a case in `Draft` status.

Request body (`CreateCaseDto`):

| Field | Type | Rule |
| --- | --- | --- |
| applicantId | uuid | Required; must reference an existing applicant |
| caseTypeId | uuid | Required; must reference an active `case_types` row |
| createdById | uuid | Required; must reference an active `users` row |
| openedAt | ISO date string | Optional; defaults to now |

Behavior, in one transaction:

1. Looks up the applicant, case type, creating user, and the seeded `DRAFT` status; 404s if any is missing (`APPLICANT_NOT_FOUND`, `CASE_TYPE_NOT_FOUND`, `USER_NOT_FOUND`), 400s if the `DRAFT` seed row itself is missing (`DRAFT_STATUS_NOT_SEEDED`).
2. Generates the next `GW-YYYY-#####` case number via `CaseNumberService`.
3. Inserts the case with `companyId` copied from the applicant (`null` if the applicant has none yet).
4. Inserts one `case_status_history` row (`fromStatusId: null` → `DRAFT`).
5. Records a `CASE_CREATED` timeline event.

Returns the created case.

**Initial status assignment note:** the `current_status_id` write in step 3 is part of this Create Case transaction and is not handled by `StatusTransitionService`. All subsequent status changes must use `StatusTransitionService`.

## `GET /cases`

Wraps `CaseSearchService` (a dedicated service — search logic does not live in `CasesService`). Query parameters (`SearchCasesDto`), all optional:

| Field | Type | Filters on |
| --- | --- | --- |
| companyId | uuid | `cases.company_id` exact match |
| applicantId | uuid | `cases.applicant_id` exact match |
| caseTypeId | uuid | `cases.case_type_id` exact match |
| statusId | uuid | `cases.current_status_id` exact match |
| assignedUserId | uuid | the case's currently *active* assignment (`case_assignments.user_id` where `unassigned_at IS NULL`) |
| caseNumber | string | `cases.case_number ILIKE 'value%'` (prefix match) |
| keyword | string | `cases.case_number`, `applicants.given_name`, `applicants.surname`, or `companies.name` — any `ILIKE '%value%'` |
| createdFrom / createdTo | ISO date string | `cases.created_at` range (inclusive) |
| updatedFrom / updatedTo | ISO date string | `cases.updated_at` range (inclusive) |
| includeDeleted | boolean | default `false` — excludes soft-deleted cases; `true` includes them |
| page | integer | default `1`, min `1` |
| pageSize | integer | default `20`, min `1`, max `100` |
| sortBy | `createdAt` \| `updatedAt` \| `caseNumber` \| `openedAt` | default `createdAt` |
| sortDirection | `ASC` \| `DESC` | default `DESC` |

Returns `{ data, total, page, pageSize, totalPages }`.

**Query shape:** one `TypeORM` `QueryBuilder` chain per call — a single main query plus TypeORM's paired `COUNT` query via `getManyAndCount()` (not N+1; no per-row follow-up queries are issued for any filter, including the `assignedUserId` join).

**Index usage:** the `companyId`, `applicantId`, `caseTypeId`, and `statusId` exact-match filters use the existing indexes `idx_cases_company_id`, `idx_cases_applicant_id`, `idx_cases_case_type_id`, and `idx_cases_current_status_id` (migrations `202607300003`/`202607300004`). The default (`includeDeleted=false`, unfiltered, `sortBy=createdAt DESC`) case can use the partial index `idx_cases_active_created_at`. The `assignedUserId` join relies on the unique partial index `case_assignments_one_active` to guarantee at most one active assignment row per case (so the join cannot duplicate result rows). No new indexes were added for this step — `caseNumber` and `keyword` `ILIKE` matching against `applicants`/`companies` text columns has no supporting index and will be a sequential scan; this is a known limitation, not an oversight.

## `GET /cases/:id`

Returns one case. 404s (`CASE_NOT_FOUND`) if missing or soft-deleted.

## `PATCH /cases/:id`

Request body (`UpdateCaseDto`):

| Field | Type | Rule |
| --- | --- | --- |
| caseTypeId | uuid | Optional; must reference an active `case_types` row |
| openedAt | ISO date string | Optional |

These are the only two fields editable through this endpoint. Applicant, company, status, and assignee are intentionally not editable here: status changes must go through `POST /cases/:id/transition` to preserve the audit trail (`case_status_history` + timeline), and assignment changes must go through `POST /cases/:id/assign` / `POST /cases/:id/unassign` for the same reason.

## `DELETE /cases/:id`

Request body (`RemoveCaseDto`):

| Field | Type | Rule |
| --- | --- | --- |
| deletedById | uuid | Required; must reference an active `users` row |

Soft-deletes by setting `deleted_at` and `deleted_by`. Returns `204 No Content`. Does not remove history, assignments, or timeline rows.

## `POST /cases/:id/transition`

Wraps `StatusTransitionService`. Request body (`TransitionCaseDto`):

| Field | Type | Rule |
| --- | --- | --- |
| targetStatusCode | string | Required; must be an active `case_statuses.code` |
| reason | string | Optional; required (non-blank) when the target status is `ON_HOLD`, `CANCELLED`, or `REJECTED` (`STATUS_REASON_REQUIRED` otherwise) |
| changedById | uuid | Required actor |

In one transaction: validates the case exists and is not soft-deleted (`CASE_NOT_FOUND`), validates the target status exists and is active (`STATUS_NOT_FOUND`), checks the reason requirement, checks the transition is legal via `CaseStateMachine` (`INVALID_STATUS_TRANSITION` otherwise), updates `cases.current_status_id` (and `completed_at` when the target is `COMPLETED`), inserts one `case_status_history` row, and records a `STATUS_CHANGED` timeline event. Returns the updated case.

## `POST /cases/:id/assign`

Wraps `AssignmentService`. Request body (`AssignCaseDto`):

| Field | Type | Rule |
| --- | --- | --- |
| userId | uuid | Required; must reference an active `users` row |
| assignedById | uuid | Required actor |

In one transaction: validates the case (`CASE_NOT_FOUND`) and the assignee (`USER_NOT_FOUND`), closes any existing active assignment (`unassigned_at`), creates the new active `case_assignments` row, and records an `ASSIGNMENT_CHANGED` timeline event. Returns the created assignment.

## `POST /cases/:id/unassign`

Wraps `AssignmentService`. Request body (`UnassignCaseDto`): `changedById` (uuid, required actor).

Closes the active assignment (`unassigned_at`) and records an `ASSIGNMENT_CHANGED` timeline event. 404s (`ACTIVE_ASSIGNMENT_NOT_FOUND`) if the case has no active assignment. Returns `204 No Content`.

## Case Type / Case Status Lookup API

**Scope note:** `WORKING_SET.md`'s Acceptance Criteria names this "Case type/status CRUD," but `docs/09-Case-Domain.md`'s business rule 11 ("seed rows may be deactivated but must not be deleted while referenced by a case") only concretely specifies Read, Update, Activate/Deactivate, and guarded Delete — it does not describe a Create business rule for new case types/statuses via API. Per an explicit scoping decision for WP004.3, **Create is intentionally not implemented**. New case types and case statuses continue to come from seed data (migration `202607300002`) until a future work package defines the business rules for creating them. Create can be added later without breaking compatibility with the endpoints below.

Both resources (`case-types`, `case-statuses`) expose the same shape.

### `GET /case-types`, `GET /case-statuses`

Returns all rows (active and inactive), ordered by `sort_order` ascending.

### `GET /case-types/:id`, `GET /case-statuses/:id`

Returns one row. 404s (`CASE_TYPE_NOT_FOUND` / `CASE_STATUS_NOT_FOUND`) if missing.

### `PATCH /case-types/:id`, `PATCH /case-statuses/:id`

Request body (`UpdateCaseTypeDto` / `UpdateCaseStatusDto`):

| Field | Type | Rule |
| --- | --- | --- |
| name | string | Optional |
| sortOrder | integer | Optional |

`code` (the stable machine identifier read by `CaseStateMachine` and `StatusTransitionService`) and, for statuses, `category` are intentionally not editable through this endpoint — `code` must stay stable, and `category` is not consulted by the transition logic (which is hardcoded on `code`), so making it editable would risk display data drifting from actual behavior with no compensating enforcement.

### `POST /case-types/:id/activate`, `POST /case-statuses/:id/activate`

Sets `active = true`. Returns the updated row.

### `POST /case-types/:id/deactivate`, `POST /case-statuses/:id/deactivate`

Sets `active = false`. Returns the updated row. (Deactivating a status or type currently in use by an open case is not blocked — the seed rows remain selectable by ID for cases created before deactivation; only new selection would need an active row, which is not yet enforced anywhere since `case_type_id`/`current_status_id` are captured as fixed FK ids, not re-validated for activeness after creation.)

### `DELETE /case-types/:id`, `DELETE /case-statuses/:id`

Hard-deletes the row. Blocked with `409 Conflict` (`CASE_TYPE_IN_USE` / `CASE_STATUS_IN_USE`) if any row in `cases` references it (`case_type_id` for types, `current_status_id` for statuses). This guard checks only the `cases` table's current foreign keys, not historical `case_status_history` rows. 404s (`CASE_TYPE_NOT_FOUND` / `CASE_STATUS_NOT_FOUND`) if the row doesn't exist.

## Not yet implemented

- Create endpoints for case types / case statuses (deferred pending a future work package's business rules)
