const express = require("express");
const middlewareAuth = require("../middlewares/authMiddleware");
const router = express.Router();
const attributeService = require("../services/attributes-service");
const { ObjectId } = require("mongodb");

router.get("/", async (req, res) => {
  try {
    const attributes = await attributeService.getAll();
    res.status(200).json(attributes);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener atributos: " + error });
  }
});

router.post("/", async (req, res) => {
  try {
    const response = await attributeService.insertOne(req.body);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: "Error al insertar atributo" + error });
  }
});

router.get("/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const attributes = await attributeService.getByName(name);

    if (!attributes || attributes.length === 0) {
      return res
        .status(404)
        .json({ message: "No se encontraron atributos con ese nombre." });
    }

    res.json(attributes);
  } catch (error) {
    console.error("Error en GET /attributes:", error);

    res
      .status(500)
      .json({ error: "Hubo un problema interno al procesar la solicitud." });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const valueToAdd = req.body.value;

  if (!ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ error: "El ID proporcionado no tiene un formato válido." });
  }

  if (valueToAdd === undefined || valueToAdd === null || valueToAdd === "") {
    return res.status(400).json({
      error: "El campo 'value' es obligatorio y no puede estar vacío.",
    });
  }

  try {
    const result = await attributeService.insertValue(id, valueToAdd);

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ error: "No se encontró el atributo con el ID especificado." });
    }

    res.json({
      message: "Valor añadido correctamente",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error en PUT /attributes:", error);
    res
      .status(500)
      .json({ error: "Hubo un problema interno al procesar la solicitud." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const response = await attributeService.deleteOne(id);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar atributo: " + error });
  }
});

module.exports = router;
