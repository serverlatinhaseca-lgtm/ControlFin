const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../db");
const { authRequired, getJwtSecret } = require("../middleware/auth");

const router = express.Router();

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    company_id: user.company_id,
    theme_mode: user.theme_mode
  };
}

function isValidThemeMode(themeMode) {
  return themeMode === "light" || themeMode === "dark";
}

router.get("/users", async (request, response, next) => {
  try {
    const result = await query(
      `SELECT id, name, email, profile
       FROM users
       ORDER BY id ASC`,
      []
    );

    return response.json(result.rows);
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (request, response, next) => {
  try {
    const userId = Number(request.body.user_id);
    const password = String(request.body.password || "");

    if (!Number.isInteger(userId) || userId <= 0) {
      return response.status(400).json({
        message: "Selecione um usuário válido."
      });
    }

    if (!password) {
      return response.status(400).json({
        message: "Informe a senha."
      });
    }

    const result = await query(
      `SELECT id, name, email, password_hash, profile, company_id, theme_mode
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      return response.status(401).json({
        message: "Usuário ou senha inválidos."
      });
    }

    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return response.status(401).json({
        message: "Usuário ou senha inválidos."
      });
    }

    const token = jwt.sign(
      {
        profile: user.profile,
        user_id: user.id
      },
      getJwtSecret(),
      {
        subject: String(user.id),
        expiresIn: "8h"
      }
    );

    return response.json({
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", authRequired, async (request, response) => {
  return response.json({
    user: request.user
  });
});

router.post("/change-password", authRequired, async (request, response, next) => {
  try {
    const currentPassword = String(request.body.current_password || "");
    const newPassword = String(request.body.new_password || "");

    if (!currentPassword || !newPassword) {
      return response.status(400).json({
        message: "Informe a senha atual e a nova senha."
      });
    }

    if (newPassword.length < 6) {
      return response.status(400).json({
        message: "A nova senha deve ter pelo menos 6 caracteres."
      });
    }

    const userResult = await query(
      `SELECT id, password_hash
       FROM users
       WHERE id = $1`,
      [request.user.id]
    );

    if (userResult.rowCount === 0) {
      return response.status(404).json({
        message: "Usuário não encontrado."
      });
    }

    const passwordMatches = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);

    if (!passwordMatches) {
      return response.status(401).json({
        message: "Senha atual inválida."
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await query(
      `UPDATE users
       SET password_hash = $2,
           updated_at = now()
       WHERE id = $1`,
      [request.user.id, passwordHash]
    );

    return response.json({
      success: true,
      message: "Senha alterada com sucesso."
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/me", authRequired, async (request, response, next) => {
  try {
    const name = request.body.name !== undefined ? String(request.body.name).trim() : request.user.name;
    const themeMode = request.body.theme_mode !== undefined ? String(request.body.theme_mode) : request.user.theme_mode;

    if (!name) {
      return response.status(400).json({
        message: "Informe o nome do usuário."
      });
    }

    if (!isValidThemeMode(themeMode)) {
      return response.status(400).json({
        message: "Tema inválido. Use light ou dark."
      });
    }

    const result = await query(
      `UPDATE users
       SET name = $2,
           theme_mode = $3,
           updated_at = now()
       WHERE id = $1
       RETURNING id, name, email, profile, company_id, theme_mode`,
      [request.user.id, name, themeMode]
    );

    return response.json({
      user: result.rows[0]
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
