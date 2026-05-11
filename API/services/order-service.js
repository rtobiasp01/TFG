const connectDB = require('../db/mongo');
const { ObjectId } = require('mongodb');
const Order = require('../models/order');

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
