import mysql from 'mysql2/promise';
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

    // Agents table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS agents (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        description TEXT,
        capabilities JSON,
        keywords JSON,
        system_prompt TEXT,
        enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Conversations table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        session_id VARCHAR(255),
        query TEXT,
        responses JSON,
        total_execution_time INT,
        agent_count INT,
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
        agent_id VARCHAR(255),
        relevance_score FLOAT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Agent interactions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS agent_interactions (
        id VARCHAR(255) PRIMARY KEY,
        query_id VARCHAR(255),
        agent_id VARCHAR(255),
        user_id VARCHAR(255),
        input_tokens INT,
        output_tokens INT,
        execution_time INT,
        confidence_score FLOAT,
        relevance_score FLOAT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};