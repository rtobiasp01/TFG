class Coupon {
  constructor({
    code = "",
    description = "",
    discountType = "percentage",
    discountValue = 0,
    maxUses = null,
    currentUses = 0,
    expiryDate = null,
    isActive = true,
  } = {}) {
    this.code = String(code).trim().toUpperCase();
    this.description = String(description).trim();
    this.discountType = String(discountType); // "percentage" or "fixed"
    this.discountValue = Number(discountValue);
    this.maxUses = maxUses !== null ? Number(maxUses) : null;
    this.currentUses = Number(currentUses);
    this.expiryDate = expiryDate ? new Date(expiryDate) : null;
    this.isActive = Boolean(isActive);
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}

module.exports = Coupon;
