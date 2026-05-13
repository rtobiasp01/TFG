class Order {
  constructor(
    user_id,
    items = [],
    total = 0,
    status = 'pendiente',
    personalData = {},
    shippingAddress = {},
    couponCode = null,
    discount = 0
  ) {
    this.user_id = user_id;
    this.items = items; // Array de items del carrito
    this.subtotal = total;
    this.discount = discount || 0;
    this.total = total - discount;
    this.couponCode = couponCode || null;
    this.status = status; // pendiente, confirmado, enviado, entregado, cancelado
    this.personalData = personalData;
    this.shippingAddress = shippingAddress;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  updateStatus(newStatus) {
    const validStatuses = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'];
    if (validStatuses.includes(newStatus)) {
      this.status = newStatus;
      this.updatedAt = new Date();
      return true;
    }
    return false;
  }

  getOrderSummary() {
    return {
      user_id: this.user_id,
      itemCount: this.items.length,
      subtotal: this.subtotal,
      discount: this.discount,
      total: this.total,
      couponCode: this.couponCode,
      personalData: this.personalData,
      status: this.status,
      createdAt: this.createdAt,
    };
  }
}

module.exports = Order;
