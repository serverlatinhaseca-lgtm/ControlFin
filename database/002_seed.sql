BEGIN;

INSERT INTO companies (id, name, created_at) VALUES
    (1, 'Unidade 1', now()),
    (2, 'Unidade 2', now())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name;

INSERT INTO users (id, name, email, password_hash, profile, company_id, theme_mode, created_at, updated_at) VALUES
    (
        1,
        'Usuário Financeiro',
        'financeiro@controlfin.local',
        '$2b$10$pt7oMyx/n9Vcyk0zHtIE3u/apJJw5YUWJ40QCsJKl9ViQHmH.eI0G',
        'FINANCEIRO',
        NULL,
        'light',
        now(),
        now()
    ),
    (
        2,
        'Usuário Cobrador Atendente',
        'cobrador.atendente@controlfin.local',
        '$2b$10$pt7oMyx/n9Vcyk0zHtIE3u/apJJw5YUWJ40QCsJKl9ViQHmH.eI0G',
        'COBRADOR_ATENDENTE',
        NULL,
        'light',
        now(),
        now()
    ),
    (
        3,
        'Usuária Diretoria Cobrança',
        'diretoria.cobranca@controlfin.local',
        '$2b$10$pt7oMyx/n9Vcyk0zHtIE3u/apJJw5YUWJ40QCsJKl9ViQHmH.eI0G',
        'DIRETORA_COBRANCA',
        NULL,
        'light',
        now(),
        now()
    ),
    (
        4,
        'Usuário Diretor Geral',
        'diretor@controlfin.local',
        '$2b$10$pt7oMyx/n9Vcyk0zHtIE3u/apJJw5YUWJ40QCsJKl9ViQHmH.eI0G',
        'DIRETOR_GERAL',
        NULL,
        'light',
        now(),
        now()
    ),
    (
        5,
        'Usuário Atendente',
        'atendente@controlfin.local',
        '$2b$10$pt7oMyx/n9Vcyk0zHtIE3u/apJJw5YUWJ40QCsJKl9ViQHmH.eI0G',
        'ATENDENTE',
        NULL,
        'light',
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

INSERT INTO customers (
    id,
    contazul_id,
    name,
    document,
    email,
    whatsapp,
    company_id,
    assigned_collector_id,
    is_my_customer,
    created_at,
    updated_at
) VALUES
    (
        1,
        'cz-cliente-a-unidade-1',
        'Cliente A',
        '00.000.000/0001-01',
        'cliente.a@controlfin.local',
        '+55 11 90000-0001',
        1,
        2,
        true,
        now(),
        now()
    ),
    (
        2,
        'cz-cliente-b-unidade-1',
        'Cliente B',
        '00.000.000/0001-02',
        'cliente.b@controlfin.local',
        '+55 11 90000-0002',
        1,
        2,
        true,
        now(),
        now()
    ),
    (
        3,
        'cz-cliente-c-unidade-2',
        'Cliente C',
        '00.000.000/0001-03',
        'cliente.c@controlfin.local',
        '+55 11 90000-0003',
        2,
        2,
        true,
        now(),
        now()
    ),
    (
        4,
        'cz-cliente-d-unidade-2',
        'Cliente D',
        '00.000.000/0001-04',
        'cliente.d@controlfin.local',
        '+55 11 90000-0004',
        2,
        NULL,
        false,
        now(),
        now()
    ),
    (
        5,
        'cz-cliente-e-unidade-1',
        'Cliente E',
        '00.000.000/0001-05',
        'cliente.e@controlfin.local',
        '+55 11 90000-0005',
        1,
        NULL,
        false,
        now(),
        now()
    ),
    (
        6,
        'cz-cliente-f-unidade-2',
        'Cliente F',
        '00.000.000/0001-06',
        'cliente.f@controlfin.local',
        '+55 11 90000-0006',
        2,
        2,
        true,
        now(),
        now()
    )
ON CONFLICT (id) DO UPDATE SET
    contazul_id = EXCLUDED.contazul_id,
    name = EXCLUDED.name,
    document = EXCLUDED.document,
    email = EXCLUDED.email,
    whatsapp = EXCLUDED.whatsapp,
    company_id = EXCLUDED.company_id,
    assigned_collector_id = EXCLUDED.assigned_collector_id,
    is_my_customer = EXCLUDED.is_my_customer,
    updated_at = now();

INSERT INTO invoices (
    id,
    contazul_id,
    customer_id,
    number,
    type,
    value,
    emission_date,
    due_date,
    status,
    pdf_url,
    created_at,
    updated_at
) VALUES
    (
        1,
        'cz-invoice-a-001',
        1,
        'NF-A-001',
        'SERVICO',
        1200.00,
        DATE '2026-01-10',
        DATE '2026-03-15',
        'VENCIDA',
        '/files/invoices/NF-A-001.pdf',
        now(),
        now()
    ),
    (
        2,
        'cz-invoice-a-002',
        1,
        'NF-A-002',
        'PRODUTO',
        850.00,
        DATE '2026-03-20',
        DATE '2026-06-01',
        'ABERTA',
        '/files/invoices/NF-A-002.pdf',
        now(),
        now()
    ),
    (
        3,
        'cz-invoice-b-001',
        2,
        'NF-B-001',
        'SERVICO',
        640.00,
        DATE '2026-01-05',
        DATE '2026-04-18',
        'PAGA',
        '/files/invoices/NF-B-001.pdf',
        now(),
        now()
    ),
    (
        4,
        'cz-invoice-b-002',
        2,
        'NF-B-002',
        'PRODUTO',
        980.00,
        DATE '2026-02-08',
        DATE '2026-05-18',
        'ABERTA',
        '/files/invoices/NF-B-002.pdf',
        now(),
        now()
    ),
    (
        5,
        'cz-invoice-c-001',
        3,
        'NF-C-001',
        'SERVICO',
        1500.00,
        DATE '2026-01-18',
        DATE '2026-04-18',
        'VENCIDA',
        '/files/invoices/NF-C-001.pdf',
        now(),
        now()
    ),
    (
        6,
        'cz-invoice-c-002',
        3,
        'NF-C-002',
        'RECORRENTE',
        720.00,
        DATE '2026-02-10',
        DATE '2026-05-11',
        'ABERTA',
        '/files/invoices/NF-C-002.pdf',
        now(),
        now()
    ),
    (
        7,
        'cz-invoice-d-001',
        4,
        'NF-D-001',
        'SERVICO',
        430.00,
        DATE '2026-01-25',
        DATE '2026-03-10',
        'VENCIDA',
        '/files/invoices/NF-D-001.pdf',
        now(),
        now()
    ),
    (
        8,
        'cz-invoice-e-001',
        5,
        'NF-E-001',
        'PRODUTO',
        390.00,
        DATE '2026-02-12',
        DATE '2026-04-15',
        'PAGA',
        '/files/invoices/NF-E-001.pdf',
        now(),
        now()
    ),
    (
        9,
        'cz-invoice-f-001',
        6,
        'NF-F-001',
        'SERVICO',
        2150.00,
        DATE '2026-03-01',
        DATE '2026-05-18',
        'ABERTA',
        '/files/invoices/NF-F-001.pdf',
        now(),
        now()
    )
ON CONFLICT (id) DO UPDATE SET
    contazul_id = EXCLUDED.contazul_id,
    customer_id = EXCLUDED.customer_id,
    number = EXCLUDED.number,
    type = EXCLUDED.type,
    value = EXCLUDED.value,
    emission_date = EXCLUDED.emission_date,
    due_date = EXCLUDED.due_date,
    status = EXCLUDED.status,
    pdf_url = EXCLUDED.pdf_url,
    updated_at = now();

INSERT INTO due_rules (
    id,
    customer_id,
    rule_name,
    period_start_day,
    period_end_day,
    due_months_after,
    due_day,
    active,
    created_at
) VALUES
    (1, 1, 'Cliente A - Período 1 a 15', 1, 15, 2, 15, true, now()),
    (2, 1, 'Cliente A - Período 16 a 31', 16, 31, 3, 1, true, now()),
    (3, 2, 'Cliente B - Período 1 a 31', 1, 31, 3, 18, true, now()),
    (4, 3, 'Cliente C - Período 1 a 15', 1, 15, 3, 11, true, now()),
    (5, 3, 'Cliente C - Período 16 a 31', 16, 31, 3, 18, true, now())
ON CONFLICT (id) DO UPDATE SET
    customer_id = EXCLUDED.customer_id,
    rule_name = EXCLUDED.rule_name,
    period_start_day = EXCLUDED.period_start_day,
    period_end_day = EXCLUDED.period_end_day,
    due_months_after = EXCLUDED.due_months_after,
    due_day = EXCLUDED.due_day,
    active = EXCLUDED.active;

INSERT INTO taxes (
    id,
    customer_id,
    icms,
    ipi,
    pis,
    cofins,
    created_at,
    updated_at
) VALUES
    (1, 1, 18.00, 5.00, 1.65, 7.60, now(), now()),
    (2, 2, 12.00, 0.00, 0.65, 3.00, now(), now()),
    (3, 3, 18.00, 0.00, 1.65, 7.60, now(), now()),
    (4, 4, 12.00, 2.00, 0.65, 3.00, now(), now()),
    (5, 5, 7.00, 0.00, 0.65, 3.00, now(), now()),
    (6, 6, 18.00, 3.00, 1.65, 7.60, now(), now())
ON CONFLICT (id) DO UPDATE SET
    customer_id = EXCLUDED.customer_id,
    icms = EXCLUDED.icms,
    ipi = EXCLUDED.ipi,
    pis = EXCLUDED.pis,
    cofins = EXCLUDED.cofins,
    updated_at = now();

INSERT INTO tasks (
    id,
    customer_id,
    assigned_to,
    due_date,
    delivery_date,
    items,
    total_value,
    status_nf,
    status_boleto,
    status_envio,
    channel,
    created_at,
    updated_at
) VALUES
    (
        1,
        1,
        1,
        DATE '2026-04-28',
        NULL,
        'Conferir faturamento do Cliente A e validar emissão da nota complementar',
        1200.00,
        'PENDENTE',
        'PENDENTE',
        'PENDENTE',
        'INTERNO',
        now(),
        now()
    ),
    (
        2,
        2,
        1,
        DATE '2026-04-29',
        DATE '2026-04-20',
        'Baixar pagamento confirmado do Cliente B e anexar comprovante',
        640.00,
        'EMITIDA',
        'BAIXADO',
        'ENVIADO',
        'EMAIL',
        now(),
        now()
    ),
    (
        3,
        5,
        1,
        DATE '2026-05-02',
        NULL,
        'Emitir boleto e nota de fechamento para Cliente E',
        390.00,
        'PENDENTE',
        'PENDENTE',
        'PENDENTE',
        'EMAIL',
        now(),
        now()
    ),
    (
        4,
        4,
        1,
        DATE '2026-05-03',
        NULL,
        'Revisar pendência vencida do Cliente D antes de nova emissão',
        430.00,
        'PENDENTE',
        'PENDENTE',
        'PENDENTE',
        'INTERNO',
        now(),
        now()
    ),
    (
        5,
        1,
        2,
        DATE '2026-04-27',
        NULL,
        'Cobrar retorno do Cliente A sobre nota vencida e atualizar observação',
        1200.00,
        'EMITIDA',
        'GERADO',
        'ENVIADO',
        'WHATSAPP',
        now(),
        now()
    ),
    (
        6,
        3,
        2,
        DATE '2026-04-30',
        NULL,
        'Atender Cliente C e confirmar pedido de cancelamento antes da aprovação',
        1500.00,
        'EMITIDA',
        'GERADO',
        'ENVIADO',
        'TELEFONE',
        now(),
        now()
    ),
    (
        7,
        6,
        2,
        DATE '2026-05-04',
        NULL,
        'Enviar segunda via do boleto do Cliente F e registrar contato',
        2150.00,
        'EMITIDA',
        'GERADO',
        'PENDENTE',
        'WHATSAPP',
        now(),
        now()
    )
ON CONFLICT (id) DO UPDATE SET
    customer_id = EXCLUDED.customer_id,
    assigned_to = EXCLUDED.assigned_to,
    due_date = EXCLUDED.due_date,
    delivery_date = EXCLUDED.delivery_date,
    items = EXCLUDED.items,
    total_value = EXCLUDED.total_value,
    status_nf = EXCLUDED.status_nf,
    status_boleto = EXCLUDED.status_boleto,
    status_envio = EXCLUDED.status_envio,
    channel = EXCLUDED.channel,
    updated_at = now();

INSERT INTO task_logs (id, task_id, action, user_id, created_at) VALUES
    (1, 1, 'Tarefa criada para conferência financeira', 1, now()),
    (2, 2, 'Pagamento confirmado e tarefa marcada como entregue', 1, now()),
    (3, 5, 'Contato de cobrança pendente para o cliente atribuído', 2, now()),
    (4, 6, 'Solicitação de cancelamento enviada para validação', 2, now())
ON CONFLICT (id) DO UPDATE SET
    task_id = EXCLUDED.task_id,
    action = EXCLUDED.action,
    user_id = EXCLUDED.user_id;

INSERT INTO charges (
    id,
    customer_id,
    collector_id,
    status,
    observation,
    cancellation_status,
    updated_by,
    updated_at,
    created_at
) VALUES
    (
        1,
        1,
        2,
        'A_COBRAR',
        'Cliente A possui nota vencida e nova nota aberta para acompanhamento.',
        'NENHUM',
        2,
        now(),
        now()
    ),
    (
        2,
        2,
        2,
        'PAGO',
        'Cliente B confirmou pagamento de nota anterior e mantém nota aberta em acompanhamento.',
        'NENHUM',
        2,
        now(),
        now()
    ),
    (
        3,
        3,
        2,
        'CANCELAR_PEDIDO',
        'Cliente C solicitou cancelamento do pedido vinculado à cobrança.',
        'SOLICITADO',
        3,
        now(),
        now()
    ),
    (
        4,
        6,
        2,
        'A_COBRAR',
        'Cliente F possui cobrança aberta para vencimento próximo.',
        'NENHUM',
        2,
        now(),
        now()
    )
ON CONFLICT (id) DO UPDATE SET
    customer_id = EXCLUDED.customer_id,
    collector_id = EXCLUDED.collector_id,
    status = EXCLUDED.status,
    observation = EXCLUDED.observation,
    cancellation_status = EXCLUDED.cancellation_status,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();

INSERT INTO charge_history (
    id,
    charge_id,
    old_status,
    new_status,
    observation,
    user_id,
    created_at
) VALUES
    (1, 1, NULL, 'A_COBRAR', 'Cobrança inicial criada para Cliente A.', 2, now()),
    (2, 2, 'A_COBRAR', 'PAGO', 'Cliente B informou pagamento e o status foi atualizado.', 2, now()),
    (3, 3, 'A_COBRAR', 'CANCELAR_PEDIDO', 'Cliente C solicitou cancelamento para análise da diretoria de cobrança.', 3, now()),
    (4, 4, NULL, 'A_COBRAR', 'Cobrança inicial criada para Cliente F.', 2, now()),
    (5, 1, 'A_COBRAR', 'A_COBRAR', 'Mensagem de cobrança enviada por WhatsApp para Cliente A.', 2, now())
ON CONFLICT (id) DO UPDATE SET
    charge_id = EXCLUDED.charge_id,
    old_status = EXCLUDED.old_status,
    new_status = EXCLUDED.new_status,
    observation = EXCLUDED.observation,
    user_id = EXCLUDED.user_id;

INSERT INTO reminders (
    id,
    title,
    description,
    to_user_id,
    from_user_id,
    priority,
    reminder_date,
    status,
    created_at,
    updated_at
) VALUES
    (
        1,
        'Revisar cobranças vencidas',
        'Verificar cobranças em aberto dos clientes atribuídos antes do fechamento do dia.',
        2,
        3,
        'ALTA',
        DATE '2026-04-27',
        'ABERTO',
        now(),
        now()
    ),
    (
        2,
        'Conferir notas pagas',
        'Atualizar registros financeiros das notas pagas no painel de testes.',
        1,
        4,
        'MEDIA',
        DATE '2026-04-28',
        'ABERTO',
        now(),
        now()
    ),
    (
        3,
        'Acompanhar atendimento',
        'Confirmar se os clientes sem cobrador precisam de contato inicial.',
        5,
        3,
        'BAIXA',
        DATE '2026-05-02',
        'ABERTO',
        now(),
        now()
    )
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    to_user_id = EXCLUDED.to_user_id,
    from_user_id = EXCLUDED.from_user_id,
    priority = EXCLUDED.priority,
    reminder_date = EXCLUDED.reminder_date,
    status = EXCLUDED.status,
    updated_at = now();

INSERT INTO contazul_connections (
    id,
    company_id,
    client_id,
    client_secret,
    redirect_uri,
    access_token,
    refresh_token,
    expires_at,
    connected,
    last_sync_at,
    created_at,
    updated_at
) VALUES
    (
        1,
        1,
        '',
        '',
        'http://localhost/api/contazul/callback',
        NULL,
        NULL,
        NULL,
        false,
        NULL,
        now(),
        now()
    ),
    (
        2,
        2,
        '',
        '',
        'http://localhost/api/contazul/callback',
        NULL,
        NULL,
        NULL,
        false,
        NULL,
        now(),
        now()
    )
ON CONFLICT (id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    client_id = EXCLUDED.client_id,
    client_secret = EXCLUDED.client_secret,
    redirect_uri = EXCLUDED.redirect_uri,
    access_token = EXCLUDED.access_token,
    refresh_token = EXCLUDED.refresh_token,
    expires_at = EXCLUDED.expires_at,
    connected = EXCLUDED.connected,
    last_sync_at = EXCLUDED.last_sync_at,
    updated_at = now();

INSERT INTO app_settings (id, key, value, is_secret, created_at, updated_at) VALUES
    (1, 'setup_configured', 'false', false, now(), now()),
    (2, 'default_theme', 'light', false, now(), now())
ON CONFLICT (id) DO UPDATE SET
    key = EXCLUDED.key,
    value = EXCLUDED.value,
    is_secret = EXCLUDED.is_secret,
    updated_at = now();

SELECT setval('companies_id_seq', COALESCE((SELECT MAX(id) FROM companies), 1), true);
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1), true);
SELECT setval('customers_id_seq', COALESCE((SELECT MAX(id) FROM customers), 1), true);
SELECT setval('invoices_id_seq', COALESCE((SELECT MAX(id) FROM invoices), 1), true);
SELECT setval('due_rules_id_seq', COALESCE((SELECT MAX(id) FROM due_rules), 1), true);
SELECT setval('taxes_id_seq', COALESCE((SELECT MAX(id) FROM taxes), 1), true);
SELECT setval('tasks_id_seq', COALESCE((SELECT MAX(id) FROM tasks), 1), true);
SELECT setval('task_logs_id_seq', COALESCE((SELECT MAX(id) FROM task_logs), 1), true);
SELECT setval('charges_id_seq', COALESCE((SELECT MAX(id) FROM charges), 1), true);
SELECT setval('charge_history_id_seq', COALESCE((SELECT MAX(id) FROM charge_history), 1), true);
SELECT setval('reminders_id_seq', COALESCE((SELECT MAX(id) FROM reminders), 1), true);
SELECT setval('contazul_connections_id_seq', COALESCE((SELECT MAX(id) FROM contazul_connections), 1), true);
SELECT setval('app_settings_id_seq', COALESCE((SELECT MAX(id) FROM app_settings), 1), true);

COMMIT;
