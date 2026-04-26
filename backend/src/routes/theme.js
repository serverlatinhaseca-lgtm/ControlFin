const express = require("express");
const { query } = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

function isValidThemeMode(themeMode) {
  return themeMode === "light" || themeMode === "dark";
}

router.get("/", authRequired, async (request, response) => {
  return response.json({
    theme_mode: request.user.theme_mode || "light"
  });
});

router.put("/", authRequired, async (request, response, next) => {
  try {
    const themeMode = String(request.body.theme_mode || "");

    if (!isValidThemeMode(themeMode)) {
      return response.status(400).json({
        message: "Tema inválido. Use light ou dark."
      });
    }

    const result = await query(
      `UPDATE users
       SET theme_mode = $2,
           updated_at = now()
       WHERE id = $1
       RETURNING id, name, email, profile, company_id, theme_mode`,
      [request.user.id, themeMode]
    );

    return response.json({
      user: result.rows[0]
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
