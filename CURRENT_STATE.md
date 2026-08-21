# Current State

## Project Pivot (2026-07-30)

GlobalWork OS pivoted from an SME visa/work-permit agency system to a **personal/home-use project tracker**. This is a full domain change, not an incremental step. Everything below reflects the system *after* the pivot. Docs `01`–`12` in `docs/` describe the old visa-agency domain (Company, Applicant, Case state machine, case-type/status lookup) and are now historical — they no longer describe the live schema or API.

**What changed:**
- `cases` table renamed to `projects` in place; dropped `case_number`, `case_type_id`, `current_status_id`, `company_id`, `applicant_id`, `opened_at`; added `title`, `description`, `contact_id`, `due_date`, `status` (simple `TODO`/`DOING`/`DONE`/`CANCELLED`, no state machine, no transition rules).
- Removed entirely: Company module, Applicant module, case-type/case-status lookup API, `CaseStateMachine`, `CaseNumberService`, `StatusTransitionService`, `AssignmentService` (case-level), `CaseSearchService`, and their tables (`case_types`, `case_statuses`, `case_status_history`, `case_assignments`, `case_number_sequences`).
- Added: a single simplified `Contact` entity (name/email/phone/notes) replacing Company+Applicant+the old company-scoped Contact. A project may optionally reference one contact.
- **Documents and Tasks were left exactly as built in WP005/WP006** (versioning, Task's 5-state machine, Task assignment) per explicit instruction. Their parent-resource existence checks and routes use Projects; their legacy database column name `case_id` and document storage-key prefix `cases/` remain intentionally unchanged to avoid a data migration during the pivot. Routes use `/projects/:projectId/...`.
- Deleted the two Case-workflow e2e specs (`case-workflow.e2e-spec.ts`, `case-validation.e2e-spec.ts`) — they tested Company/Applicant/CaseType/CaseStatus flows that no longer exist.
- Migration: `202607300008-pivot-to-personal-project-tracker.sql`.

## Current Modules

- **Projects** (`apps/api/src/projects/`): simple CRUD — create, list, get, update (title/description/contactId/dueDate/status — status is a plain field, no transition rules), soft delete. Reuses `TimelineService` (now `recordProjectCreated` + the unchanged Task methods).
- **Contacts** (`apps/api/src/contacts/`): simple CRUD, soft delete, and passport-profile fields that can be populated only from a confirmed document extraction.
- **Documents** (`apps/api/src/documents/`): upload, version history, authenticated download/inline preview, soft delete, via a Local-Drive-only `StorageService`. Multer hands `file.originalname` over as latin1-decoded header bytes, so uploads pass it through `decodeUploadFilename` (`documents/filename.ts`) before persisting; download/preview send an RFC 6266 `Content-Disposition` with both an ASCII fallback and `filename*=UTF-8''`. Migration `202608050001` repairs the Thai filenames stored mojibake'd before this fix.
- **Passport extraction** (`apps/api/src/passport-extractions/`): document-scoped, persisted review records. The local `manual` provider never fabricates values or sends files externally; users correct fields, confirm them, then apply them to the Project's linked Contact. Non-empty differing Contact values require an explicit overwrite request.
- **Tasks** (`apps/api/src/tasks/`, unchanged behavior): create/update, 5-state transition (`OPEN`/`IN_PROGRESS`/`ON_HOLD`/`COMPLETED`/`CANCELLED`), assignment, soft delete, checklist items.
- **Global Task list**: authenticated `GET /tasks` returns active Tasks with Project context and checklist totals without N+1 queries. The daily-use UI intentionally exposes only `OPEN`, `IN_PROGRESS`, and `COMPLETED`.
- **Global Document library**: authenticated `GET /documents` returns active Documents with Project, uploader, current-version, passport-review, and derived expiry metadata. Display name and the approved document category are editable through `PATCH /documents/:id`.
- **Settings** (`apps/api/src/settings/`): persisted General settings, current-user Profile and password changes, plus Admin-only Local Drive status and safe system information. The storage check uses `StorageService`; provider switching is not available.
- **Dashboard** (`apps/api/src/dashboard/`): authenticated on-demand attention summary for stored passport expiry dates and active Task due dates. It uses two set-based queries and has no schedules, notifications, or background workers.
- **Form Data Workspace**: Project-scoped preparation view that consolidates its Contact, passport/employment fields, and nullable linked Company. It highlights missing values but never blocks saving.
- **Storage** (`apps/api/src/storage/`, unchanged): Local Drive provider only. NAS/S3/Azure/MinIO stay in Backlog.
- **Authentication and Users** (`apps/api/src/auth/`, `apps/api/src/users/`): email/password login with bcrypt hashes and eight-hour JWT access tokens. Inactive users are rejected. `ADMIN` can manage users; `STAFF` can use operational features only.
- **Frontend** (`apps/web/`): the project tracker dashboard supports project and contact create/edit/soft-delete flows, project-linked contacts, task create/edit/transition/delete, task checklist management, and document upload/download/soft-delete. A warm-neutral SaaS design system now governs every major screen through shared tokens: `#F5F5F4` for the application canvas, `#FAFAF9` for document/workspace areas, and `#FFFFFF` for elevated interactive surfaces. The app shell, dashboard, Projects, Contacts, Companies, Tasks/checklist, Documents/passport review, Form Data, login, and Users use the same typography, spacing, form, table, dialog, feedback, and responsive rules.
- **Daily-use review pass (2026-08-05)**: the workspace General settings are now consumed by the UI instead of being write-only — `applicationName` names the shell and `dateFormat` renders every stored date through the shared `apps/web/src/lib/format.ts` helpers, so no screen prints a raw ISO or `toLocaleDateString()` value. Projects gained a Due column; Projects, Tasks, Documents, Contacts, and Companies gained sortable headers, a result count, and their own horizontal table scroll. Due dates carry an urgency tone plus a plain-language note ("1 day overdue", "Due today"). Row actions moved into a shared overflow menu (`components/row-menu.tsx`) so no destructive action sits permanently in a row. Dashboard shows one set of numbers instead of two, renders only attention groups that have items, and its Quick Actions no longer repeat the header button or the sidebar.
- **Workspace timezone pass (2026-08-18)**: `application_settings.time_zone` now drives timestamp display, Dashboard greeting, Task date filters, due/overdue labels, passport expiry, Project attention, and the Dashboard API's current-day boundary. Date-only fields remain calendar dates and never shift through timezone conversion. Invalid presentation values fall back safely to `Asia/Bangkok`; the only approved setting value remains `Asia/Bangkok`.
- **Operational global pages**: Companies, Tasks, Documents, and Settings are API-backed daily-use pages. Tasks supports filtering and actions, Documents supports library search/preview/download/metadata management, and Settings separates General, Profile, Security, Storage, and System sections.
- **Frontend routing**: Dashboard (`/dashboard`), Projects list (`/projects`), and Project Workspace (`/projects/:id`) have physically separate component trees and state ownership. The legacy selected-Project right rail and all-in-one root page are removed. Project Tasks, Documents, passport review, and Form Data render as full-width workspace tabs, and direct Project URLs reload independently.

## Database Tables

`users` (including `password_hash`), `contacts` (including passport and employment fields), `companies`, `projects` (including `company_id`), `documents` (including `display_name` and `category`), `document_versions`, `passport_extractions`, `tasks`, `task_checklist_items`, `timeline`, `application_settings`.

## API

- `/auth/login`, `/auth/me`, `/auth/profile`, `/auth/change-password` — login, current-user lookup, self-service profile, and password change.
- `/users` — Admin-only list, create, update, activate/deactivate, and temporary-password reset.
- `/projects`, `/projects/:id` — CRUD, soft delete (authenticated).
- `/contacts`, `/contacts/:id` — CRUD, soft delete.
- `/projects/:projectId/documents`, `/documents/:id`, `/documents/:id/versions`, `/documents/:id/download`, `/documents/:id/preview` — upload, list, version history, authenticated download/inline preview, soft delete.
- `GET /documents`, `PATCH /documents/:id` — global active Document library and display-name/category update.
- `/documents/:id/passport-extraction` — run the configured extraction attempt, get/save reviewed data, confirm it, and apply confirmed data to the Project's linked Contact.
- `/dashboard/attention` — current compact summary plus passport and Task attention lists (authenticated).
- `/projects/:id/form-data`, `/companies` — consolidated preparation data plus Company create/list/update endpoints.
- `/projects/:projectId/tasks`, `/tasks/:id`, `/tasks/:id/transition`, `/tasks/:id/assign`, `/tasks/:id/checklist-items` — CRUD, status transition, assignment, checklist.
- `GET /tasks` — global active Task list with Project and checklist progress.
- `/settings/general`, `/settings/storage-status`, `/settings/system-info` — General settings plus Admin-only operational status.
- Swagger at `GET /api/docs`.

## Known Limitations / Backlog

- The existing audit-trail request fields (`createdById`, `deletedById`, and similar) remain in place. The frontend supplies the logged-in user ID; server-side replacement of those legacy fields is deferred.
- Multi-provider storage and provider switching (NAS/S3/Azure/MinIO) remain Backlog. Settings reports the configured Local Drive only.
- No email invitations, password-reset email, MFA, OAuth, or user deletion.
- Passport extraction currently supports the configured `manual` fallback only. It is an assisted review workflow, not automated OCR; no external OCR provider credentials are configured.
- Preview and manual passport review accept PDF, PNG, JPEG, and WebP. Other document types remain downloadable but cannot be previewed or used for extraction.
- A document can be applied only when its Project is linked to exactly one active Contact. The current data model has no Applicant module after the project-tracker pivot.
- Task UI intentionally exposes only `OPEN`, `IN_PROGRESS`, and `COMPLETED`; it does not expose the legacy `ON_HOLD` or `CANCELLED` task states.
- Recent Projects and Contacts are a browser-session convenience only; no user activity history is persisted.
- Attention rules are evaluated only when the dashboard loads: passports are expired before today, urgent through 30 days, and upcoming through 90 days; non-completed Tasks are overdue before today or due soon through 7 days. No visa/work-permit expiry data exists in the current post-pivot schema.
- `docs/01`–`docs/12` describe the pre-pivot visa-agency domain and are historical, not current — do not treat them as the API's source of truth going forward.
- The UI is English-only. The passport `Sex` field and several Form Data date fields are still free-text inputs rather than a select or date picker.
- The Documents PDF preview embeds the browser's own viewer in an iframe; the toolbar's zoom and fit controls apply a CSS scale to that frame, and Previous/Next step between documents, not pages.

## Development Policy

Current WP: GlobalWork OS — Workspace Timezone Application
Status: COMPLETE — verified on 2026-08-18 (79 API unit tests, deterministic timezone checks, web typecheck, lint, and production build all green)

Previous WP: GlobalWork OS — Daily-Use UI Review Fixes
Status: COMPLETE — verified on 2026-08-05

Only one Work Package may be active at a time. The implementation MUST NOT proceed to the next Work Package without explicit approval.
