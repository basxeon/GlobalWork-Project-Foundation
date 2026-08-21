-- Repair document filenames that were stored mojibake'd.
--
-- Multer exposes `file.originalname` as the raw multipart header bytes decoded
-- as latin1, so every UTF-8 filename uploaded before the API fix was persisted
-- as its latin1 misreading. Re-encoding those code points back to bytes and
-- decoding them as UTF-8 restores the original name.
--
-- Both guards below are required and must stay together:
--   * [\u00c2-\u00f4] followed by [\u0080-\u00bf] is a UTF-8 lead byte followed by a
--     continuation byte read as latin1 -- the mojibake signature;
--   * the value must hold nothing outside latin1, otherwise convert_to()
--     raises and a correctly stored name could be corrupted.
-- A filename that is already correct matches neither and is left untouched.
-- The migration is idempotent: repaired rows no longer match the predicate.

BEGIN;

UPDATE documents
SET original_filename =
      convert_from(convert_to(original_filename, 'LATIN1'), 'UTF8')
WHERE original_filename ~ '[\u00c2-\u00f4][\u0080-\u00bf]'
  AND original_filename !~ '[^\u0000-\u00ff]';

UPDATE documents
SET display_name = convert_from(convert_to(display_name, 'LATIN1'), 'UTF8')
WHERE display_name IS NOT NULL
  AND display_name ~ '[\u00c2-\u00f4][\u0080-\u00bf]'
  AND display_name !~ '[^\u0000-\u00ff]';

UPDATE document_versions
SET original_filename =
      convert_from(convert_to(original_filename, 'LATIN1'), 'UTF8')
WHERE original_filename ~ '[\u00c2-\u00f4][\u0080-\u00bf]'
  AND original_filename !~ '[^\u0000-\u00ff]';

COMMIT;
