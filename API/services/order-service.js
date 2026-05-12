const connectDB = require('../db/mongo');
const { ObjectId } = require('mongodb');
const Order = require('../models/order');
const productService = require('./product-service');

class OrderService {
  async createOrder(userId, items, total, shippingAddress = {}, couponCode = null, discount = 0) {
    try {
      const db = await connectDB();
      const order = new Order(
        new ObjectId(userId),
        items,
        total,
        'pendiente',
        shippingAddress,
        couponCode,
        discount
      );
      
      const collection = db.collection('orders');
      const result = await collection.insertOne(order);
      
      return { _id: result.insertedId, ...order };
    } catch (error) {
      throw new Error(`Error creating order: ${error.message}`);
    }
  }

  async getOrderById(orderId) {
    try {
      const db = await connectDB();
      const collection = db.collection('orders');
      const order = await collection.findOne({ _id: new ObjectId(orderId) });
      return order;
    } catch (error) {
      throw new Error(`Error fetching order: ${error.message}`);
    }
  }

  async getOrdersByUserId(userId) {
    try {
      const db = await connectDB();
      const collection = db.collection('orders');
      const orders = await collection.find({ user_id: new ObjectId(userId) }).sort({ createdAt: -1 }).toArray();
      return orders;
    } catch (error) {
      throw new Error(`Error fetching user orders: ${error.message}`);
    }
  }

  async getAllOrders() {
    try {
      const db = await connectDB();
      const collection = db.collection('orders');
      const orders = await collection.find({}).sort({ createdAt: -1 }).toArray();
      return orders;
    } catch (error) {
      throw new Error(`Error fetching all orders: ${error.message}`);
    }
  }

  async updateOrderStatus(orderId, newStatus) {
    try {
      const db = await connectDB();
      const collection = db.collection('orders');
      
      const validStatuses = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error('Invalid order status');
      }

      const result = await collection.updateOne(
        { _id: new ObjectId(orderId) },
        { $set: { status: newStatus, updatedAt: new Date() } }
      );

      if (result.matchedCount === 0) {
        throw new Error('Order not found');
      }

      return await this.getOrderById(orderId);
    } catch (error) {
      throw new Error(`Error updating order status: ${error.message}`);
    }
  }

  async cancelOrder(orderId, userId) {
    try {
      const db = await connectDB();
      const collection = db.collection('orders');

      const order = await collection.findOne({ _id: new ObjectId(orderId) });

      if (!order) {
        throw new Error('Order not found');
      }

      // Verify ownership
      if (order.user_id && order.user_id.toString() !== new ObjectId(userId).toString()) {
        throw new Error('Unauthorized');
      }

      // Only allow cancel if currently pendiente
      if (order.status !== 'pendiente') {
        throw new Error('Only pending orders can be cancelled');
      }

      // Restore stock for each item
      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          try {
            const productIdValue = item.product_id && typeof item.product_id.toString === 'function'
              ? item.product_id.toString()
              : item.product_id;

            await productService.incrementOrderItemStock({
              productId: productIdValue,
              productSku: item.simpleSku || item.productSku,
              variantSku: item.variantSku,
              selection: item.selection || {},
              quantity: item.quantity || 1,
            });
          } catch (err) {
            console.error('Error restoring stock for cancelled order item:', err);
          }
        }
      }

      // Update order status to cancelado
      await collection.updateOne(
        { _id: new ObjectId(orderId) },
        { $set: { status: 'cancelado', updatedAt: new Date() } }
      );

      return await this.getOrderById(orderId);
    } catch (error) {
      throw new Error(`Error cancelling order: ${error.message}`);
    }
  }

  async deleteOrder(orderId) {
    try {
      const db = await connectDB();
      const collection = db.collection('orders');
      const result = await collection.deleteOne({ _id: new ObjectId(orderId) });

      if (result.deletedCount === 0) {
        throw new Error('Order not found');
      }

      return { message: 'Order deleted successfully' };
    } catch (error) {
      throw new Error(`Error deleting order: ${error.message}`);
    }
  }
}

module.exports = new OrderService();
