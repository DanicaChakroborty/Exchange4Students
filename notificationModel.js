const { pool } = require('./db');

class Notification {
  // Create a new notification
  static async create(userId, message) {
    try {
      const [result] = await pool.execute(
        'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
        [userId, message]
      );
      
      return result.insertId;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
  
  // Get user notifications
  static async getUserNotifications(userId) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      
      return rows;
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }
  
  // Get user unread notifications
  static async getUnreadNotifications(userId) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM notifications WHERE user_id = ? AND is_read = FALSE ORDER BY created_at DESC',
        [userId]
      );
      
      return rows;
    } catch (error) {
      console.error('Error getting unread notifications:', error);
      throw error;
    }
  }
  
  // Get notification by ID
  static async getById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM notifications WHERE id = ?',
        [id]
      );
      
      return rows.length ? rows[0] : null;
    } catch (error) {
      console.error('Error getting notification by ID:', error);
      throw error;
    }
  }
  
  // Mark notification as read
  static async markAsRead(id) {
    try {
      const [result] = await pool.execute(
        'UPDATE notifications SET is_read = TRUE WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }
  
  // Mark all user notifications as read
  static async markAllAsRead(userId) {
    try {
      const [result] = await pool.execute(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
        [userId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }
  
  // Delete notification
  static async delete(id) {
    try {
      const [result] = await pool.execute(
        'DELETE FROM notifications WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
}

module.exports = Notification;