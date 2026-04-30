const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../db");
const { authRequired, getJwtSecret } = require("../middleware/auth");

const router = express.Router();

const SELECTOR_TOKEN_TTL = "10m";
const NORMAL_TOKEN_TTL = "8h";
const SELECTOR_TOKEN_TYPE = "selector";
const DEFAULT_GENERAL_LOGIN_USER = "controlfin";
const DEFAULT_GENERAL_LOGIN_PASSWORD_HASH = "$2a$10$EKEOhgGYTpz/NcMhxtMSV.097z83Dt1vOIQ31OMcPFZmg9POsZG32";
const DEFAULT_ADMIN_LOGIN_USER = "admin";
const DEFAULT_ADMIN_LOGIN_PASSWORD_HASH = "$2a$10$xakrn/.5AguYcNNKLFN9ceLrT3WCps9pz6mO17/Utu3N4HKJVMcS6";

const commonSelectorProfiles = [
  "FINANCEIRO",
  "COBRADOR_ATENDENTE",
  "DIRETORA_COBRANCA",
  "DIRETOR_GERAL",
  "ATENDENTE"
];

const adminSelectorProfiles = ["ADMIN"];

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

function sanitizeSelectorUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    company_id: user.company_id,
    theme_mode: user.theme_mode,
    pin_set: Boolean(user.pin_set)
  };
}

function isValidThemeMode(themeMode) {
  return themeMode === "light" || themeMode === "dark";
}

function normalizeMode(mode) {
  return mode === "admin" ? "admin" : "common";
}

function getSelectorSecret() {
  return `${getJwtSecret()}:selector`;
}

function createSelectorToken(mode) {
  const normalizedMode = normalizeMode(mode);

  return jwt.sign(
    {
      token_type: SELECTOR_TOKEN_TYPE,
      mode: normalizedMode
    },
    getSelectorSecret(),
    {
      subject: `selector:${normalizedMode}`,
      expiresIn: SELECTOR_TOKEN_TTL
    }
  );
}

function createUserToken(user) {
  return jwt.sign(
    {
      profile: user.profile,
      user_id: user.id
    },
    getJwtSecret(),
    {
      subject: String(user.id),
      expiresIn: NORMAL_TOKEN_TTL
    }
  );
}

function readBearerToken(request) {
  const authorization = request.headers.authorization || "";

  if (authorization.startsWith("Bearer ")) {
    return authorization.slice(7).trim();
  }

  return "";
}

function readSelectorToken(request) {
  const bearerToken = readBearerToken(request);

  if (bearerToken) {
    return bearerToken;
  }

  if (request.query.selector_token) {
    return String(request.query.selector_token);
  }

  if (request.body && request.body.selector_token) {
    return String(request.body.selector_token);
  }

  return "";
}

