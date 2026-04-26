const express = require("express");
const { query } = require("../db");
const { authRequired, allowRoles } = require("../middleware/auth");

const router = express.Router();

router.get(
  "/",
  authRequired,
  allowRoles("DIRETOR_GERAL", "FINANCEIRO"),
  async (request, response, next) => {
    try {
      const result = await query(
        `SELECT id, name, email, profile, company_id, theme_mode, created_at, updated_at
         FROM users
         ORDER BY id ASC`,
        []
      );

      return response.json(result.rows);
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  "/collectors",
  authRequired,
  allowRoles("DIRETOR_GERAL", "FINANCEIRO", "COBRADOR_ATENDENTE"),
  async (request, response, next) => {
    try {
      const result = await query(
        `SELECT id, name, email, profile, company_id, theme_mode
         FROM users
         WHERE profile = 'COBRADOR_ATENDENTE'
         ORDER BY name ASC`,
        []
      );

      return response.json(result.rows);
    } catch (error) {
      return next(error);
    }
  }
);

router.get("/me", authRequired, async (request, response) => {
  return response.json({
    user: request.user
  });
});

module.exports = router;
