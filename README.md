# GlobalWork OS

A personal/home-use project tracker (Projects, Contacts, Documents, Tasks). See `CURRENT_STATE.md` for the current domain — docs `01`–`12` in `docs/` describe an earlier visa-agency version of this project and are historical only.

## Services

- `apps/web`: Next.js frontend, exposed at `http://localhost:3000`.
- `apps/api`: NestJS API, exposed at `http://localhost:3001`.
- PostgreSQL 17 and Redis 7: supplied by Docker Compose.

The API permits local frontend origins on ports `3000` and `3001`. If the frontend starts on `3001` because `3000` is occupied, point `NEXT_PUBLIC_API_BASE_URL` to the running API port (for example, `http://localhost:3002`).

## Local development

```bash
pnpm install
pnpm dev:web
pnpm dev:api
```

Copy the example environment files before connecting the API to PostgreSQL or Redis:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

## Verification

```bash
pnpm --dir apps/api test --runInBand
pnpm --dir apps/api build
pnpm --dir apps/web lint
pnpm --dir apps/web build
docker compose config --quiet
```

The API health endpoint is `GET /api/health`. Interactive API documentation (Swagger UI) is served at `GET /api/docs` once the API is running.

## Login

Operational API routes require a Bearer access token. The frontend stores the token for the current browser session and sends it automatically.

Migration `202607300009-add-user-password-auth.sql` seeds the initial local Admin account:

- Email: `admin@homebase.local`
- Password: `Homebase2026!`

Set a unique `JWT_SECRET` in `apps/api/.env` before using the application beyond local development.

## Frontend routes

- `/dashboard` — attention summaries, recent Projects, and quick actions.
- `/projects` — searchable full-width Project list and Project CRUD.
- `/projects/:id` — direct-load Project Workspace with Overview, Tasks, Documents, and Form Data tabs.
- `/contacts`, `/companies`, `/users` — operational management pages.
- `/tasks` — global operational Task list with status/date/Project filters, create, edit, transition, completion, soft delete, and checklist progress.
- `/documents` — global active Document library with search/filter, preview, download, metadata edit, soft delete, and Project navigation.
- `/settings` — General, Profile, Security, and Admin-only Storage/System settings.

The root route and successful login redirect to `/dashboard`. Browser refresh and direct entry are supported for `/projects/:id`.

## Global Tasks, Documents, and Settings

The global Task page exposes only the daily-use `OPEN`, `IN_PROGRESS`, and `COMPLETED` states. Existing backend transition rules remain authoritative. Deleted Tasks are hidden.

Documents may use one category: `PASSPORT`, `VISA`, `WORK_PERMIT`, `PHOTO`, `CONTRACT`, `COMPANY_DOCUMENT`, `TM30`, or `OTHER`. The global library hides deleted records and preserves the existing Project Workspace preview/download flow. Passport expiry warnings are calculated from the confirmed extraction data when available.

General workspace settings are stored in `application_settings`. Any authenticated user may read them; only an Admin may update them. `dateFormat` controls the displayed order of date parts and `timeZone` controls timestamp dates, the Dashboard greeting, Task due filters, urgency labels, and Dashboard attention day boundaries. Date-only fields never shift through timezone conversion. The approved timezone is currently `Asia/Bangkok`. Profile and password changes apply to the signed-in user. Storage and System sections are Admin-only and show safe read-only operational data; Local Drive is the only provider and cannot be changed from the UI.

## User management

`ADMIN` users can open the Users page to create users, edit their name/email/role, activate or deactivate accounts, and set temporary passwords. The Users API is Admin-only; roles are limited to `ADMIN` and `STAFF`. Users are never physically deleted, and an Admin cannot deactivate their own account.

## PDF workspace and passport review

Select a project document to open the authenticated Document Workspace. PDF, PNG, JPEG, and WebP files preview inline; every supported file remains downloadable. Deleted documents are rejected by both preview and extraction routes.

