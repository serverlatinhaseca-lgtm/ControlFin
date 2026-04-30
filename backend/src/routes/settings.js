const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { query } = require("../db");
const { authRequired, allowRoles } = require("../middleware/auth");

const router = express.Router();
const uploadsDir = path.join(process.cwd(), "uploads");
const maxLogoSizeBytes = 2 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"]);
const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function destination(request, file, callback) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    callback(null, uploadsDir);
  },
  filename: function filename(request, file, callback) {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeExtension = allowedExtensions.has(extension) ? extension : "";
    const uniquePart = `${Date.now()}-${crypto.randomBytes(12).toString("hex")}`;
    callback(null, `logo-${uniquePart}${safeExtension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: maxLogoSizeBytes,
    files: 1
  },
  fileFilter: function fileFilter(request, file, callback) {
    const extension = path.extname(file.originalname || "").toLowerCase();

    if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(extension)) {
      const error = new Error("Arquivo de logo inválido. Envie png, jpg, jpeg, webp ou svg.");
      error.statusCode = 400;
      return callback(error);
    }

    return callback(null, true);
  }
});

function publicBrandingFromRows(rows) {
  const values = {
    site_name: "ControlFin",
    site_logo_url: "",
    site_favicon_url: "",
    default_light_theme: "brown"
  };

  rows.forEach((row) => {
    if (Object.prototype.hasOwnProperty.call(values, row.key)) {
      values[row.key] = row.value || "";
    }
  });

  return values;
}

async function getPublicBranding() {
  const result = await query(
    `SELECT key, value
     FROM app_settings
     WHERE key = ANY($1::text[])`,
    [["site_name", "site_logo_url", "site_favicon_url", "default_light_theme"]]
  );

  return publicBrandingFromRows(result.rows);
}

async function upsertSetting(key, value, isSecret) {
  await query(
    `INSERT INTO app_settings (key, value, is_secret, created_at, updated_at)
     VALUES ($1, $2, $3, now(), now())
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value,
         is_secret = EXCLUDED.is_secret,
         updated_at = now()`,
    [key, value, Boolean(isSecret)]
  );
}

function runLogoUpload(request, response) {
  return new Promise((resolve, reject) => {
    upload.single("file")(request, response, (error) => {
      if (error) {
        if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
          const sizeError = new Error("A logo deve ter no máximo 2MB.");
          sizeError.statusCode = 400;
          reject(sizeError);
          return;
        }

        reject(error);
        return;
      }

      resolve();
    });
  });
}

router.get("/public", async (request, response, next) => {
  try {
    const branding = await getPublicBranding();
    return response.json(branding);
  } catch (error) {
    return next(error);
  }
});

router.get("/", authRequired, async (request, response, next) => {
  try {
    const branding = await getPublicBranding();

    if (request.user.profile !== "ADMIN") {
      return response.json({
        branding
      });
    }

    const settingsResult = await query(
      `SELECT key, value, is_secret, created_at, updated_at
       FROM app_settings
       ORDER BY key ASC`,
      []
    );

    const settings = settingsResult.rows.map((row) => ({
      key: row.key,
      value: row.is_secret ? null : row.value,
      is_secret: row.is_secret,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    return response.json({
      branding,
      settings
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/branding", authRequired, allowRoles("ADMIN"), async (request, response, next) => {
  try {
    const siteName = String(request.body.site_name || "").trim();

    if (!siteName) {
      return response.status(400).json({
        message: "Informe o nome do site."
      });
    }

    if (siteName.length > 80) {
      return response.status(400).json({
        message: "O nome do site deve ter no máximo 80 caracteres."
      });
    }

    await upsertSetting("site_name", siteName, false);
    const branding = await getPublicBranding();

    return response.json({
      success: true,
      branding
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/logo", authRequired, allowRoles("ADMIN"), async (request, response, next) => {
  try {
    await runLogoUpload(request, response);

    if (!request.file) {
      return response.status(400).json({
        message: "Envie um arquivo de logo."
      });
    }

    const publicUrl = `/api/uploads/${request.file.filename}`;

    await query(
      `INSERT INTO uploaded_files (original_name, filename, mime_type, size_bytes, public_url, uploaded_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [request.file.originalname, request.file.filename, request.file.mimetype, request.file.size, publicUrl, request.user.id]
    );

    await upsertSetting("site_logo_url", publicUrl, false);
    await upsertSetting("site_favicon_url", publicUrl, false);

    return response.json({
      success: true,
      site_logo_url: publicUrl,
      site_favicon_url: publicUrl
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

module.exports = router;
