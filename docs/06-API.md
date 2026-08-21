# REST API Outline

Authentication and authorization are not implemented yet. The listed business routes must be protected when WP001 authentication is completed.

All application routes use the `/api` prefix.

## Foundation

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

## Core resources

- `/api/companies` and `/api/companies/:id/contacts` — CRUD
- `/api/applicants` — CRUD
- `/cases` — create, list/search, retrieve, update status and assignee
- `/cases/:id/timeline` — list events
- `/cases/:id/documents` — list/upload
- `/documents/:id`, `/documents/:id/versions` — metadata, version history, download/preview access
- `/cases/:id/tasks` and `/tasks/:id` — create, list, update, complete
- `/dashboard` — current user's work summary

## Storage management

- `/settings/storage-profiles` — CRUD
- `POST /settings/storage-profiles/:id/test-connection`
- `POST /settings/storage-profiles/:id/make-default`

## API rules

- Validate input and use consistent error responses.
- Record changes to case-related entities in the timeline.
- Never expose storage credentials or internal storage paths in client responses.
- Enforce authorization in the backend, not only in the frontend.
