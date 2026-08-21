-- Pivot: GlobalWork OS -> personal/home project tracker.
-- Drops the visa-agency-specific tables/columns; documents/tasks/timeline keep
-- their existing case_id column, now pointing at the renamed projects table.

DROP TABLE IF EXISTS case_assignments;
DROP TABLE IF EXISTS case_status_history;
DROP TABLE IF EXISTS case_number_sequences;

ALTER TABLE cases RENAME TO projects;
ALTER TABLE projects DROP COLUMN case_number;
ALTER TABLE projects DROP COLUMN case_type_id;
ALTER TABLE projects DROP COLUMN current_status_id;
ALTER TABLE projects DROP COLUMN company_id;
ALTER TABLE projects DROP COLUMN applicant_id;
ALTER TABLE projects DROP COLUMN opened_at;

ALTER TABLE projects ADD COLUMN title varchar(255);
UPDATE projects SET title = 'Untitled Project' WHERE title IS NULL;
ALTER TABLE projects ALTER COLUMN title SET NOT NULL;
ALTER TABLE projects ADD COLUMN description text NULL;
ALTER TABLE projects ADD COLUMN due_date date NULL;
ALTER TABLE projects ADD COLUMN contact_id uuid NULL;
ALTER TABLE projects ADD COLUMN status varchar(16) NOT NULL DEFAULT 'TODO';

DROP TABLE IF EXISTS case_types;
DROP TABLE IF EXISTS case_statuses;

DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS applicants;
DROP TABLE IF EXISTS companies;

CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  email varchar(255) NULL,
  phone varchar(50) NULL,
  notes text NULL,
  deleted_at timestamptz NULL,
  deleted_by uuid NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ADD CONSTRAINT projects_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES contacts(id);

CREATE INDEX idx_projects_status ON projects(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_contact_id ON projects(contact_id);