Passport data is persisted in a document-scoped review record. With the default setting below, the app intentionally does not call an external OCR provider or fabricate fields: enter or correct the fields manually, save, confirm, and then apply the confirmed values to the Project's linked Contact. Applying is blocked when no linked Contact exists. If a non-empty Contact field differs, the API returns `CONTACT_FIELD_CONFLICT`; the UI requires a separate explicit overwrite action.

```dotenv
# apps/api/.env
PASSPORT_OCR_PROVIDER=manual
```

The manual provider keeps document bytes inside the configured `StorageService`. Do not configure an external provider without an approved privacy and data-processing decision. Current limitations: no automated OCR provider, no Applicant module in the post-pivot domain, and unsupported preview types are download-only.

## Attention dashboard

The `/dashboard` route includes a live **Need Attention** section backed by authenticated `GET /api/dashboard/attention`. It has no background job: statuses are calculated whenever the dashboard loads.

- Passport: `EXPIRED` before today, `URGENT` within 30 days, `UPCOMING` from 31 through 90 days, and `OK` afterwards.
- Task: a non-completed Task is `OVERDUE` before today or `DUE_SOON` from today through seven days; completed Tasks are `OK` regardless of their due date.

The response includes compact lists for expired/expiring passports, overdue/due-soon Tasks, and Projects that contain overdue Tasks. It uses only existing passport and Task due-date fields. The post-pivot data model has no visa or work-permit expiry fields, and this feature does not send notifications, create calendar events, or schedule background work.

## Form Data workspace

Open the **Form Data** tab in `/projects/:id` to review and save reusable Contact, passport, employment, and Company values. Required preparation fields are applicant first/last name, nationality, date of birth, passport number/expiry, position, and Company legal name, registration number, and registered address. Missing values are displayed but never block saving. Copy actions produce plain text only; this sprint does not generate or submit official forms.

### Integration (e2e) tests

`apps/api/test/app.e2e-spec.ts` (the default Nest CLI scaffold test) is a pre-existing failure — it asserts a root `GET /` "Hello World!" response, but the app only exposes `GET /health` under the global `/api` prefix. Not related to any module's functionality.

## Database migration

Apply every migration, in order, after PostgreSQL is running:

```bash
docker compose exec -T postgres psql -U globalwork -d globalwork \
  < apps/api/src/database/migrations/202607300001-create-company-and-applicant-tables.sql
docker compose exec -T postgres psql -U globalwork -d globalwork \
  < apps/api/src/database/migrations/202607300002-create-users-and-case-domain.sql
docker compose exec -T postgres psql -U globalwork -d globalwork \
  < apps/api/src/database/migrations/202607300003-add-company-to-applicants-and-cases.sql
docker compose exec -T postgres psql -U globalwork -d globalwork \
  < apps/api/src/database/migrations/202607300004-case-business-logic-support.sql
docker compose exec -T postgres psql -U globalwork -d globalwork \
  < apps/api/src/database/migrations/202607300005-add-deleted-by-to-cases.sql
docker compose exec -T postgres psql -U globalwork -d globalwork \
  < apps/api/src/database/migrations/202607300006-create-documents.sql
docker compose exec -T postgres psql -U globalwork -d globalwork \
  < apps/api/src/database/migrations/202607300007-create-tasks.sql
docker compose exec -T postgres psql -U globalwork -d globalwork \
  < apps/api/src/database/migrations/202607300008-pivot-to-personal-project-tracker.sql
docker compose exec -T postgres psql -U globalwork -d globalwork \
  < apps/api/src/database/migrations/202607300009-add-user-password-auth.sql
docker compose exec -T postgres psql -U globalwork -d globalwork \
  < apps/api/src/database/migrations/202607300010-add-passport-extractions.sql
docker compose exec -T postgres psql -U globalwork -d globalwork \
  < apps/api/src/database/migrations/202607300011-add-companies-and-form-data-fields.sql
docker compose exec -T postgres psql -U globalwork -d globalwork \
  < apps/api/src/database/migrations/202608030001-add-document-metadata-and-settings.sql
docker compose exec -T postgres psql -U globalwork -d globalwork \
  < apps/api/src/database/migrations/202608050001-repair-mojibake-document-filenames.sql
```
