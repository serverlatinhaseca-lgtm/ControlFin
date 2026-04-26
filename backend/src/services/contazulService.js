const axios = require("axios");
const { query } = require("../db");

function getApiBaseUrl() {
  return process.env.CONTAZUL_API_BASE || "https://api.contaazul.com/v1";
}

function getTokenUrl() {
  return process.env.CONTAZUL_TOKEN_URL || "https://auth.contaazul.com/oauth2/token";
}

function parseList(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (responseData && Array.isArray(responseData.items)) {
    return responseData.items;
  }

  if (responseData && Array.isArray(responseData.data)) {
    return responseData.data;
  }

  return [];
}

function firstStringValue() {
  const values = Array.prototype.slice.call(arguments);

  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return null;
}

function firstNumberValue() {
  const values = Array.prototype.slice.call(arguments);

  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      const numericValue = Number(value);

      if (!Number.isNaN(numericValue)) {
        return numericValue;
      }
    }
  }

  return 0;
}

function normalizeStatus(rawStatus) {
  const status = String(rawStatus || "ABERTA").trim().toUpperCase();

  if (["PAGA", "PAGO", "PAID", "RECEBIDA", "RECEBIDO"].includes(status)) {
    return "PAGA";
  }

  if (["VENCIDA", "OVERDUE", "ATRASADA", "ATRASADO"].includes(status)) {
    return "VENCIDA";
  }

  if (["CANCELADA", "CANCELADO", "CANCELED", "CANCELLED"].includes(status)) {
    return "CANCELADA";
  }

  return "ABERTA";
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function getCustomerExternalIdFromInvoice(invoice) {
  return firstStringValue(
    invoice.customer_id,
    invoice.customerId,
    invoice.customer && invoice.customer.id,
    invoice.customer && invoice.customer.uuid,
    invoice.client_id,
    invoice.clientId,
    invoice.client && invoice.client.id,
    invoice.person_id,
    invoice.personId
  );
}

function calculateExpiresAt(expiresIn) {
  const seconds = Number(expiresIn || 3600);
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 3600;
  return new Date(Date.now() + safeSeconds * 1000).toISOString();
}

async function getConnection(companyId) {
  const result = await query(
    `SELECT cc.*, c.name AS company_name
     FROM contazul_connections cc
     JOIN companies c ON c.id = cc.company_id
     WHERE cc.company_id = $1`,
    [companyId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
}

async function updateTokens(companyId, tokenData) {
  const accessToken = tokenData.access_token || tokenData.accessToken || null;
  const refreshToken = tokenData.refresh_token || tokenData.refreshToken || null;
  const expiresAt = calculateExpiresAt(tokenData.expires_in || tokenData.expiresIn || 3600);

  const result = await query(
    `UPDATE contazul_connections
     SET access_token = COALESCE($2, access_token),
         refresh_token = COALESCE($3, refresh_token),
         expires_at = $4,
         connected = true,
         updated_at = now()
     WHERE company_id = $1
     RETURNING *`,
    [companyId, accessToken, refreshToken, expiresAt]
  );

  return result.rows[0];
}

async function refreshTokenIfNeeded(companyId) {
  const connection = await getConnection(companyId);

  if (!connection || !connection.connected) {
    return {
      skipped: true,
      message: "ContaAzul não conectada para esta unidade."
    };
  }

  if (!connection.refresh_token) {
    return {
      skipped: true,
      message: "ContaAzul não conectada para esta unidade."
    };
  }

  const expiresAt = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
  const refreshThreshold = Date.now() + 2 * 60 * 1000;

  if (expiresAt > refreshThreshold && connection.access_token) {
    return connection;
  }

  if (!connection.client_id || !connection.client_secret) {
    return {
      skipped: true,
      message: "ContaAzul não conectada para esta unidade."
    };
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: connection.refresh_token,
    client_id: connection.client_id,
    client_secret: connection.client_secret
  });

  const response = await axios.post(getTokenUrl(), body.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    timeout: 20000
  });

  return updateTokens(companyId, response.data || {});
}

async function contaAzulGet(companyId, path) {
  const connection = await refreshTokenIfNeeded(companyId);

  if (connection && connection.skipped) {
    return {
      skipped: true,
      message: connection.message,
      data: []
    };
  }

  const baseUrl = getApiBaseUrl().replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await axios.get(`${baseUrl}${normalizedPath}`, {
    headers: {
      Authorization: `Bearer ${connection.access_token}`,
      Accept: "application/json"
    },
    timeout: 30000
  });

  return {
    skipped: false,
    data: response.data
  };
}

async function fetchCustomers(companyId) {
  const response = await contaAzulGet(companyId, "/customers");

  if (response.skipped) {
    return [];
  }

  return parseList(response.data);
}

async function fetchInvoices(companyId) {
  const response = await contaAzulGet(companyId, "/invoices");

  if (response.skipped) {
    return [];
  }

  return parseList(response.data);
}

async function fetchDanfe(companyId, invoiceId) {
  const response = await contaAzulGet(companyId, `/invoices/${encodeURIComponent(invoiceId)}/danfe`);

  if (response.skipped) {
    return {
      skipped: true,
      message: response.message
    };
  }

  return response.data;
}

async function upsertCustomer(companyId, item) {
  const contazulId = firstStringValue(item.id, item.uuid, item.contazul_id, item.external_id);

  if (!contazulId) {
    return {
      skipped: true,
      id: null,
      created: false
    };
  }

  const name = firstStringValue(item.name, item.razao_social, item.company_name, item.fantasy_name) || "Cliente ContaAzul";
  const document = firstStringValue(item.document, item.cnpj, item.cpf, item.tax_id);
  const email = firstStringValue(item.email, item.email_address, item.contact_email);
  const whatsapp = firstStringValue(item.whatsapp, item.phone, item.mobile_phone, item.cellphone);

  const result = await query(
    `INSERT INTO customers (
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
     ) VALUES ($1, $2, $3, $4, $5, $6, NULL, false, now(), now())
     ON CONFLICT (contazul_id, company_id) WHERE contazul_id IS NOT NULL
     DO UPDATE SET
       name = EXCLUDED.name,
       document = EXCLUDED.document,
       email = EXCLUDED.email,
       whatsapp = EXCLUDED.whatsapp,
       updated_at = now()
     RETURNING id, (xmax = 0) AS created`,
    [contazulId, name, document, email, whatsapp, companyId]
  );

  return {
    skipped: false,
    id: result.rows[0].id,
    created: result.rows[0].created === true,
    contazul_id: contazulId
  };
}

async function upsertInvoice(customerId, item) {
  const contazulId = firstStringValue(item.id, item.uuid, item.contazul_id, item.external_id);

  if (!contazulId) {
    return {
      skipped: true,
      id: null,
      created: false,
      status: null
    };
  }

  const number = firstStringValue(item.number, item.invoice_number, item.document_number, item.code);
  const type = firstStringValue(item.type, item.kind, item.invoice_type) || "SERVICO";
  const value = firstNumberValue(item.value, item.total_value, item.amount, item.total);
  const emissionDate = normalizeDate(item.emission_date || item.issue_date || item.created_at || item.createdAt);
  const dueDate = normalizeDate(item.due_date || item.dueDate || item.expiration_date || item.expirationDate);
  const status = normalizeStatus(item.status || item.situation || item.payment_status);
  const pdfUrl = firstStringValue(item.pdf_url, item.pdfUrl, item.danfe_url, item.danfeUrl);

  const result = await query(
    `INSERT INTO invoices (
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
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())
     ON CONFLICT (contazul_id) WHERE contazul_id IS NOT NULL
     DO UPDATE SET
       customer_id = EXCLUDED.customer_id,
       number = EXCLUDED.number,
       type = EXCLUDED.type,
       value = EXCLUDED.value,
       emission_date = EXCLUDED.emission_date,
       due_date = EXCLUDED.due_date,
       status = EXCLUDED.status,
       pdf_url = EXCLUDED.pdf_url,
       updated_at = now()
     RETURNING id, (xmax = 0) AS created, status`,
    [contazulId, customerId, number, type, value, emissionDate, dueDate, status, pdfUrl]
  );

  return {
    skipped: false,
    id: result.rows[0].id,
    created: result.rows[0].created === true,
    status: result.rows[0].status
  };
}

async function createOrUpdateChargeForCustomer(customerId) {
  const customerResult = await query(
    `SELECT id, assigned_collector_id
     FROM customers
     WHERE id = $1`,
    [customerId]
  );

  if (customerResult.rowCount === 0) {
    return false;
  }

  const customer = customerResult.rows[0];
  const chargeResult = await query(
    `SELECT id
     FROM charges
     WHERE customer_id = $1
     ORDER BY updated_at DESC, id DESC
     LIMIT 1`,
    [customerId]
  );

  if (chargeResult.rowCount === 0) {
    await query(
      `INSERT INTO charges (
         customer_id,
         collector_id,
         status,
         observation,
         cancellation_status,
         updated_by,
         updated_at,
         created_at
       ) VALUES ($1, $2, 'A_COBRAR', 'Cobrança criada pela sincronização ContaAzul.', 'NENHUM', NULL, now(), now())`,
      [customer.id, customer.assigned_collector_id]
    );
    return true;
  }

  await query(
    `UPDATE charges
     SET collector_id = $2,
         observation = COALESCE(observation, 'Cobrança atualizada pela sincronização ContaAzul.'),
         updated_at = now()
     WHERE id = $1`,
    [chargeResult.rows[0].id, customer.assigned_collector_id]
  );

  return true;
}

async function syncCompany(companyId) {
  const numericCompanyId = Number(companyId);

  if (!Number.isInteger(numericCompanyId) || numericCompanyId <= 0) {
    return {
      skipped: true,
      message: "Unidade inválida para sincronização."
    };
  }

  const connection = await getConnection(numericCompanyId);

  if (!connection || !connection.connected) {
    return {
      skipped: true,
      message: "ContaAzul não conectada para esta unidade."
    };
  }

  const summary = {
    company_id: numericCompanyId,
    customers_created: 0,
    customers_updated: 0,
    invoices_created: 0,
    invoices_updated: 0,
    charges_updated: 0,
    errors: []
  };

  const customerMap = new Map();
  let customers = [];
  let invoices = [];

  try {
    customers = await fetchCustomers(numericCompanyId);
  } catch (error) {
    summary.errors.push("Falha ao buscar clientes da ContaAzul.");
  }

  for (const customer of customers) {
    try {
      const result = await upsertCustomer(numericCompanyId, customer);

      if (result.skipped) {
        continue;
      }

      customerMap.set(result.contazul_id, result.id);

      if (result.created) {
        summary.customers_created += 1;
      } else {
        summary.customers_updated += 1;
      }
    } catch (error) {
      summary.errors.push("Falha ao salvar cliente recebido da ContaAzul.");
    }
  }

  try {
    invoices = await fetchInvoices(numericCompanyId);
  } catch (error) {
    summary.errors.push("Falha ao buscar notas da ContaAzul.");
  }

  for (const invoice of invoices) {
    try {
      const customerExternalId = getCustomerExternalIdFromInvoice(invoice);
      let customerId = customerExternalId ? customerMap.get(customerExternalId) : null;

      if (!customerId && customerExternalId) {
        const customerResult = await query(
          `SELECT id
           FROM customers
           WHERE company_id = $1
             AND contazul_id = $2`,
          [numericCompanyId, customerExternalId]
        );

        if (customerResult.rowCount > 0) {
          customerId = customerResult.rows[0].id;
        }
      }

      if (!customerId) {
        summary.errors.push("Nota ignorada por não ter cliente local correspondente.");
        continue;
      }

      const result = await upsertInvoice(customerId, invoice);

      if (result.skipped) {
        continue;
      }

      if (result.created) {
        summary.invoices_created += 1;
      } else {
        summary.invoices_updated += 1;
      }

      if (["ABERTA", "VENCIDA"].includes(result.status)) {
        const chargeUpdated = await createOrUpdateChargeForCustomer(customerId);

        if (chargeUpdated) {
          summary.charges_updated += 1;
        }
      }
    } catch (error) {
      summary.errors.push("Falha ao salvar nota recebida da ContaAzul.");
    }
  }

  await query(
    `UPDATE contazul_connections
     SET last_sync_at = now(),
         updated_at = now()
     WHERE company_id = $1`,
    [numericCompanyId]
  );

  return summary;
}

async function syncAllCompanies() {
  const connectionsResult = await query(
    `SELECT company_id
     FROM contazul_connections
     WHERE connected = true
     ORDER BY company_id ASC`
  );

  if (connectionsResult.rowCount === 0) {
    return {
      skipped: true,
      message: "Nenhuma unidade ContaAzul conectada."
    };
  }

  const results = [];

  for (const connection of connectionsResult.rows) {
    const result = await syncCompany(connection.company_id);
    results.push(result);
  }

  return {
    skipped: false,
    results
  };
}

module.exports = {
  getConnection,
  refreshTokenIfNeeded,
  fetchCustomers,
  fetchInvoices,
  fetchDanfe,
  syncCompany,
  syncAllCompanies,
  updateTokens
};
