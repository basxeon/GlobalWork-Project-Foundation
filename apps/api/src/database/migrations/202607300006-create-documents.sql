CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id),
  original_filename varchar(255) NOT NULL,
  media_type varchar(127) NOT NULL,
  storage_key varchar(500) NOT NULL,
  current_version integer NOT NULL DEFAULT 1,
  uploaded_by_id uuid NOT NULL REFERENCES users(id),
  deleted_at timestamptz NULL,
  deleted_by uuid NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_case_id ON documents(case_id) WHERE deleted_at IS NULL;

CREATE TABLE document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id),
  version_number integer NOT NULL,
  storage_key varchar(500) NOT NULL,
  size_bytes integer NOT NULL,
  checksum varchar(128) NOT NULL,
  original_filename varchar(255) NOT NULL,
  uploaded_by_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, version_number)
);
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
