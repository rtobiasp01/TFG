const express = require("express");
const reviewService = require("../services/review-service");
const Review = require("../models/review");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const review = new Review(req.body);
    const createdReview = await reviewService.createReview(review);

    res.status(201).json({
      success: true,
      message: "Reseña creada correctamente",
      data: createdReview,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error al crear la reseña",
      error: error.message,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const reviews = await reviewService.getAllReviews();
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener reseñas" });
  }
});

router.get("/product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await reviewService.getReviewsByProductId(productId);
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener reseñas del producto" });
  }
});

router.delete("/:reviewId", async (req, res) => {
  try {
    const { reviewId } = req.params;
    const result = await reviewService.deleteReview(reviewId);

    res.json({
      success: true,
      message: "Reseña eliminada correctamente",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error al eliminar la reseña",
      error: error.message,
    });
  }
});

module.exports = router;