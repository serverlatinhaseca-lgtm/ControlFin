BEGIN;

CREATE TABLE IF NOT EXISTS companies (
    id serial PRIMARY KEY,
    name text NOT NULL,
    created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
    id serial PRIMARY KEY,
    name text NOT NULL,
    email text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    profile text NOT NULL,
    company_id integer REFERENCES companies(id),
    theme_mode text DEFAULT 'light',
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now(),
    CONSTRAINT users_profile_check CHECK (
        profile IN (
            'FINANCEIRO',
            'COBRADOR_ATENDENTE',
            'DIRETORA_COBRANCA',
            'DIRETOR_GERAL',
            'ATENDENTE'
        )
    ),
    CONSTRAINT users_theme_mode_check CHECK (theme_mode IN ('light', 'dark'))
);

CREATE TABLE IF NOT EXISTS customers (
    id serial PRIMARY KEY,
    contazul_id text,
    name text NOT NULL,
    document text,
    email text,
    whatsapp text,
    company_id integer REFERENCES companies(id),
    assigned_collector_id integer REFERENCES users(id),
    is_my_customer boolean DEFAULT false,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
    id serial PRIMARY KEY,
    contazul_id text,
    customer_id integer REFERENCES customers(id) ON DELETE CASCADE,
    number text,
    type text,
    value numeric(12,2) DEFAULT 0,
    emission_date date,
    due_date date,
    status text,
    pdf_url text,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS due_rules (
    id serial PRIMARY KEY,
    customer_id integer REFERENCES customers(id) ON DELETE CASCADE,
    rule_name text,
    period_start_day integer,
    period_end_day integer,
    due_months_after integer,
    due_day integer,
    active boolean DEFAULT true,
    created_at timestamp DEFAULT now(),
    CONSTRAINT due_rules_period_start_day_check CHECK (period_start_day IS NULL OR period_start_day BETWEEN 1 AND 31),
    CONSTRAINT due_rules_period_end_day_check CHECK (period_end_day IS NULL OR period_end_day BETWEEN 1 AND 31),
    CONSTRAINT due_rules_due_months_after_check CHECK (due_months_after IS NULL OR due_months_after >= 0),
    CONSTRAINT due_rules_due_day_check CHECK (due_day IS NULL OR due_day BETWEEN 1 AND 31)
);

CREATE TABLE IF NOT EXISTS taxes (
    id serial PRIMARY KEY,
    customer_id integer REFERENCES customers(id) ON DELETE CASCADE,
    icms numeric(6,2) DEFAULT 0,
    ipi numeric(6,2) DEFAULT 0,
    pis numeric(6,2) DEFAULT 0,
    cofins numeric(6,2) DEFAULT 0,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
    id serial PRIMARY KEY,
    customer_id integer REFERENCES customers(id),
    assigned_to integer REFERENCES users(id),
    due_date date,
    delivery_date date,
    items text,
    total_value numeric(12,2) DEFAULT 0,
    status_nf text DEFAULT 'PENDENTE',
    status_boleto text DEFAULT 'PENDENTE',
    status_envio text DEFAULT 'PENDENTE',
    channel text,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_logs (
    id serial PRIMARY KEY,
    task_id integer REFERENCES tasks(id) ON DELETE CASCADE,
    action text NOT NULL,
    user_id integer REFERENCES users(id),
    created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS charges (
    id serial PRIMARY KEY,
    customer_id integer REFERENCES customers(id) ON DELETE CASCADE,
    collector_id integer REFERENCES users(id),
    status text DEFAULT 'A_COBRAR',
    observation text,
    cancellation_status text DEFAULT 'NENHUM',
    updated_by integer REFERENCES users(id),
    updated_at timestamp DEFAULT now(),
    created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS charge_history (
    id serial PRIMARY KEY,
    charge_id integer REFERENCES charges(id) ON DELETE CASCADE,
    old_status text,
    new_status text,
    observation text,
    user_id integer REFERENCES users(id),
    created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reminders (
    id serial PRIMARY KEY,
    title text NOT NULL,
    description text,
    to_user_id integer REFERENCES users(id),
    from_user_id integer REFERENCES users(id),
    priority text DEFAULT 'MEDIA',
    reminder_date date,
    status text DEFAULT 'ABERTO',
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contazul_connections (
    id serial PRIMARY KEY,
    company_id integer REFERENCES companies(id) ON DELETE CASCADE,
    client_id text,
    client_secret text,
    redirect_uri text,
    access_token text,
    refresh_token text,
    expires_at timestamp,
    connected boolean DEFAULT false,
    last_sync_at timestamp,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now(),
    UNIQUE(company_id)
);

CREATE TABLE IF NOT EXISTS app_settings (
    id serial PRIMARY KEY,
    key text UNIQUE NOT NULL,
    value text,
    is_secret boolean DEFAULT false,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_contazul_company_unique
    ON customers(contazul_id, company_id)
    WHERE contazul_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_contazul_unique
    ON invoices(contazul_id)
    WHERE contazul_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_company_id
    ON customers(company_id);

CREATE INDEX IF NOT EXISTS idx_customers_assigned_collector_id
    ON customers(assigned_collector_id);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id
    ON invoices(customer_id);

CREATE INDEX IF NOT EXISTS idx_invoices_due_date
    ON invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to
    ON tasks(assigned_to);

CREATE INDEX IF NOT EXISTS idx_tasks_customer_id
    ON tasks(customer_id);

CREATE INDEX IF NOT EXISTS idx_charges_collector_id
    ON charges(collector_id);

CREATE INDEX IF NOT EXISTS idx_charges_customer_id
    ON charges(customer_id);

CREATE INDEX IF NOT EXISTS idx_charges_status
    ON charges(status);

CREATE INDEX IF NOT EXISTS idx_contazul_connections_company_id
    ON contazul_connections(company_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_customers_set_updated_at ON customers;
CREATE TRIGGER trg_customers_set_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_set_updated_at ON invoices;
CREATE TRIGGER trg_invoices_set_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_taxes_set_updated_at ON taxes;
CREATE TRIGGER trg_taxes_set_updated_at
    BEFORE UPDATE ON taxes
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_tasks_set_updated_at ON tasks;
CREATE TRIGGER trg_tasks_set_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_charges_set_updated_at ON charges;
CREATE TRIGGER trg_charges_set_updated_at
    BEFORE UPDATE ON charges
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_reminders_set_updated_at ON reminders;
CREATE TRIGGER trg_reminders_set_updated_at
    BEFORE UPDATE ON reminders
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_contazul_connections_set_updated_at ON contazul_connections;
CREATE TRIGGER trg_contazul_connections_set_updated_at
    BEFORE UPDATE ON contazul_connections
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_app_settings_set_updated_at ON app_settings;
CREATE TRIGGER trg_app_settings_set_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

COMMIT;
