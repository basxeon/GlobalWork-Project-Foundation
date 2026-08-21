# Delivery Roadmap

## Phase 0 — Planning

Complete and approve the documents in `docs/`. Resolve all decisions marked as requiring confirmation. No application code should be started until the core workflow, roles, case statuses, and initial storage choice are approved.

## Phase 1 — MVP

Suggested implementation order:

1. WP001 Foundation: repository, Docker Compose, authentication, database migrations, test harness.
2. WP002–WP003: company/contact and applicant records.
3. WP004: cases, search, assignment, statuses, timeline.
4. WP008A: storage provider framework, beginning with the approved initial provider.
5. WP005: document upload, PDF preview, version history.
6. WP006: tasks, due dates, priorities, checklist.
7. WP007: dashboard.
8. WP008B: storage settings, profiles, connection test, default provider.

The Foundation document assigns four weeks to the MVP, but I cannot verify that this is achievable until scope, team capacity, integrations, and acceptance criteria are confirmed.

## Later phases

- Phase 2: OCR and assisted passport-field extraction with staff review before persistence.
- Phase 3: notifications, calendar, and expanded activity history.
- Post-adoption: customer portal, workflow engine, multi-company support, billing, analytics, AI copilot, multi-tenant SaaS.

## Acceptance gate for each work package

Business requirement, database migration, REST API, frontend UI matching an approved mockup, unit tests, manual test evidence, and documentation.
