CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name_th varchar(255) NULL,
  legal_name_en varchar(255) NULL,
  registration_number varchar(64) NULL,
  tax_id varchar(64) NULL,
  registered_address text NULL,
  workplace_address text NULL,
  phone varchar(50) NULL,
  authorized_director varchar(255) NULL,
  business_type varchar(255) NULL,
  deleted_at timestamptz NULL,
  deleted_by uuid NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects
  ADD COLUMN company_id uuid NULL REFERENCES companies(id);
CREATE INDEX idx_projects_company_id ON projects(company_id);

ALTER TABLE contacts
  ADD COLUMN title varchar(64) NULL,
  ADD COLUMN middle_name varchar(255) NULL,
  ADD COLUMN address_in_thailand text NULL,
  ADD COLUMN position varchar(255) NULL,
  ADD COLUMN monthly_salary numeric(12,2) NULL,
  ADD COLUMN employment_start_date date NULL;
