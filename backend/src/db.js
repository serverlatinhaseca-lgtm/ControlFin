const { Pool } = require("pg");

function buildConnectionString() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = encodeURIComponent(process.env.POSTGRES_USER || "controlfin");
  const password = encodeURIComponent(process.env.POSTGRES_PASSWORD || "change_me_controlfin");
  const database = encodeURIComponent(process.env.POSTGRES_DB || "controlfin");
  const host = process.env.POSTGRES_HOST || "database";
  const port = process.env.POSTGRES_PORT || "5432";

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

const pool = new Pool({
  connectionString: buildConnectionString()
});

async function query(text, params) {
  return pool.query(text, params);
}

async function healthCheck() {
  const result = await query("SELECT 1 AS ok", []);
  return result.rows[0];
}

module.exports = {
  pool,
  query,
  healthCheck
};
