const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

const { healthCheck } = require("./db");
const authRoutes = require("./routes/auth");
const setupRoutes = require("./routes/setup");
const themeRoutes = require("./routes/theme");
const usersRoutes = require("./routes/users");
const customersRoutes = require("./routes/customers");
const dashboardRoutes = require("./routes/dashboard");
const financeRoutes = require("./routes/finance");
const chargesRoutes = require("./routes/charges");
const invoicesRoutes = require("./routes/invoices");
const tasksRoutes = require("./routes/tasks");
const remindersRoutes = require("./routes/reminders");
const contazulRoutes = require("./routes/contazulAuth");
const settingsRoutes = require("./routes/settings");

const app = express();
const port = Number(process.env.PORT) || 3001;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost";
const uploadsDir = path.join(process.cwd(), "uploads");

fs.mkdirSync(uploadsDir, { recursive: true });

app.use(
  cors({
    origin: frontendUrl,
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));
app.use("/api/uploads", express.static(uploadsDir));

app.get("/api/health", async (request, response) => {
  try {
    await healthCheck();

    return response.status(200).json({
      status: "ok",
      service: "controlfin-api",
      database: "ok"
    });
  } catch (error) {
    return response.status(200).json({
      status: "ok",
      service: "controlfin-api",
      database: "unavailable"
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/setup", setupRoutes);
app.use("/api/theme", themeRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/charges", chargesRoutes);
app.use("/api/invoices", invoicesRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/reminders", remindersRoutes);
app.use("/api/contazul", contazulRoutes);
app.use("/api/settings", settingsRoutes);

app.use("/api", (request, response) => {
  return response.status(404).json({
    message: "Rota não encontrada"
  });
});

app.use((error, request, response, next) => {
  const statusCode = Number(error.statusCode || error.status || 500);
  const safeStatusCode = statusCode >= 400 && statusCode <= 599 ? statusCode : 500;
  const message = safeStatusCode === 500 ? "Erro interno do servidor." : error.message;

  console.error("[ControlFin API]", {
    message: error.message,
    stack: error.stack
  });

  return response.status(safeStatusCode).json({
    message
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`API on ${port}`);
});
