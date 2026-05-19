class Review {
  constructor({ email = "", product_id = "", message = "", rating = 0, images = [] } = {}) {
    this.email = String(email).trim();
    this.product_id = String(product_id).trim();
    this.message = String(message).trim();
    this.rating = Number(rating);
    this.images = Array.isArray(images) ? images.map((img) => String(img).trim()).filter(Boolean) : [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}

module.exports = Review;