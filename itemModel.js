const { pool } = require('./db');

class Item {
  // Create a new item
  static async create(sellerID, title, description, price, category, condition, imageUrl) {
    try {
      const [result] = await pool.execute(
        'INSERT INTO items (seller_id, title, description, price, category, `condition`, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [sellerID, title, description, price, category, condition, imageUrl]
      );
      
      return result.insertId;
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }
  
  // Get all items
  static async getAll() {
    try {
      const [rows] = await pool.execute(
        'SELECT i.*, u.username as seller_name FROM items i JOIN users u ON i.seller_id = u.id'
      );
      
      return rows;
    } catch (error) {
      console.error('Error getting all items:', error);
      throw error;
    }
  }
  
  // Get item by ID
  static async getById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT i.*, u.username as seller_name FROM items i JOIN users u ON i.seller_id = u.id WHERE i.id = ?',
        [id]
      );
      
      return rows.length ? rows[0] : null;
    } catch (error) {
      console.error('Error getting item by ID:', error);
      throw error;
    }
  }
  
  // Get items by seller ID
  static async getBySellerId(sellerId) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM items WHERE seller_id = ?',
        [sellerId]
      );
      
      return rows;
    } catch (error) {
      console.error('Error getting items by seller ID:', error);
      throw error;
    }
  }
  
  // Get items by category
  static async getByCategory(category) {
    try {
      const [rows] = await pool.execute(
        'SELECT i.*, u.username as seller_name FROM items i JOIN users u ON i.seller_id = u.id WHERE i.category = ?',
        [category]
      );
      
      return rows;
    } catch (error) {
      console.error('Error getting items by category:', error);
      throw error;
    }
  }
  
  // Search items by title or description
  static async search(query) {
    try {
      const searchQuery = `%${query}%`;
      const [rows] = await pool.execute(
        'SELECT i.*, u.username as seller_name FROM items i JOIN users u ON i.seller_id = u.id WHERE i.title LIKE ? OR i.description LIKE ?',
        [searchQuery, searchQuery]
      );
      
      return rows;
    } catch (error) {
      console.error('Error searching items:', error);
      throw error;
    }
  }
  
  // Update an item
  static async update(id, title, description, price, category, condition, imageUrl) {
    try {
      const [result] = await pool.execute(
        'UPDATE items SET title = ?, description = ?, price = ?, category = ?, `condition` = ?, image_url = ? WHERE id = ?',
        [title, description, price, category, condition, imageUrl, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }
  
  // Delete an item
  static async delete(id) {
    try {
      const [result] = await pool.execute(
        'DELETE FROM items WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }
}

module.exports = Item;