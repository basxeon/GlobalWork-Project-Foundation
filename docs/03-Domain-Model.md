# Domain Model

## Core entities

| Entity | Purpose | Key relationships |
| --- | --- | --- |
| User | Authenticated staff member | owns cases; is assigned tasks |
| Company | Customer organisation | has contacts and cases |
| Contact | Person representing a company | belongs to a company |
| Applicant | Individual whose visa/work permit is processed | has cases and documents |
| Case | Operational unit of work | belongs to a company and applicant; has documents, tasks, and timeline events |
| Document | Uploaded case file and its metadata | belongs to a case; has versions; uses a storage profile |
| Task | Work item within a case | belongs to a case; has an assignee |
| Timeline Event | Immutable activity record | belongs to a case; may reference a user and entity |
| Storage Profile | Configured file-storage destination | stores documents through a provider |

## Confirmed modelling constraints

- Business modules must use `StorageService`; they must not access the filesystem directly.
- Storage paths must not be hard-coded.
- A storage profile has a provider type, connection/root-path settings, enabled status, and default status.
- Documents require version history.
- An applicant can have multiple cases; each case belongs to exactly one applicant.
- A case has multiple documents, tasks, and timeline events.
- MVP case types are Visa Application, Visa Extension, Work Permit, Work Permit Renewal, 90-Day Report, Re-Entry Permit, Passport Renewal Support, and Other.

## Relationships requiring confirmation

- A case appears to have one primary applicant in the mockup; support for multiple applicants is not specified.
- The required relationship between a case and a company is not explicitly defined.
- A task checklist is shown in the mockup, but its completion semantics are not specified.
