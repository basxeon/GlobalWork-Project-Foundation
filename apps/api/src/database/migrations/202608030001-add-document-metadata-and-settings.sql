ALTER TABLE documents
  ADD COLUMN display_name VARCHAR(255),
  ADD COLUMN category VARCHAR(32) NOT NULL DEFAULT 'OTHER';

UPDATE documents SET display_name = original_filename WHERE display_name IS NULL;

ALTER TABLE documents ALTER COLUMN display_name SET NOT NULL;

ALTER TABLE documents ADD CONSTRAINT chk_documents_category CHECK (
  category IN ('PASSPORT', 'VISA', 'WORK_PERMIT', 'PHOTO', 'CONTRACT', 'COMPANY_DOCUMENT', 'TM30', 'OTHER')
);

CREATE INDEX idx_documents_category ON documents(category) WHERE deleted_at IS NULL;

CREATE TABLE application_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_name VARCHAR(120) NOT NULL DEFAULT 'GlobalWork OS',
  company_display_name VARCHAR(160),
  time_zone VARCHAR(64) NOT NULL DEFAULT 'Asia/Bangkok',
  date_format VARCHAR(24) NOT NULL DEFAULT 'DD/MM/YYYY',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO application_settings (application_name, time_zone, date_format)
VALUES ('GlobalWork OS', 'Asia/Bangkok', 'DD/MM/YYYY');
