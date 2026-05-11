const express = require("express");
const couponService = require("../services/coupon-service");
const Coupon = require("../models/coupon");

const router = express.Router();

// Crear nuevo cupón
router.post("/", async (req, res) => {
  try {
    const coupon = new Coupon(req.body);
    const createdCoupon = await couponService.createCoupon(coupon);

    res.status(201).json({
      success: true,
      message: "Cupón creado correctamente",
      data: createdCoupon,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error al crear el cupón",
      error: error.message,
    });
  }
});

// Obtener todos los cupones
router.get("/", async (req, res) => {
  try {
    const coupons = await couponService.getAllCoupons();
    res.json(coupons);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error al obtener cupones",
    });
  }
});

// Obtener cupón por ID
router.get("/:couponId", async (req, res) => {
  try {
    const { couponId } = req.params;
    const coupon = await couponService.getCouponById(couponId);
    res.json(coupon);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Validar cupón por código
router.get("/validate/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const coupon = await couponService.getCouponByCode(code);
    res.json({
      success: true,
      message: "Cupón válido",
      data: coupon,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Actualizar cupón
router.put("/:couponId", async (req, res) => {
  try {
    const { couponId } = req.params;
    const updatedCoupon = await couponService.updateCoupon(couponId, req.body);

    res.json({
      success: true,
      message: "Cupón actualizado correctamente",
      data: updatedCoupon,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error al actualizar el cupón",
      error: error.message,
    });
  }
});

// Eliminar cupón
router.delete("/:couponId", async (req, res) => {
  try {
    const { couponId } = req.params;
    const result = await couponService.deleteCoupon(couponId);

    res.json({
      success: true,
      message: "Cupón eliminado correctamente",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error al eliminar el cupón",
      error: error.message,
    });
  }
});

// Incrementar uso del cupón
router.post("/:code/use", async (req, res) => {
  try {
    const { code } = req.params;
    const result = await couponService.incrementCouponUse(code);

    res.json({
      success: true,
      message: "Uso del cupón incrementado",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error al registrar el uso del cupón",
      error: error.message,
    });
  }
});

module.exports = router;
