const { pool } = require('./db');

class Cart {
  // Add item to cart
  static async addItem(userId, itemId, quantity = 1) {
    try {
      // Check if item already exists in cart
      const [existingItems] = await pool.execute(
        'SELECT * FROM cart WHERE user_id = ? AND item_id = ?',
        [userId, itemId]
      );
      
      if (existingItems.length > 0) {
        // Update quantity if item already in cart
        const newQuantity = existingItems[0].quantity + quantity;
        const [result] = await pool.execute(
          'UPDATE cart SET quantity = ? WHERE user_id = ? AND item_id = ?',
          [newQuantity, userId, itemId]
        );
        
        return result.affectedRows > 0;
      } else {
        // Add new item to cart
        const [result] = await pool.execute(
          'INSERT INTO cart (user_id, item_id, quantity) VALUES (?, ?, ?)',
          [userId, itemId, quantity]
        );
        
        return result.insertId;
      }
    } catch (error) {
      console.error('Error adding item to cart:', error);
      throw error;
    }
  }
  
  // Get cart items for user
  static async getItems(userId) {
    try {
      const [rows] = await pool.execute(
        `SELECT c.id as cart_id, c.quantity, i.*, i.price * c.quantity as total_price 
         FROM cart c 
         JOIN items i ON c.item_id = i.id 
         WHERE c.user_id = ?`,
        [userId]
      );
      
      return rows;
    } catch (error) {
      console.error('Error getting cart items:', error);
      throw error;
    }
  }
  
  // Update item quantity in cart
  static async updateQuantity(userId, itemId, quantity) {
    try {
      if (quantity <= 0) {
        return this.removeItem(userId, itemId);
      }
      
      const [result] = await pool.execute(
        'UPDATE cart SET quantity = ? WHERE user_id = ? AND item_id = ?',
        [quantity, userId, itemId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating cart item quantity:', error);
      throw error;
    }
  }
  
  // Remove item from cart
  static async removeItem(userId, itemId) {
    try {
      const [result] = await pool.execute(
        'DELETE FROM cart WHERE user_id = ? AND item_id = ?',
        [userId, itemId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error removing item from cart:', error);
      throw error;
    }
  }
  
  // Clear entire cart
  static async clearCart(userId) {
    try {
      const [result] = await pool.execute(
        'DELETE FROM cart WHERE user_id = ?',
        [userId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  }
  
  // Get cart total price
  static async getTotalPrice(userId) {
    try {
      const [rows] = await pool.execute(
        `SELECT SUM(i.price * c.quantity) as total_price 
         FROM cart c 
         JOIN items i ON c.item_id = i.id 
         WHERE c.user_id = ?`,
        [userId]
      );
      
      return rows[0].total_price || 0;
    } catch (error) {
      console.error('Error calculating cart total price:', error);
      throw error;
    }
  }
}

module.exports = Cart;