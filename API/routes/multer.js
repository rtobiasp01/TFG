const express = require("express");
const router = express.Router();
const upload = require("../services/multer-service");

const fs = require("fs").promises;
const path = require("path");

const UPLOADS_DIR = path.resolve("uploads");

router.post("/", upload.single("archivo"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No se seleccionó ningún archivo.");
  }
  res.send({
    message: "¡Archivo subido con éxito!",
    fileDetails: req.file,
  });
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
        message: `El archivo ${safeFilename} ha sido eliminado con éxito.` 
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