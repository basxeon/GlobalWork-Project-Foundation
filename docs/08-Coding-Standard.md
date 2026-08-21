# Coding Standards

## Architecture

- Frontend: Next.js, Tailwind CSS, and shadcn/ui.
- Backend: NestJS and PostgreSQL.
- Deployment: Docker Compose; Redis is shown in the recommended deployment.
- Keep domain logic independent of a concrete storage provider.

## Storage rules

- Business modules must use `StorageService` only.
- Never hard-code storage paths.
- Drivers expose: `upload`, `download`, `delete`, `move`, `copy`, `exists`, `createDirectory`, and `getMetadata`.
- Do not access the filesystem directly from business modules.

## Quality rules

- Implement one work package at a time.
- Add unit tests for domain logic and storage drivers.
- Use database migrations for schema changes.
- Validate API input and authorize every protected action.
- Record relevant case changes in timeline events.
- Update documentation and the approved UI mockup before changing intended behaviour or layout.

## Security rules requiring detailed design

Authentication is required, but password policy, session/token strategy, role model, audit retention, encryption, backups, and privacy compliance requirements have not been provided. These must be defined before production deployment.
