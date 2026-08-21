-- Safe expansion migration: no existing applicant-to-company mapping is available
-- in this repository, so this migration intentionally does not invent backfill data.
ALTER TABLE applicants ADD COLUMN company_id uuid NULL REFERENCES companies(id);
CREATE INDEX idx_applicants_company_id ON applicants(company_id);

ALTER TABLE cases ADD COLUMN company_id uuid NULL REFERENCES companies(id);
CREATE INDEX idx_cases_company_id ON cases(company_id);

-- Before enabling Case creation in a production database, populate both columns
-- from verified business data, validate applicant.company_id = cases.company_id,
-- then apply a separate migration to make both columns NOT NULL.
