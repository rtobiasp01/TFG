const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = require("../services/multer-service");

const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");

const UPLOADS_DIR = path.resolve("uploads");
const PIXIAN_API_URL = "https://api.pixian.ai/api/v2/remove-background";
const PIXIAN_API_USER = process.env.PIXIAN_API_USER;
const PIXIAN_API_PASS = process.env.PIXIAN_API_PASS;
const PIXIAN_TEST_MODE = (process.env.PIXIAN_TEST_MODE || "true").toLowerCase() === "true";
const PIXIAN_TIMEOUT_MS = 180000;
const PIXIAN_MAX_RETRIES = 3;
const PIXIAN_INITIAL_BACKOFF_MS = 5000;
const memoryUpload = multer({ storage: multer.memoryStorage() });

/**
 * Intenta retryable con backoff exponencial
 * Reinténtelo hasta MAX_RETRIES veces para 429, con esperas de 5s, 10s, 15s, etc.
 */
async function fetchWithRetry(url, options, maxRetries = PIXIAN_MAX_RETRIES) {
  let lastError;
  let backoffMs = PIXIAN_INITIAL_BACKOFF_MS;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PIXIAN_TIMEOUT_MS);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Si es 429, espera y reintenta (excepto en el último intento)
      if (response.status === 429 && attempt < maxRetries) {
        console.warn(`Rate limited (429). Esperando ${backoffMs}ms antes de reintentar (intento ${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        backoffMs += PIXIAN_INITIAL_BACKOFF_MS; // Incremento lineal: 5s, 10s, 15s...
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      
      // Si es timeout o error de red, espera y reintenta
      if ((error.name === 'AbortError' || error.code === 'ETIMEDOUT') && attempt < maxRetries) {
        console.warn(`Timeout o error de conexión. Reintenando (intento ${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, PIXIAN_INITIAL_BACKOFF_MS));
        continue;
      }

      // Para otros errores, relanza inmediatamente
      throw error;
    }
  }

  throw lastError || new Error('Falló después de reintentos');
}

/**
 * Parsea respuesta de error JSON de Pixian de forma robusta
 */
async function parsePixianError(response) {
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
  } catch (e) {
    console.warn('No se pudo parsear error JSON de Pixian:', e);
  }
  
  // Fallback a text si no es JSON
  try {
    return { error: { message: await response.text() } };
  } catch (e) {
    return { error: { message: `HTTP ${response.status}` } };
  }
}

