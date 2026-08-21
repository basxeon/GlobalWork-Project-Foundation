-- WP004.1 soft-delete audit: record which user deleted a case.
ALTER TABLE cases ADD COLUMN deleted_by uuid NULL REFERENCES users(id);
