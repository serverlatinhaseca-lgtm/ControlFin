BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_profile_check;

UPDATE users
SET profile = 'COBRADOR_ATENDENTE'
WHERE profile = 'COBRADOR';

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

DELETE FROM users
WHERE email = 'admin@controlfin.local'
  AND id <> 6;

INSERT INTO users (
    id,
    name,
    email,
    password_hash,
    profile,
    company_id,
    theme_mode,
    created_at,
    updated_at
) VALUES (
    6,
    'Usuário Admin',
    'admin@controlfin.local',
    '$2a$10$8PD4NA.K4C/ont.GR5dFe.qJEomgTlSg2WYRIL2U8ZO5BC2vDuJT6',
    'ADMIN',
    NULL,
    'dark',
    now(),
    now()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    profile = EXCLUDED.profile,
    company_id = EXCLUDED.company_id,
    theme_mode = EXCLUDED.theme_mode,
    updated_at = now();

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

COMMIT;
