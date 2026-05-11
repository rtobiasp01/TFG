const connectDB = require("../db/mongo");
const { ObjectId } = require("mongodb");

function normalizeCouponInput(couponData = {}) {
  return {
    code: String(couponData.code || "").trim().toUpperCase(),
    description: String(couponData.description || "").trim(),
    discountType: String(couponData.discountType || "percentage"),
    discountValue: Number(couponData.discountValue || 0),
    maxUses: couponData.maxUses !== null && couponData.maxUses !== undefined ? Number(couponData.maxUses) : null,
    currentUses: Number(couponData.currentUses || 0),
    expiryDate: couponData.expiryDate ? new Date(couponData.expiryDate) : null,
    isActive: Boolean(couponData.isActive !== false),
  };
}

function validateCouponInput(couponData = {}) {
  const normalized = normalizeCouponInput(couponData);

  if (!normalized.code) {
    throw new Error("Código de cupón requerido");
  }

  if (!normalized.description) {
    throw new Error("Descripción requerida");
  }

  if (!["percentage", "fixed"].includes(normalized.discountType)) {
    throw new Error("Tipo de descuento debe ser 'percentage' o 'fixed'");
  }

  if (normalized.discountValue <= 0) {
    throw new Error("El valor del descuento debe ser mayor a 0");
  }

  if (normalized.discountType === "percentage" && normalized.discountValue > 100) {
    throw new Error("El porcentaje de descuento no puede ser mayor a 100");
  }

  if (normalized.maxUses !== null && normalized.maxUses < 1) {
    throw new Error("El número máximo de usos debe ser mayor a 0");
  }

  if (normalized.currentUses > (normalized.maxUses || Infinity)) {
    throw new Error("Los usos actuales no pueden exceder el máximo permitido");
  }

  return normalized;
}

async function createCoupon(couponData) {
  try {
    const db = await connectDB();
    const collection = db.collection("coupons");
    const coupon = validateCouponInput(couponData);

    // Check if coupon code already exists
    const existing = await collection.findOne({ code: coupon.code });
    if (existing) {
      throw new Error("El código de cupón ya existe");
    }

    const document = {
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxUses: coupon.maxUses,
      currentUses: coupon.currentUses,
      expiryDate: coupon.expiryDate,
      isActive: coupon.isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(document);

    return { _id: result.insertedId, ...document };
  } catch (error) {
    throw new Error(`Error creando cupón: ${error.message}`);
  }
}

async function getAllCoupons() {
  try {
    const db = await connectDB();
    const collection = db.collection("coupons");
    return await collection.find({}).sort({ createdAt: -1 }).toArray();
  } catch (error) {
    throw new Error(`Error obteniendo cupones: ${error.message}`);
  }
}

async function getCouponById(couponId) {
  try {
    if (!ObjectId.isValid(couponId)) {
      throw new Error("ID de cupón inválido");
    }

    const db = await connectDB();
    const collection = db.collection("coupons");
    const coupon = await collection.findOne({ _id: new ObjectId(couponId) });

    if (!coupon) {
      throw new Error("Cupón no encontrado");
    }

    return coupon;
  } catch (error) {
    throw new Error(`Error obteniendo cupón: ${error.message}`);
  }
}

async function getCouponByCode(code) {
  try {
    if (!code) {
      throw new Error("Código de cupón requerido");
    }

    const db = await connectDB();
    const collection = db.collection("coupons");
    const coupon = await collection.findOne({ code: String(code).trim().toUpperCase() });

    if (!coupon) {
      throw new Error("Cupón no encontrado");
    }

    if (!coupon.isActive) {
      throw new Error("Cupón inactivo");
    }

    if (coupon.expiryDate && new Date() > coupon.expiryDate) {
      throw new Error("Cupón expirado");
    }

    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
      throw new Error("Cupón ya ha alcanzado el número máximo de usos");
    }

    return coupon;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function updateCoupon(couponId, couponData) {
  try {
    if (!ObjectId.isValid(couponId)) {
      throw new Error("ID de cupón inválido");
    }

    const db = await connectDB();
    const collection = db.collection("coupons");

    const coupon = validateCouponInput(couponData);

    const updateData = {
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxUses: coupon.maxUses,
      currentUses: coupon.currentUses,
      expiryDate: coupon.expiryDate,
      isActive: coupon.isActive,
      updatedAt: new Date(),
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(couponId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      throw new Error("Cupón no encontrado");
    }

    return { _id: new ObjectId(couponId), ...updateData };
  } catch (error) {
    throw new Error(`Error actualizando cupón: ${error.message}`);
  }
}

async function deleteCoupon(couponId) {
  try {
    if (!ObjectId.isValid(couponId)) {
      throw new Error("ID de cupón inválido");
    }

    const db = await connectDB();
    const collection = db.collection("coupons");
    const result = await collection.deleteOne({ _id: new ObjectId(couponId) });

    if (result.deletedCount === 0) {
      throw new Error("Cupón no encontrado");
    }

    return { success: true, message: "Cupón eliminado correctamente" };
  } catch (error) {
    throw new Error(`Error eliminando cupón: ${error.message}`);
  }
}

async function incrementCouponUse(code) {
  try {
    const db = await connectDB();
    const collection = db.collection("coupons");

    const result = await collection.updateOne(
      { code: String(code).trim().toUpperCase() },
      { $inc: { currentUses: 1 }, $set: { updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      throw new Error("Cupón no encontrado");
    }

    return { success: true, message: "Uso del cupón incrementado" };
  } catch (error) {
    throw new Error(`Error incrementando uso del cupón: ${error.message}`);
  }
}

module.exports = {
  createCoupon,
  getAllCoupons,
  getCouponById,
  getCouponByCode,
  updateCoupon,
  deleteCoupon,
  incrementCouponUse,
};
