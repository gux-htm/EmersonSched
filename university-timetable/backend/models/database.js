const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'university_timetable',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  charset: 'utf8mb4'
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    
    // Test query to verify tables exist
    const [rows] = await connection.execute('SHOW TABLES');
    console.log(`📋 Found ${rows.length} tables in database`);
    
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('💡 Database does not exist. Please create it first:');
      console.log('   1. Start MySQL server');
      console.log('   2. Run: mysql -u root -p');
      console.log('   3. Execute: CREATE DATABASE university_timetable;');
      console.log('   4. Import schema: mysql -u root -p university_timetable < database/schema.sql');
    }
    
    return false;
  }
}

// Initialize database connection
testConnection();

// Database helper functions
class Database {
  static async query(sql, params = []) {
    try {
      const [rows] = await pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }
  
  static async queryOne(sql, params = []) {
    try {
      const [rows] = await pool.execute(sql, params);
      return rows[0] || null;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }
  
  static async transaction(callback) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  static async insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    
    try {
      const [result] = await pool.execute(sql, values);
      return result;
    } catch (error) {
      console.error('Database insert error:', error);
      throw error;
    }
  }
  
  static async update(table, data, where, whereParams = []) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`;
    
    try {
      const [result] = await pool.execute(sql, [...values, ...whereParams]);
      return result;
    } catch (error) {
      console.error('Database update error:', error);
      throw error;
    }
  }
  
  static async delete(table, where, whereParams = []) {
    const sql = `DELETE FROM ${table} WHERE ${where}`;
    
    try {
      const [result] = await pool.execute(sql, whereParams);
      return result;
    } catch (error) {
      console.error('Database delete error:', error);
      throw error;
    }
  }
  
  static async findById(table, id, idColumn = 'id') {
    const sql = `SELECT * FROM ${table} WHERE ${idColumn} = ?`;
    return await this.queryOne(sql, [id]);
  }
  
  static async findAll(table, where = '', whereParams = [], orderBy = '') {
    let sql = `SELECT * FROM ${table}`;
    if (where) sql += ` WHERE ${where}`;
    if (orderBy) sql += ` ORDER BY ${orderBy}`;
    
    return await this.query(sql, whereParams);
  }
  
  static async count(table, where = '', whereParams = []) {
    let sql = `SELECT COUNT(*) as count FROM ${table}`;
    if (where) sql += ` WHERE ${where}`;
    
    const result = await this.queryOne(sql, whereParams);
    return result ? result.count : 0;
  }
  
  static async exists(table, where, whereParams = []) {
    const count = await this.count(table, where, whereParams);
    return count > 0;
  }
}

// Export both pool and Database class
module.exports = {
  pool,
  Database,
  testConnection
};