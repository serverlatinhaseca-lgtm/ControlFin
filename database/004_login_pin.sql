ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pin_hash text;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pin_set boolean DEFAULT true;

UPDATE users
SET pin_hash = '$2a$10$DatUvKf2NVikKkZ0lWLPNuRUBra3gAkRzatmOc94AuturnTxorsby',
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
  ('general_login_password_hash', '$2a$10$EKEOhgGYTpz/NcMhxtMSV.097z83Dt1vOIQ31OMcPFZmg9POsZG32', true, now(), now()),
  ('admin_login_user', 'admin', false, now(), now()),
  ('admin_login_password_hash', '$2a$10$xakrn/.5AguYcNNKLFN9ceLrT3WCps9pz6mO17/Utu3N4HKJVMcS6', true, now(), now())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    is_secret = EXCLUDED.is_secret,
    updated_at = now();
