ALTER TABLE users ADD COLUMN password_hash varchar(255) NULL;

INSERT INTO users (name, email, role, active, password_hash)
VALUES (
  'Homebase Admin',
  'admin@homebase.local',
  'ADMIN',
  true,
  '$2b$12$DSk3Y091NwYZ8ZVD4tTC2udBqXdQhYC82ipXNa3b7i71E69XR7x9W'
)
ON CONFLICT (email) DO NOTHING;