async function removeBackgroundWithPixian({ fileBuffer, mimetype, originalname, useDeltaPng }) {
  if (!PIXIAN_API_USER || !PIXIAN_API_PASS) {
    throw new Error("Faltan las variables de entorno PIXIAN_API_USER o PIXIAN_API_PASS.");
  }

  const formData = new FormData();
  formData.append(
    "image",
    new Blob([fileBuffer], { type: mimetype || "application/octet-stream" }),
    originalname || "image",
  );

  if (PIXIAN_TEST_MODE) {
    formData.append("test", "true");
  }
  if (useDeltaPng) {
    formData.append("format", "deltapng");
  }

  const authToken = Buffer.from(`${PIXIAN_API_USER}:${PIXIAN_API_PASS}`).toString("base64");

  const pixianResponse = await fetchWithRetry(PIXIAN_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authToken}`,
    },
    body: formData,
  });

  if (!pixianResponse.ok) {
    const errorData = await parsePixianError(pixianResponse);
    const errorMessage = errorData?.error?.message || `HTTP ${pixianResponse.status}`;

    if (pixianResponse.status === 402) {
      throw new Error(`Créditos insuficientes (402): ${errorMessage}`);
    } else if (pixianResponse.status === 429) {
      throw new Error(`Rate limit excedido (429): ${errorMessage}`);
    } else if (pixianResponse.status >= 400 && pixianResponse.status < 500) {
      throw new Error(`Error de solicitud (${pixianResponse.status}): ${errorMessage}`);
    }

    throw new Error(`Error de Pixian (${pixianResponse.status}): ${errorMessage}`);
  }

  return {
    outputBuffer: Buffer.from(await pixianResponse.arrayBuffer()),
    format: useDeltaPng ? "deltapng" : "png",
  };
}

function buildPixianErrorResponse(error) {
  let statusCode = 500;
  let errorMessage = "No se pudo eliminar el fondo de la imagen.";

  if (error.message.includes("402")) {
    statusCode = 402;
    errorMessage = "Créditos de Pixian insuficientes. Compre un paquete de créditos.";
  } else if (error.message.includes("429")) {
    statusCode = 429;
    errorMessage = "Límite de velocidad excedido. Intente más tarde.";
  } else if (error.message.includes("AbortError") || error.message.includes("timeout")) {
    errorMessage = "La solicitud excedió el tiempo máximo (180s). Intente de nuevo.";
  } else if (error.message.includes("Error de solicitud")) {
    statusCode = 400;
  }

  return {
    statusCode,
    body: {
      error: errorMessage,
      details: error.message,
      timestamp: new Date().toISOString(),
    },
  };
}

router.post("/", upload.single("archivo"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No se seleccionó ningún archivo.");
  }

  res.send({
    message: "¡Archivo subido con éxito!",
    fileDetails: req.file,
  });
});

router.post("/remove-background", upload.single("archivo"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No se seleccionó ningún archivo." });
  }

  if (!req.file.mimetype.startsWith("image/")) {
    await fs.unlink(req.file.path).catch(() => {});
    return res.status(400).json({ error: "Solo se permiten imágenes para eliminar el fondo." });
  }

  const inputFilePath = path.resolve(req.file.path);
  const useDeltaPng = req.query.format === 'deltapng'; // Permitir ?format=deltapng

  try {
    const fileBuffer = await fs.readFile(inputFilePath);
    const { outputBuffer, format } = await removeBackgroundWithPixian({
      fileBuffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      useDeltaPng,
    });

    // Determinar extensión según formato
    const fileExtension = useDeltaPng ? 'png' : 'png'; // Ambos son .png
    const outputFilename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${fileExtension}`;
    const outputPath = path.join(UPLOADS_DIR, outputFilename);

    await fs.writeFile(outputPath, outputBuffer);
    await fs.unlink(inputFilePath).catch(() => {});

    const formatUsed = useDeltaPng ? 'Delta PNG (optimizado)' : 'PNG estándar';
    return res.status(200).json({
      message: `Imagen procesada sin fondo con éxito (${formatUsed}).`,
      fileDetails: req.file,
      processedFile: outputFilename,
      processedFileUrl: `${req.protocol}://${req.get("host")}/uploads/${outputFilename}`,
      format,
    });
  } catch (error) {
    await fs.unlink(inputFilePath).catch(() => {});

    console.error("Error al eliminar el fondo de la imagen:", error.message);
    const { statusCode, body } = buildPixianErrorResponse(error);
    return res.status(statusCode).json(body);
  }
});

router.post("/remove-background-preview", memoryUpload.single("archivo"), async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: "No se seleccionó ningún archivo." });
  }

  if (!req.file.mimetype.startsWith("image/")) {
    return res.status(400).json({ error: "Solo se permiten imágenes para eliminar el fondo." });
  }

  const useDeltaPng = req.query.format === "deltapng";

  try {
    const { outputBuffer, format } = await removeBackgroundWithPixian({
      fileBuffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      useDeltaPng,
    });

    // Se devuelve en base64 para previsualizar sin persistir en disco/API.
    const previewDataUrl = `data:image/png;base64,${outputBuffer.toString("base64")}`;

    return res.status(200).json({
      message: "Vista previa sin fondo generada con éxito.",
      format,
      previewDataUrl,
      fileDetails: {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error("Error al generar vista previa sin fondo:", error.message);
    const { statusCode, body } = buildPixianErrorResponse(error);
    return res.status(statusCode).json(body);
  }
});

router.get("/", async (req, res) => {
  try {
    const files = await fs.readdir(UPLOADS_DIR);

    res.status(200).json({
      message: "Archivos recuperados con éxito",
      files: files,
    });
  } catch (error) {
    console.error("Error al leer el directorio:", error);
    res.status(500).json({ error: "Error al leer los archivos del servidor." });
  }
});

router.delete("/:filename", async (req, res) => {
  try {
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join(UPLOADS_DIR, safeFilename);

    await fs.unlink(filePath);

    res.status(200).json({
      message: `El archivo ${safeFilename} ha sido eliminado con éxito.`,
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: "Archivo no encontrado." });
    }

    console.error("Error al eliminar el archivo:", error);
    res.status(500).json({ error: "Error interno al intentar eliminar el archivo." });
  }
});

module.exports = router;