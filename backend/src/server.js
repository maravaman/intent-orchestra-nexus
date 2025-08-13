import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createMySQLConnection, initializeTables } from './config/database.js';
import { MemoryManager } from './services/MemoryManager.js';
import { UserService } from './services/UserService.js';
import { LangGraphOrchestrator } from './services/LangGraphOrchestrator.js';
import { OllamaService } from './services/OllamaService.js';
import apiRoutes, { initializeServices } from './routes/api.js';
import { 
  securityHeaders, 
  rateLimiter, 
  queryRateLimiter, 
  validateRequest, 
  errorHandler, 
  corsOptions 
} from './middleware/security.js';
import { requestLogger, logInfo, logError } from './utils/logger.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Global variables for services
let mysqlConnection, memoryManager, userService, orchestrator, ollamaService;

// Initialize database connections and services
async function initializeApp() {
  try {
    logInfo('🚀 Starting Ollama Multi-Agent Backend Server...');

    // Initialize Ollama service
    logInfo('🤖 Initializing Ollama service...');
    ollamaService = new OllamaService();
    await ollamaService.initialize();

    // Initialize database connection
    logInfo('📊 Connecting to MySQL database...');
    mysqlConnection = await createMySQLConnection();

    // Initialize database tables
    await initializeTables(mysqlConnection);

    // Initialize services
    logInfo('🔧 Initializing services...');
    memoryManager = new MemoryManager(mysqlConnection);
    userService = new UserService(mysqlConnection, memoryManager);
    orchestrator = new LangGraphOrchestrator(memoryManager);
    
    // Initialize orchestrator
    await orchestrator.initialize();

    // Initialize API routes with services
    initializeServices({
      orchestrator,
      userService,
      memoryManager,
      ollamaService
    });

    logInfo('✅ All services initialized successfully');

  } catch (error) {
    logError('❌ Failed to initialize application', error);
    process.exit(1);
  }
}

// Middleware setup
app.use(requestLogger);
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(validateRequest);
app.use(rateLimiter);

// Apply query-specific rate limiting to the main endpoint
app.use('/api/run_graph', queryRateLimiter);

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Multi-Agent Backend Server',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      runGraph: '/api/run_graph',
      users: '/api/users',
      agents: '/api/agents',
      systemStatus: '/api/system/status'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logInfo('🛑 SIGTERM received, shutting down gracefully...');
  
  try {
    if (redisClient) {
      await redisClient.quit();
      logInfo('✅ Redis connection closed');
    }
    
    if (mysqlConnection) {
      await mysqlConnection.end();
      logInfo('✅ MySQL connection closed');
    }
    
    process.exit(0);
  } catch (error) {
    logError('❌ Error during shutdown', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logInfo('🛑 SIGINT received, shutting down gracefully...');
  
  try {
    if (redisClient) {
      await redisClient.quit();
      logInfo('✅ Redis connection closed');
    }
    
    if (mysqlConnection) {
      await mysqlConnection.end();
      logInfo('✅ MySQL connection closed');
    }
    
    process.exit(0);
  } catch (error) {
    logError('❌ Error during shutdown', error);
    process.exit(1);
  }
});

// Start server
async function startServer() {
  await initializeApp();
  
  app.listen(PORT, () => {
    logInfo(`🌟 Multi-Agent Backend Server running on port ${PORT}`);
    logInfo(`📡 API Base URL: http://localhost:${PORT}/api`);
    logInfo(`🔍 Health Check: http://localhost:${PORT}/api/health`);
    logInfo(`🤖 LangGraph Endpoint: http://localhost:${PORT}/api/run_graph`);
    
    console.log('\n🎯 Available Endpoints:');
    console.log('  POST /api/run_graph - Main query processing');
    console.log('  POST /api/users - Create user');
    console.log('  GET  /api/users/:userId - Get user');
    console.log('  GET  /api/users/:userId/conversations - Get conversations');
    console.log('  GET  /api/users/:userId/search - Search history');
    console.log('  GET  /api/agents - Get agent information');
    console.log('  GET  /api/health - Health check');
    console.log('  GET  /api/system/status - System status\n');
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled Rejection at:', promise, { reason });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer().catch(error => {
  logError('Failed to start server', error);
  process.exit(1);
});

export default app;