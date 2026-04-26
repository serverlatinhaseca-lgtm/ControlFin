const express = require("express");
const { query } = require("../db");

const router = express.Router();

router.get("/status", async (request, response, next) => {
  try {
    const companiesResult = await query(
      `SELECT
         COUNT(*)::integer AS companies_total,
         COUNT(*) FILTER (WHERE cc.connected = true)::integer AS companies_connected
       FROM companies c
       LEFT JOIN contazul_connections cc ON cc.company_id = c.id`,
      []
    );

    const totals = companiesResult.rows[0] || {
      companies_total: 0,
      companies_connected: 0
    };

    return response.json({
      configured: true,
      login_available: true,
      contazul_configured: Number(totals.companies_connected) > 0,
      companies_total: Number(totals.companies_total || 0),
      companies_connected: Number(totals.companies_connected || 0)
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/skip", async (request, response) => {
  return response.json({
    success: true,
    login_available: true,
    message: "Login disponível sem bloqueio de configuração inicial."
  });
});

router.post("/complete", async (request, response) => {
  return response.json({
    success: true,
    login_available: true,
    message: "Configuração inicial não bloqueia o login."
  });
});

module.exports = router;
