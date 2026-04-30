ALTER TABLE users
ADD COLUMN IF NOT EXISTS sidebar_mode text DEFAULT 'fixed';

UPDATE users
SET sidebar_mode = 'fixed'
WHERE sidebar_mode IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_sidebar_mode_check'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT users_sidebar_mode_check
    CHECK (sidebar_mode IN ('fixed', 'floating'));
  END IF;
END $$;
