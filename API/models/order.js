class Order {
  constructor(user_id, items = [], total = 0, status = 'pendiente', shippingAddress = {}) {
    this.user_id = user_id;
    this.items = items; // Array de items del carrito
    this.total = total;
    this.status = status; // pendiente, confirmado, enviado, entregado, cancelado
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
      total: this.total,
      status: this.status,
      createdAt: this.createdAt,
    };
  }
}

module.exports = Order;
