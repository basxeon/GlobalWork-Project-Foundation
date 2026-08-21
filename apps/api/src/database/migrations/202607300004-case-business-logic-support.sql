-- WP004 support schema. Existing migrations are intentionally not modified.
CREATE TABLE case_number_sequences (
  year integer PRIMARY KEY,
  last_value integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cases ADD COLUMN deleted_at timestamptz NULL;
CREATE INDEX idx_cases_active_created_at ON cases(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_cases_applicant_id ON cases(applicant_id);
CREATE INDEX idx_cases_case_type_id ON cases(case_type_id);
CREATE INDEX idx_cases_current_status_id ON cases(current_status_id);

ALTER TABLE timeline ADD COLUMN title varchar(255) NULL;
ALTER TABLE timeline ADD COLUMN description text NULL;
ALTER TABLE timeline RENAME COLUMN actor_id TO created_by_id;
ALTER TABLE timeline RENAME COLUMN subject_type TO entity_type;
ALTER TABLE timeline RENAME COLUMN subject_id TO entity_id;
ALTER TABLE timeline RENAME COLUMN payload TO metadata;

CREATE INDEX idx_timeline_case_id_created_at ON timeline(case_id, created_at DESC);
