const { pool } = require('./db');

class Order {
  // Create a new order from cart
  static async createFromCart(userId) {
    const connection = await pool.getConnection();
    
    try {
      // Start transaction
      await connection.beginTransaction();
      
      // Get cart items
      const [cartItems] = await connection.execute(
        `SELECT c.*, i.price, i.seller_id 
         FROM cart c 
         JOIN items i ON c.item_id = i.id 
         WHERE c.user_id = ?`,
        [userId]
      );
      
      if (cartItems.length === 0) {
        throw new Error('Cart is empty');
      }
      
      // Calculate total amount
      const totalAmount = cartItems.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);
      
      // Create order
      const [orderResult] = await connection.execute(
        'INSERT INTO orders (buyer_id, total_amount) VALUES (?, ?)',
        [userId, totalAmount]
      );
      
      const orderId = orderResult.insertId;
      
      // Add order items
      for (const item of cartItems) {
        await connection.execute(
          'INSERT INTO order_items (order_id, item_id, seller_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?, ?)',
          [orderId, item.item_id, item.seller_id, item.quantity, item.price]
        );
        
        // Create notification for seller
        await connection.execute(
          'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
          [item.seller_id, `New order received for your item. Order ID: ${orderId}`]
        );
      }
      
      // Create notification for buyer
      await connection.execute(
        'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
        [userId, `Your order #${orderId} has been placed successfully!`]
      );
      
      // Clear cart
      await connection.execute(
        'DELETE FROM cart WHERE user_id = ?',
        [userId]
      );
      
      // Commit transaction
      await connection.commit();
      
      return orderId;
    } catch (error) {
      // Rollback transaction in case of error
      await connection.rollback();
      console.error('Error creating order:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  // Get user's orders
  static async getUserOrders(userId) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM orders WHERE buyer_id = ? ORDER BY created_at DESC',
        [userId]
      );
      
      return rows;
    } catch (error) {
      console.error('Error getting user orders:', error);
      throw error;
    }
  }
  
  // Get order by ID
  static async getById(orderId) {
    try {
      const [orders] = await pool.execute(
        'SELECT * FROM orders WHERE id = ?',
        [orderId]
      );
      
      if (orders.length === 0) {
        return null;
      }
      
      const order = orders[0];
      
      // Get order items
      const [items] = await pool.execute(
        `SELECT oi.*, i.title, i.description, i.image_url 
         FROM order_items oi 
         JOIN items i ON oi.item_id = i.id 
         WHERE oi.order_id = ?`,
        [orderId]
      );
      
      order.items = items;
      
      return order;
    } catch (error) {
      console.error('Error getting order by ID:', error);
      throw error;
    }
  }
  
  // Get seller's orders
  static async getSellerOrders(sellerId) {
    try {
      const [rows] = await pool.execute(
        `SELECT DISTINCT o.id, o.buyer_id, o.total_amount, o.status, o.created_at, u.username as buyer_name
         FROM orders o 
         JOIN order_items oi ON o.id = oi.order_id 
         JOIN users u ON o.buyer_id = u.id
         WHERE oi.seller_id = ? 
         ORDER BY o.created_at DESC`,
        [sellerId]
      );
      
      // For each order, get the items that belong to this seller
      for (let order of rows) {
        const [items] = await pool.execute(
          `SELECT oi.*, i.title, i.description, i.image_url 
           FROM order_items oi 
           JOIN items i ON oi.item_id = i.id 
           WHERE oi.order_id = ? AND oi.seller_id = ?`,
          [order.id, sellerId]
        );
        
        order.items = items;
      }
      
      return rows;
    } catch (error) {
      console.error('Error getting seller orders:', error);
      throw error;
    }
  }
  
  // Update order status
  static async updateStatus(orderId, status) {
    try {
      const [result] = await pool.execute(
        'UPDATE orders SET status = ? WHERE id = ?',
        [status, orderId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }
}

module.exports = Order;