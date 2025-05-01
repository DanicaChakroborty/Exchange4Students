/**
 * User Model for Student Marketplace
 * 
 * This file contains the User class with static methods to
 * interact with the users table in the database.
 */

const { pool } = require('./db');
const bcrypt = require('bcrypt');

class User {
  // Create a new user
  static async create(username, password, email, role) {
    try {
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Insert the user into the database
      const [result] = await pool.execute(
        'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, email, role]
      );
      
      return result.insertId;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  // Find user by username
  static async findByUsername(username) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );
      
      return rows.length ? rows[0] : null;
    } catch (error) {
      console.error('Error finding user:', error);
      throw error;
    }
  }
  
  // Find user by ID
  static async findById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      
      return rows.length ? rows[0] : null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }
  
  // Find user by email
  static async findByEmail(email) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      
      return rows.length ? rows[0] : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }
  
  // Authenticate user
  static async authenticate(username, password) {
    try {
      const user = await this.findByUsername(username);
      
      if (!user) {
        return null; // User not found
      }
      
      // Compare passwords
      const match = await bcrypt.compare(password, user.password);
      
      return match ? user : null;
    } catch (error) {
      console.error('Error authenticating user:', error);
      throw error;
    }
  }
  
  // Update user role
  static async updateRole(userId, role) {
    try {
      const [result] = await pool.execute(
        'UPDATE users SET role = ? WHERE id = ?',
        [role, userId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }
  
  // Update user profile
  static async updateProfile(userId, email) {
    try {
      const [result] = await pool.execute(
        'UPDATE users SET email = ? WHERE id = ?',
        [email, userId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
  
  // Update user password
  static async updatePassword(userId, newPassword) {
    try {
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      const [result] = await pool.execute(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, userId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating user password:', error);
      throw error;
    }
  }
  
  // Get all users (admin function)
  static async getAll() {
    try {
      const [rows] = await pool.execute(
        'SELECT id, username, email, role, created_at FROM users'
      );
      
      return rows;
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }
}

module.exports = User;