const jwt = require("jsonwebtoken");
const { query } = require("../db");

function getJwtSecret() {
  return process.env.JWT_SECRET || "controlfin_local_development_secret";
}

function readBearerToken(request) {
  const authorization = request.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

async function authRequired(request, response, next) {
  try {
    const token = readBearerToken(request);

    if (!token) {
      return response.status(401).json({
        message: "Token de autenticação não informado."
      });
    }

    let payload;

    try {
      payload = jwt.verify(token, getJwtSecret());
    } catch (error) {
      return response.status(401).json({
        message: "Token de autenticação inválido ou expirado."
      });
    }

    if (payload.token_type && payload.token_type !== "user") {
      return response.status(401).json({
        message: "Token de autenticação inválido ou expirado."
      });
    }

    const userId = Number(payload.sub || payload.user_id || payload.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return response.status(401).json({
        message: "Token de autenticação sem usuário válido."
      });
    }

    const result = await query(
      `SELECT id, name, email, profile, company_id, theme_mode, COALESCE(sidebar_mode, 'fixed') AS sidebar_mode
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      return response.status(401).json({
        message: "Usuário autenticado não encontrado."
      });
    }

    request.user = result.rows[0];
    return next();
  } catch (error) {
    return next(error);
  }
}

function allowRoles() {
  const roles = Array.prototype.slice.call(arguments);

  return function allowRolesMiddleware(request, response, next) {
    if (!request.user) {
      return response.status(401).json({
        message: "Autenticação obrigatória."
      });
    }

    if (request.user.profile === "ADMIN") {
      return next();
    }

    if (roles.includes(request.user.profile)) {
      return next();
    }

    return response.status(403).json({
      message: "Você não possui permissão para acessar este recurso."
    });
  };
}

module.exports = {
  authRequired,
  allowRoles,
  getJwtSecret
};
