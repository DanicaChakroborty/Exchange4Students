/**
 * Database connection file for Student Marketplace
 * 
 * This file creates a MySQL connection pool and exports it
 * along with a function to test the database connection.
 */

const mysql = require('mysql2/promise');

// Create a pool for database connections
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',           
  password: 'Parappa325Jungle!',   
  database: 'student_marketplace',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection successful');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Export the pool and test function
module.exports = {
  pool,
  testConnection
};