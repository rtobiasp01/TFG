const express = require("express");
const categoryService = require("../services/category-service");
const Category = require("../models/categories");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const categories = await categoryService.getAllCategories();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener categorías" });
  }
});

router.post("/", async (req, res) => {
  try {
    const newCategory = new Category(req.body);
    const category = await categoryService.createCategory(newCategory);

    res.status(201).json({
      success: true,
      message: "Categoría creada correctamente",
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al crear la categoría",
      error: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const category = await categoryService.getCategoryById(id);
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener categoría" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const category = await categoryService.deleteCategory(id);
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar categoría" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existingCategory = await categoryService.getCategoryById(id);
    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Categoría no encontrada",
      });
    }

    const updateData = {
      name: req.body.name,
      description: req.body.description,
      visible: req.body.visible,
    };

    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    const updatedCategory = await categoryService.updateCategory(id, updateData);

    res.json({
      success: true,
      message: "Categoría actualizada correctamente",
      data: updatedCategory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar la categoría",
      error: error.message,
    });
  }
});

module.exports = router;
