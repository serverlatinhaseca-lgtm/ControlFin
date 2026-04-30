BEGIN;

CREATE TABLE IF NOT EXISTS uploaded_files (
  id serial PRIMARY KEY,
  original_name text,
  filename text,
  mime_type text,
  size_bytes integer,
  public_url text,
  uploaded_by integer REFERENCES users(id),
  created_at timestamp DEFAULT now()
);

INSERT INTO app_settings (key, value, is_secret)
VALUES
  ('site_name', 'ControlFin', false),
  ('site_logo_url', '', false),
  ('site_favicon_url', '', false),
  ('default_light_theme', 'brown', false)
ON CONFLICT (key) DO NOTHING;

COMMIT;
