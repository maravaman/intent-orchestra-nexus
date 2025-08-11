import mysql from 'mysql2/promise';
import redis from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// MySQL Connection (LTM)
export const createMySQLConnection = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'multiagent_ltm'
    });
    
    console.log('✅ MySQL (LTM) connected successfully');
    return connection;
  } catch (error) {
    console.error('❌ MySQL connection failed:', error);
    throw error;
  }
};

// Redis Connection (STM)
export const createRedisConnection = () => {
  try {
    const client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB || 0
    });

    client.on('error', (err) => {
      console.error('❌ Redis connection error:', err);
    });

    client.on('connect', () => {
      console.log('✅ Redis (STM) connected successfully');
    });

    return client;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    throw error;
  }
};

// Initialize Database Tables
export const initializeTables = async (connection) => {
  try {
    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255),
        session_id VARCHAR(255),
        preferences JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Conversations table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        query TEXT,
        responses JSON,
        total_execution_time INT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Memory entries table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS memory_entries (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        session_id VARCHAR(255),
        type ENUM('query', 'response', 'context'),
        content TEXT,
        metadata JSON,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};