function validateSelectorTokenValue(selectorToken) {
  if (!selectorToken) {
    const error = new Error("Sessao de selecao expirada.");
    error.statusCode = 401;
    throw error;
  }

  try {
    const decoded = jwt.verify(selectorToken, getSelectorSecret());

    if (decoded.token_type !== SELECTOR_TOKEN_TYPE) {
      const error = new Error("Sessao de selecao expirada.");
      error.statusCode = 401;
      throw error;
    }

    return {
      mode: normalizeMode(decoded.mode)
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    const wrappedError = new Error("Sessao de selecao expirada.");
    wrappedError.statusCode = 401;
    throw wrappedError;
  }
}

function profilesForMode(mode) {
  return normalizeMode(mode) === "admin" ? adminSelectorProfiles : commonSelectorProfiles;
}

function canUserLoginInMode(user, mode) {
  return profilesForMode(mode).includes(user.profile);
}

async function getSettingValue(key, fallback) {
  const result = await query(
    `SELECT value
     FROM app_settings
     WHERE key = $1`,
    [key]
  );

  if (result.rowCount === 0 || result.rows[0].value === null || result.rows[0].value === undefined) {
    return fallback;
  }

  return result.rows[0].value;
}

async function validateGeneralLogin(username, password, mode) {
  const normalizedUsername = String(username || "").trim();
  const normalizedPassword = String(password || "");
  const normalizedMode = normalizeMode(mode);

  if (!normalizedUsername || !normalizedPassword) {
    return false;
  }

  const userKey = normalizedMode === "admin" ? "admin_login_user" : "general_login_user";
  const passwordKey = normalizedMode === "admin" ? "admin_login_password_hash" : "general_login_password_hash";
  const defaultUser = normalizedMode === "admin" ? DEFAULT_ADMIN_LOGIN_USER : DEFAULT_GENERAL_LOGIN_USER;
  const defaultPasswordHash = normalizedMode === "admin" ? DEFAULT_ADMIN_LOGIN_PASSWORD_HASH : DEFAULT_GENERAL_LOGIN_PASSWORD_HASH;

  const storedUser = await getSettingValue(userKey, defaultUser);
  const storedPasswordHash = await getSettingValue(passwordKey, defaultPasswordHash);

  if (normalizedUsername !== storedUser) {
    return false;
  }

  return bcrypt.compare(normalizedPassword, storedPasswordHash);
}

async function listSelectorUsers(mode) {
  const profiles = profilesForMode(mode);

  const result = await query(
    `SELECT id, name, email, profile, company_id, theme_mode, pin_set
     FROM users
     WHERE profile = ANY($1::text[])
     ORDER BY
       CASE profile
         WHEN 'ADMIN' THEN 1
         WHEN 'DIRETOR_GERAL' THEN 2
         WHEN 'FINANCEIRO' THEN 3
         WHEN 'COBRADOR_ATENDENTE' THEN 4
         WHEN 'DIRETORA_COBRANCA' THEN 5
         WHEN 'ATENDENTE' THEN 6
         ELSE 7
       END,
       id ASC`,
    [profiles]
  );

  return result.rows.map(sanitizeSelectorUser);
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

router.post("/general-login", async (request, response, next) => {
  try {
    const mode = normalizeMode(request.body.mode);

    if (mode !== "common") {
      return response.status(401).json({
        message: "Credenciais invalidas"
      });
    }

    const valid = await validateGeneralLogin(request.body.username, request.body.password, "common");

    if (!valid) {
      return response.status(401).json({
        message: "Credenciais invalidas"
      });
    }

    return response.json({
      success: true,
      selector_token: createSelectorToken("common"),
      mode: "common"
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/admin-general-login", async (request, response, next) => {
  try {
    const valid = await validateGeneralLogin(request.body.username, request.body.password, "admin");

    if (!valid) {
      return response.status(401).json({
        message: "Credenciais invalidas"
      });
    }

    return response.json({
      success: true,
      selector_token: createSelectorToken("admin"),
      mode: "admin"
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/selector-users", async (request, response, next) => {
  try {
    const requestedMode = normalizeMode(request.query.mode);
    const selectorToken = readSelectorToken(request);
    const selectorSession = validateSelectorTokenValue(selectorToken);

    if (selectorSession.mode !== requestedMode) {
      return response.status(401).json({
        message: "Sessao de selecao expirada."
      });
    }

    const users = await listSelectorUsers(requestedMode);

    return response.json({
      users,
      mode: requestedMode
    });
  } catch (error) {
    if (error.statusCode) {
      return response.status(error.statusCode).json({
        message: error.message
      });
    }

    return next(error);
  }
});

router.post("/pin-login", async (request, response, next) => {
  try {
    const selectorToken = String(request.body.selector_token || "");
    const selectorSession = validateSelectorTokenValue(selectorToken);
    const userId = Number(request.body.user_id);
    const pin = String(request.body.pin || "");

    if (!Number.isInteger(userId) || userId <= 0 || !pin) {
      return response.status(401).json({
        message: "PIN invalido"
      });
    }

    const result = await query(
      `SELECT id, name, email, profile, company_id, theme_mode, pin_hash, pin_set
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      return response.status(401).json({
        message: "PIN invalido"
      });
    }

    const user = result.rows[0];

    if (!canUserLoginInMode(user, selectorSession.mode)) {
      return response.status(401).json({
        message: "PIN invalido"
      });
    }

    if (!user.pin_hash) {
      return response.status(401).json({
        message: "PIN invalido"
      });
    }

    const pinMatches = await bcrypt.compare(pin, user.pin_hash);

    if (!pinMatches) {
      return response.status(401).json({
        message: "PIN invalido"
      });
    }

    const token = createUserToken(user);

    return response.json({
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    if (error.statusCode) {
      return response.status(error.statusCode).json({
        message: error.message
      });
    }

    return next(error);
  }
});

router.post("/login", async (request, response, next) => {
  try {
    const userId = Number(request.body.user_id);
    const password = String(request.body.password || "");

    if (!Number.isInteger(userId) || userId <= 0) {
      return response.status(400).json({
        message: "Selecione um usuario valido."
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
        message: "Usuario ou senha invalidos."
      });
    }

    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return response.status(401).json({
        message: "Usuario ou senha invalidos."
      });
    }

    const token = createUserToken(user);

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

router.post("/change-pin", authRequired, async (request, response, next) => {
  try {
    const currentPin = String(request.body.current_pin || "");
    const newPin = String(request.body.new_pin || "");

    if (!currentPin || !newPin) {
      return response.status(400).json({
        message: "Informe o PIN atual e o novo PIN."
      });
    }

    if (!/^\d{4,8}$/.test(newPin)) {
      return response.status(400).json({
        message: "O novo PIN deve conter de 4 a 8 digitos numericos."
      });
    }

    const userResult = await query(
      `SELECT id, pin_hash
       FROM users
       WHERE id = $1`,
      [request.user.id]
    );

    if (userResult.rowCount === 0) {
      return response.status(404).json({
        message: "Usuario nao encontrado."
      });
    }

    const user = userResult.rows[0];
    const pinMatches = user.pin_hash ? await bcrypt.compare(currentPin, user.pin_hash) : false;

    if (!pinMatches) {
      return response.status(401).json({
        message: "PIN invalido"
      });
    }

    const pinHash = await bcrypt.hash(newPin, 10);

    await query(
      `UPDATE users
       SET pin_hash = $2,
           pin_set = true,
           updated_at = now()
       WHERE id = $1`,
      [request.user.id, pinHash]
    );

    return response.json({
      success: true,
      message: "PIN alterado com sucesso."
    });
  } catch (error) {
    return next(error);
  }
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
        message: "Usuario nao encontrado."
      });
    }

    const passwordMatches = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);

    if (!passwordMatches) {
      return response.status(401).json({
        message: "Senha atual invalida."
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
        message: "Informe o nome do usuario."
      });
    }

    if (!isValidThemeMode(themeMode)) {
      return response.status(400).json({
        message: "Tema invalido. Use light ou dark."
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
