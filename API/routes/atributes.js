const express = require("express");
const middlewareAuth = require("../middlewares/authMiddleware");
const router = express.Router();
const atributeService = require("../services/atributes-service");

router.get("/", async (req, res) => {
    try {
        const atributes = await atributeService.getAll();
        res.status(200).json(atributes);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener atributos: " + error });
    }
});

router.post("/", async (req, res) => {
    try {
        const response = await atributeService.insertOne(req.body);
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ error: "Error al insertar atributo" + error });
    }
});

router.get("/:name", async (req, res) => {
    try {
        const atribute = await atributeService.getByName(req.params.name);
        res.status(200).json(atribute);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener atributos: " + error });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const response = await atributeService.deleteOne(id);
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar atributo: " + error });
    }
});

module.exports = router;