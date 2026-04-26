const express = require("express");
const axios = require("axios");
const { query } = require("../db");
const { authRequired, allowRoles } = require("../middleware/auth");
const contazulService = require("../services/contazulService");

const router = express.Router();

function parsePositiveInteger(value) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
}

function getAuthUrl() {
  return process.env.CONTAZUL_AUTH_URL || "https://auth.contaazul.com/login";
}

function getTokenUrl() {
  return process.env.CONTAZUL_TOKEN_URL || "https://auth.contaazul.com/oauth2/token";
}

function getDefaultRedirectUri() {
  return process.env.CONTAZUL_DEFAULT_REDIRECT_URI || "http://localhost/api/contazul/callback";
}

function htmlPage(title, message) {
  const safeTitle = String(title || "ControlFin").replace(/[<>]/g, "");
  const safeMessage = String(message || "").replace(/[<>]/g, "");

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: Arial, sans-serif;
      background: #ecfeff;
      color: #0f172a;
    }
    main {
      max-width: 560px;
      padding: 32px;
      border-radius: 24px;
      background: #ffffff;
      box-shadow: 0 20px 70px rgba(15, 23, 42, 0.14);
      border: 1px solid #a5f3fc;
      text-align: center;
    }
    h1 {
      margin: 0 0 16px;
      color: #0891b2;
    }
    p {
      margin: 0;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <main>
    <h1>${safeTitle}</h1>
    <p>${safeMessage}</p>
  </main>
</body>
</html>`;
}

function encodeState(payload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeState(rawState) {
  try {
    const json = Buffer.from(String(rawState || ""), "base64url").toString("utf8");
    const parsed = JSON.parse(json);

    if (!parsed || !parsePositiveInteger(parsed.company_id)) {
      return null;
    }

    return parsed;
  } catch (error) {
    return null;
  }
}

function sanitizeConnection(row) {
  return {
    company_id: row.company_id,
    company_name: row.company_name,
    client_id: row.client_id || "",
    has_client_secret: Boolean(row.client_secret),
    redirect_uri: row.redirect_uri || getDefaultRedirectUri(),
    connected: Boolean(row.connected),
    expires_at: row.expires_at,
    last_sync_at: row.last_sync_at
  };
}

router.get("/callback", async (request, response) => {
  const code = request.query.code ? String(request.query.code) : "";
  const state = decodeState(request.query.state);

  if (!code) {
    return response
      .status(400)
      .type("html")
      .send(htmlPage("ContaAzul", "Código OAuth2 não informado. Acesse pelo botão Conectar ContaAzul."));
  }

  if (!state) {
    return response
      .status(400)
      .type("html")
      .send(htmlPage("ContaAzul", "State OAuth2 inválido. Acesse novamente pelo ControlFin."));
  }

  try {
    const connection = await contazulService.getConnection(state.company_id);

    if (!connection || !connection.client_id || !connection.client_secret || !connection.redirect_uri) {
      return response
        .status(400)
        .type("html")
        .send(htmlPage("ContaAzul", "Configuração da unidade incompleta. Volte ao ControlFin e revise os dados da ContaAzul."));
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: connection.client_id,
      client_secret: connection.client_secret,
      redirect_uri: connection.redirect_uri
    });

    const tokenResponse = await axios.post(getTokenUrl(), body.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      timeout: 20000
    });

    await contazulService.updateTokens(state.company_id, tokenResponse.data || {});

    return response
      .status(200)
      .type("html")
      .send(htmlPage("ContaAzul conectada", "ContaAzul conectada com sucesso. Você já pode voltar ao ControlFin."));
  } catch (error) {
    return response
      .status(500)
      .type("html")
      .send(htmlPage("ContaAzul", "Não foi possível concluir a conexão com a ContaAzul. Volte ao ControlFin e tente novamente."));
  }
});

router.get(
  "/connections",
  authRequired,
  allowRoles("FINANCEIRO", "DIRETOR_GERAL"),
  async (request, response, next) => {
    try {
      const result = await query(
        `SELECT
           company.id AS company_id,
           company.name AS company_name,
           connection.client_id,
           connection.client_secret,
           connection.redirect_uri,
           connection.connected,
           connection.expires_at,
           connection.last_sync_at
         FROM companies company
         LEFT JOIN contazul_connections connection ON connection.company_id = company.id
         ORDER BY company.id ASC`,
        []
      );

      return response.json(result.rows.map(sanitizeConnection));
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/connections/:company_id",
  authRequired,
  allowRoles(),
  async (request, response, next) => {
    try {
      if (request.user.profile !== "ADMIN") {
        return response.status(403).json({
          message: "Apenas ADMIN pode configurar a ContaAzul."
        });
      }

      const companyId = parsePositiveInteger(request.params.company_id);
      const clientId = String(request.body.client_id || "").trim();
      const clientSecret = String(request.body.client_secret || "").trim();
      const redirectUri = String(request.body.redirect_uri || getDefaultRedirectUri()).trim();

      if (!companyId) {
        return response.status(400).json({
          message: "Unidade inválida."
        });
      }

      const companyResult = await query(
        `SELECT id, name
         FROM companies
         WHERE id = $1`,
        [companyId]
      );

      if (companyResult.rowCount === 0) {
        return response.status(404).json({
          message: "Unidade não encontrada."
        });
      }

      const result = await query(
        `INSERT INTO contazul_connections (
           company_id,
           client_id,
           client_secret,
           redirect_uri,
           connected,
           created_at,
           updated_at
         ) VALUES ($1, $2, $3, $4, false, now(), now())
         ON CONFLICT (company_id)
         DO UPDATE SET
           client_id = EXCLUDED.client_id,
           client_secret = EXCLUDED.client_secret,
           redirect_uri = EXCLUDED.redirect_uri,
           connected = false,
           access_token = NULL,
           refresh_token = NULL,
           expires_at = NULL,
           updated_at = now()
         RETURNING company_id, client_id, client_secret, redirect_uri, connected, expires_at, last_sync_at`,
        [companyId, clientId, clientSecret, redirectUri]
      );

      return response.json({
        connection: sanitizeConnection(Object.assign({}, result.rows[0], {
          company_name: companyResult.rows[0].name
        }))
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  "/auth-url",
  authRequired,
  allowRoles(),
  async (request, response, next) => {
    try {
      if (request.user.profile !== "ADMIN") {
        return response.status(403).json({
          message: "Apenas ADMIN pode iniciar a conexão ContaAzul."
        });
      }

      const companyId = parsePositiveInteger(request.query.company_id);

      if (!companyId) {
        return response.status(400).json({
          message: "Informe company_id válido."
        });
      }

      const connection = await contazulService.getConnection(companyId);

      if (!connection) {
        return response.status(404).json({
          message: "Configuração ContaAzul da unidade não encontrada."
        });
      }

      if (!connection.client_id || !connection.client_secret || !connection.redirect_uri) {
        return response.status(400).json({
          message: "Informe client_id, client_secret e redirect_uri antes de conectar."
        });
      }

      const state = encodeState({
        company_id: companyId,
        timestamp: Date.now()
      });

      const authUrl = new URL(getAuthUrl());
      authUrl.search = new URLSearchParams({
        response_type: "code",
        client_id: connection.client_id,
        redirect_uri: connection.redirect_uri,
        state,
        scope: "openid profile aws.cognito.signin.user.admin"
      }).toString();

      return response.json({
        url: authUrl.toString()
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/sync/company/:company_id",
  authRequired,
  allowRoles(),
  async (request, response, next) => {
    try {
      if (request.user.profile !== "ADMIN") {
        return response.status(403).json({
          message: "Apenas ADMIN pode sincronizar a ContaAzul."
        });
      }

      const companyId = parsePositiveInteger(request.params.company_id);

      if (!companyId) {
        return response.status(400).json({
          message: "Unidade inválida para sincronização."
        });
      }

      const result = await contazulService.syncCompany(companyId);
      return response.json(result);
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/sync/all",
  authRequired,
  allowRoles(),
  async (request, response, next) => {
    try {
      if (request.user.profile !== "ADMIN") {
        return response.status(403).json({
          message: "Apenas ADMIN pode sincronizar a ContaAzul."
        });
      }

      const result = await contazulService.syncAllCompanies();
      return response.json(result);
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
