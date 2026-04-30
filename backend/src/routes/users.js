const express = require("express");
const { query } = require("../db");
const { authRequired, allowRoles } = require("../middleware/auth");

const router = express.Router();

function isValidSidebarMode(sidebarMode) {
  return sidebarMode === "fixed" || sidebarMode === "floating";
}

router.get(
  "/",
  authRequired,
  allowRoles("DIRETOR_GERAL", "FINANCEIRO"),
  async (request, response, next) => {
    try {
      const result = await query(
        `SELECT id, name, email, profile, company_id, theme_mode, COALESCE(sidebar_mode, 'fixed') AS sidebar_mode, created_at, updated_at
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
        `SELECT id, name, email, profile, company_id, theme_mode, COALESCE(sidebar_mode, 'fixed') AS sidebar_mode
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

router.put("/me/sidebar", authRequired, async (request, response, next) => {
  try {
    const sidebarMode = String(request.body.sidebar_mode || "");

    if (!isValidSidebarMode(sidebarMode)) {
      return response.status(400).json({
        message: "Modo da barra lateral invalido. Use fixed ou floating."
      });
    }

    const result = await query(
      `UPDATE users
       SET sidebar_mode = $2,
           updated_at = now()
       WHERE id = $1
       RETURNING id, name, email, profile, company_id, theme_mode, COALESCE(sidebar_mode, 'fixed') AS sidebar_mode`,
      [request.user.id, sidebarMode]
    );

    return response.json({
      sidebar_mode: result.rows[0].sidebar_mode,
      user: result.rows[0]
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
