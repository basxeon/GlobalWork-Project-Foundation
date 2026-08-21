# Working Set

## Current Objective

No active implementation objective. The Workspace Timezone Application work
package is complete and awaiting approval for the next work package.

The persisted `timeZone` setting now controls timestamp display, greeting,
due-date labels/filters, and Dashboard attention boundaries. Date-only database
values remain calendar dates and never shift when formatted.

## Files Currently Being Modified

- `CURRENT_STATE.md`
- `WORKING_SET.md`
- `README.md`
- `apps/api/src/database/migrations/202608050001-repair-mojibake-document-filenames.sql`
- `apps/api/src/documents/filename.ts`, `filename.spec.ts`, `documents.service.ts`, `documents.controller.ts`
- `apps/web/src/lib/format.ts`, `apps/web/src/lib/api.ts`
- `apps/web/src/app/components/` (`app-shell.tsx`, `app-shell.css`, `row-menu.tsx`, `sortable.tsx`, `projects/`)
- `apps/web/src/app/` (`app-pages.css`, `dashboard/`, `dashboard-attention.tsx`, `projects/`, `tasks/`, `documents/`, `contacts/`, `companies/`, `settings/`)
- `apps/api/src/dashboard/`
- `docs/13-UI-Design-System.md`

## Current Domain

- GlobalWork OS is a personal/home-use project tracker.
- Active backend modules are Projects, Contacts, Documents, Passport Extraction, Tasks, Storage, Authentication, and Users.
- Documents and Tasks use `/projects/:projectId/...` routes. Their `case_id` database column and the `cases/` document storage-key prefix are retained intentionally as legacy storage names.

## Constraints

- Controllers contain no business rules.
- Business logic belongs to services.
- Authentication is required for all preview and extraction endpoints.
- Documents are read only through `StorageService`; physical paths and OCR contents are never exposed in errors.
- This sprint uses only the local manual OCR fallback. It must never fabricate extraction output or send files outside the local network.
- Apply targets the Project's linked Contact. It never overwrites non-empty Contact passport fields without an explicit overwrite request.
- Do not use `docs/01`–`docs/12` or this file's previous Case-domain content as the active product specification.
- JWT authentication is implemented. Only the existing minimal `ADMIN`/`STAFF` user access model is available.
- Status is computed only when `GET /dashboard/attention` is requested. No background jobs, schedules, or notifications are permitted.
- Use the stored Contact passport expiry and existing Task/Project due dates only. Do not add visa or work-permit schema.
- Contact remains the only person record. Existing `given_names`, `surname`, passport, nationality, birth-date, sex, phone, and email columns must be reused.
- The approved new Company table is linked by nullable `projects.company_id`; no historical Company data is assumed to exist.

## Out of Scope

- No external OCR provider credentials are configured. The supported `manual` provider requires human review and entry.
- No calendar, email/LINE notifications, reports, scheduled workers, OCR provider integration, AI chat, or multi-tenant features.
- No government API, automatic submission, DOCX/PDF generation, accounting, billing, workflow engine, or generic form-builder framework.

## Pending Decisions

No pending product decision. No next work package has been approved.
`Asia/Bangkok` remains the only approved timezone setting value.

## Acceptance Criteria

- Timestamp dates render using the persisted workspace timezone.
- Date-only values such as due dates and passport expiry never shift a day.
- Today, overdue, due-soon, and greeting calculations use the workspace timezone.
- Dashboard attention API uses the same timezone day boundary as the frontend.
- Invalid timezone input falls back safely to `Asia/Bangkok` in presentation code.
- `/tasks` is a searchable/filterable global daily-work list with status actions, edit, soft delete, checklist progress, and Project navigation.
- `/documents` is a searchable/filterable global library with preview, download, metadata editing, soft delete, and Project navigation.
- `/settings` provides General, Profile, Security, Storage, and System sections with Admin-only operational details hidden and guarded.
- `/dashboard` owns dashboard and attention data only.
- `/projects` owns the searchable full-width Project collection and CRUD dialogs only.
- `/projects/:id` loads directly by route id and owns Overview, Tasks, Documents, and Form Data tabs.
- Root and post-login navigation resolve to `/dashboard`; the selected-Project side rail no longer exists.
- Major screens use the approved warm-neutral design tokens and surface hierarchy.
- Desktop and tablet layouts preserve all operational workflows without page-level horizontal overflow.

## AI Constraints

- Begin no new work package without explicit approval.
