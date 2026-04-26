BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_profile_check;

DO $$
DECLARE
    profile_constraint_name text;
BEGIN
    FOR profile_constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'users'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%profile%'
    LOOP
        EXECUTE format('ALTER TABLE users DROP CONSTRAINT IF EXISTS %I', profile_constraint_name);
    END LOOP;
END;
$$;

ALTER TABLE users
    ADD CONSTRAINT users_profile_check CHECK (
        profile IN (
            'ADMIN',
            'FINANCEIRO',
            'COBRADOR_ATENDENTE',
            'DIRETORA_COBRANCA',
            'DIRETOR_GERAL',
            'ATENDENTE'
        )
    );

SELECT setval('users_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM users), 0), 5), true);

INSERT INTO users (
    name,
    email,
    password_hash,
    profile,
    company_id,
    theme_mode,
    created_at,
    updated_at
) VALUES (
    'Usuário Admin',
    'admin@controlfin.local',
    '$2b$10$pt7oMyx/n9Vcyk0zHtIE3u/apJJw5YUWJ40QCsJKl9ViQHmH.eI0G',
    'ADMIN',
    NULL,
    'dark',
    now(),
    now()
)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    profile = EXCLUDED.profile,
    company_id = EXCLUDED.company_id,
    theme_mode = EXCLUDED.theme_mode,
    updated_at = now();

SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1), true);

COMMIT;
