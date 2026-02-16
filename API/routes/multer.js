const express = require("express");
const router = express.Router();
const upload = require("../services/multer-service");

router.post("/", upload.single("archivo"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No se seleccionó ningún archivo.");
  }
  res.send({
    message: "¡Archivo subido con éxito!",
    fileDetails: req.file,
  });
});

module.exports = router;
