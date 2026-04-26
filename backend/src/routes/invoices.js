const express = require("express");
const { query } = require("../db");
const { authRequired, allowRoles } = require("../middleware/auth");

const router = express.Router();

function parsePositiveInteger(value) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
}

function buildInvoiceFilters(request) {
  const where = [];
  const params = [];

  if (request.user.profile === "COBRADOR_ATENDENTE") {
    params.push(request.user.id);
    where.push(`customer.assigned_collector_id = $${params.length}`);
  }

  const customerId = parsePositiveInteger(request.query.customer_id);

  if (customerId) {
    params.push(customerId);
    where.push(`invoice.customer_id = $${params.length}`);
  }

  const companyId = parsePositiveInteger(request.query.company_id);

  if (companyId) {
    params.push(companyId);
    where.push(`customer.company_id = $${params.length}`);
  }

  const status = request.query.status ? String(request.query.status).trim() : "";

  if (status) {
    params.push(status);
    where.push(`invoice.status = $${params.length}`);
  }

  return {
    whereClause: where.length > 0 ? `WHERE ${where.join(" AND ")}` : "",
    params
  };
}

async function getInvoiceWithAccess(request, invoiceId) {
  const result = await query(
    `SELECT
       invoice.*,
       customer.name AS customer_name,
       customer.document AS customer_document,
       customer.company_id,
       customer.assigned_collector_id,
       company.name AS company_name
     FROM invoices invoice
     JOIN customers customer ON customer.id = invoice.customer_id
     LEFT JOIN companies company ON company.id = customer.company_id
     WHERE invoice.id = $1`,
    [invoiceId]
  );

  if (result.rowCount === 0) {
    return {
      invoice: null,
      allowed: false
    };
  }

  const invoice = result.rows[0];

  if (request.user.profile === "COBRADOR_ATENDENTE") {
    return {
      invoice,
      allowed: Number(invoice.assigned_collector_id) === Number(request.user.id)
    };
  }

  return {
    invoice,
    allowed: true
  };
}

router.get(
  "/",
  authRequired,
  allowRoles("DIRETOR_GERAL", "FINANCEIRO", "COBRADOR_ATENDENTE", "DIRETORA_COBRANCA"),
  async (request, response, next) => {
    try {
      const filters = buildInvoiceFilters(request);
      const result = await query(
        `SELECT
           invoice.id,
           invoice.contazul_id,
           invoice.customer_id,
           customer.name AS customer_name,
           customer.document AS customer_document,
           customer.company_id,
           company.name AS company_name,
           invoice.number,
           invoice.type,
           invoice.value,
           invoice.emission_date,
           invoice.due_date,
           invoice.status,
           invoice.pdf_url,
           invoice.created_at,
           invoice.updated_at
         FROM invoices invoice
         JOIN customers customer ON customer.id = invoice.customer_id
         LEFT JOIN companies company ON company.id = customer.company_id
         ${filters.whereClause}
         ORDER BY invoice.due_date ASC NULLS LAST, invoice.id ASC`,
        filters.params
      );

      return response.json(result.rows);
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  "/:id/danfe",
  authRequired,
  allowRoles("DIRETOR_GERAL", "FINANCEIRO", "COBRADOR_ATENDENTE", "DIRETORA_COBRANCA"),
  async (request, response, next) => {
    try {
      const invoiceId = parsePositiveInteger(request.params.id);

      if (!invoiceId) {
        return response.status(400).json({
          message: "Nota inválida."
        });
      }

      const result = await getInvoiceWithAccess(request, invoiceId);

      if (!result.invoice) {
        return response.status(404).json({
          message: "Nota não encontrada."
        });
      }

      if (!result.allowed) {
        return response.status(403).json({
          message: "Você não possui permissão para acessar esta nota."
        });
      }

      if (result.invoice.pdf_url) {
        return response.json({
          url: result.invoice.pdf_url
        });
      }

      return response.json({
        url: null,
        message: "DANFE ainda não disponível para esta nota."
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  "/:id",
  authRequired,
  allowRoles("DIRETOR_GERAL", "FINANCEIRO", "COBRADOR_ATENDENTE", "DIRETORA_COBRANCA"),
  async (request, response, next) => {
    try {
      const invoiceId = parsePositiveInteger(request.params.id);

      if (!invoiceId) {
        return response.status(400).json({
          message: "Nota inválida."
        });
      }

      const result = await getInvoiceWithAccess(request, invoiceId);

      if (!result.invoice) {
        return response.status(404).json({
          message: "Nota não encontrada."
        });
      }

      if (!result.allowed) {
        return response.status(403).json({
          message: "Você não possui permissão para acessar esta nota."
        });
      }

      return response.json({
        invoice: result.invoice
      });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
