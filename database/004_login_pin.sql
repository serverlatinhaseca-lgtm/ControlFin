ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pin_hash text;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pin_set boolean DEFAULT true;

UPDATE users
SET pin_hash = '$2b$10$jwz4wDfaAt8AZmx9ehwPQesc2PwD.vqBFupEcRh/joD4g7sa/YPlO',
    pin_set = true,
    updated_at = now()
WHERE pin_hash IS NULL;

UPDATE users
SET pin_set = true,
    updated_at = now()
WHERE pin_set IS NULL;

INSERT INTO app_settings (key, value, is_secret, created_at, updated_at)
VALUES
  ('general_login_user', 'controlfin', false, now(), now()),
  ('general_login_password_hash', '$2b$10$g/hJRCT59Qo5SMKL8i3ApuAN8D5STnvtJ4z3/Z1/YgOWBZAhkllmG', true, now(), now()),
  ('admin_login_user', 'admin', false, now(), now()),
  ('admin_login_password_hash', '$2b$10$QCkFsLumKe/Z7Mgi8YBza.AzcbDA9HGhBqp2i/P1AO7ICPqyc//t.', true, now(), now())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    is_secret = EXCLUDED.is_secret,
    updated_at = now();
