# Database Design

## Initial PostgreSQL tables

| Table | Required fields for initial design |
| --- | --- |
| users | id, name, email, password_hash, role, active, created_at, updated_at |
| companies | id, name, address, created_at, updated_at |
| contacts | id, company_id, name, email, phone, created_at, updated_at |
| applicants | id, company_id, given_name, surname, nationality, date_of_birth, passport_number, passport_expiry_date, created_at, updated_at |
| cases | id, case_number, company_id, applicant_id, case_type_id, current_status_id, created_by_id, opened_at, created_at, updated_at, completed_at |
| documents | id, case_id, storage_profile_id, original_filename, media_type, storage_key, status, current_version, uploaded_by_id, created_at |
| document_versions | id, document_id, version_number, storage_key, size_bytes, checksum, uploaded_by_id, created_at |
| tasks | id, case_id, title, description, assignee_id, due_date, priority, status, completed_at, created_at, updated_at |
| task_checklist_items | id, task_id, label, completed, completed_at |
| timeline | id, case_id, created_by, event_type, entity_type, entity_id, title, description, metadata, created_at |
| storage_profiles | id, name, provider_type, host, port, username, root_path, enabled, is_default, created_at, updated_at |

## Notes

- Store document binary data outside PostgreSQL. Store only metadata and a provider-neutral `storage_key` in the database.
- Encrypt or otherwise protect credentials stored for external storage profiles. The concrete secret-management mechanism is not yet specified.
- Passport fields are personal data; authorization, audit, retention, and encryption requirements must be confirmed before production use.
- Timeline is append-only. Records are created only through `TimelineService` and are never updated or deleted.

## Open schema decisions

- Accepted case types, statuses, priorities, and document statuses.
- Applicants belong to exactly one company; a Case stores `company_id` explicitly and it must match the applicant's company.
- Whether documents can be shared across cases.
- Soft-delete and retention requirements.
