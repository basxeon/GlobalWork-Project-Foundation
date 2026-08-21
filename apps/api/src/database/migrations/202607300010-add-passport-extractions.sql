ALTER TABLE contacts
  ADD COLUMN surname varchar(255) NULL,
  ADD COLUMN given_names varchar(255) NULL,
  ADD COLUMN passport_number varchar(64) NULL,
  ADD COLUMN nationality varchar(128) NULL,
  ADD COLUMN date_of_birth date NULL,
  ADD COLUMN sex varchar(16) NULL,
  ADD COLUMN date_of_issue date NULL,
  ADD COLUMN date_of_expiry date NULL,
  ADD COLUMN issuing_country varchar(128) NULL;

CREATE TABLE passport_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL UNIQUE REFERENCES documents(id),
  status varchar(32) NOT NULL DEFAULT 'PENDING',
  surname varchar(255) NULL,
  given_names varchar(255) NULL,
  passport_number varchar(64) NULL,
  nationality varchar(128) NULL,
  date_of_birth date NULL,
  sex varchar(16) NULL,
  date_of_issue date NULL,
  date_of_expiry date NULL,
  issuing_country varchar(128) NULL,
  raw_text text NULL,
  confidence numeric(5,4) NULL,
  error_message varchar(500) NULL,
  extracted_at timestamptz NULL,
  confirmed_at timestamptz NULL,
  confirmed_by uuid NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_passport_extractions_status ON passport_extractions(status);
