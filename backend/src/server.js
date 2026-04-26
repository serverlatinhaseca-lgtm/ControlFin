const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3001;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost";

app.use(
  cors({
    origin: frontendUrl,
    credentials: true
  })
);

app.use(express.json());

app.get("/api/health", (request, response) => {
  response.status(200).json({
    status: "ok",
    service: "controlfin-api"
  });
});

app.get("/api/setup/status", (request, response) => {
  response.status(200).json({
    configured: false,
    contazul_configured: false
  });
});

app.use((request, response) => {
  response.status(404).json({
    message: "Rota não encontrada"
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`API on ${port}`);
});
