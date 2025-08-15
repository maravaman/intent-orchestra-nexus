import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createMySQLConnection, initializeTables } from './config/database.js';
import { MemoryManager } from './services/MemoryManager.js';
import { AuthService } from './services/AuthService.js';
import { AgentManager } from './services/AgentManager.js';
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
let mysqlConnection, memoryManager, authService, agentManager, orchestrator, ollamaService;

// Initialize database connections and services
async function initializeApp() {
  try {
    logInfo('🚀 Starting Multi-Agent Backend Server...');

    // Initialize Ollama service first
    logInfo('🤖 Initializing Ollama service...');
    ollamaService = new OllamaService();
    await ollamaService.initialize();

    // Initialize database connection
    logInfo('📊 Connecting to MySQL database...');
    mysqlConnection = await createMySQLConnection();

    // Initialize database tables
    logInfo('🗄️ Initializing database tables...');
    await initializeTables(mysqlConnection);

    // Initialize services
    logInfo('🔧 Initializing services...');
    memoryManager = new MemoryManager(mysqlConnection);
    authService = new AuthService(mysqlConnection);
    agentManager = new AgentManager(mysqlConnection, memoryManager, ollamaService);
    orchestrator = new LangGraphOrchestrator(memoryManager, agentManager);
    
    // Initialize orchestrator
    await orchestrator.initialize();

    // Initialize API routes with services
    initializeServices({
      orchestrator,
      authService,
      agentManager,
      memoryManager,
      ollamaService
    });

    // Start cleanup interval for expired memory entries
    setInterval(async () => {
      try {
        await memoryManager.cleanExpiredEntries();
      } catch (error) {
        logError('Memory cleanup error:', error);
      }
    }, 60 * 60 * 1000); // Every hour

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
    message: 'Multi-Agent Backend Server with LangGraph & Ollama',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    features: [
      'LangGraph Orchestration',
      'Ollama LLM Integration',
      'Dynamic Agent Management',
      'User Authentication',
      'Memory Management (STM/LTM)',
      'Privacy Controls (GDPR)'
    ],
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout'
      },
      query: {
        runGraph: 'POST /api/run_graph'
      },
      user: {
        profile: 'GET /api/users/me',
        conversations: 'GET /api/users/:userId/conversations',
        search: 'GET /api/users/:userId/search',
        stats: 'GET /api/users/:userId/stats'
      },
      agents: {
        list: 'GET /api/agents',
        create: 'POST /api/agents',
        update: 'PUT /api/agents/:agentId',
        delete: 'DELETE /api/agents/:agentId'
      },
      system: {
        health: 'GET /api/health',
        status: 'GET /api/system/status'
      },
      privacy: {
        export: 'GET /api/privacy/export',
        delete: 'DELETE /api/privacy/delete-account'
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: '/api'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logInfo('🛑 SIGTERM received, shutting down gracefully...');
  
  try {
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
    console.log('  Authentication:');
    console.log('    POST /api/auth/register - Register new user');
    console.log('    POST /api/auth/login - User login');
    console.log('    POST /api/auth/logout - User logout');
    console.log('');
    console.log('  Query Processing:');
    console.log('    POST /api/run_graph - Main multi-agent query processing');
    console.log('');
    console.log('  User Management:');
    console.log('    GET  /api/users/me - Get user profile');
    console.log('    GET  /api/users/:userId/conversations - Get conversation history');
    console.log('    GET  /api/users/:userId/search - Search user history');
    console.log('    GET  /api/users/:userId/stats - Get user statistics');
    console.log('');
    console.log('  Agent Management:');
    console.log('    GET  /api/agents - List all agents');
    console.log('    POST /api/agents - Create new agent');
    console.log('    PUT  /api/agents/:agentId - Update agent');
    console.log('    DELETE /api/agents/:agentId - Delete agent');
    console.log('');
    console.log('  System:');
    console.log('    GET  /api/health - Health check');
    console.log('    GET  /api/system/status - System status');
    console.log('');
    console.log('  Privacy:');
    console.log('    GET  /api/privacy/export - Export user data');
    console.log('    DELETE /api/privacy/delete-account - Delete account');
    console.log('');
    console.log('🔧 Setup Instructions:');
    console.log('  1. Make sure Ollama is running: ollama serve');
    console.log('  2. Pull required model: ollama pull llama3.1:8b');
    console.log('  3. Configure MySQL database in .env file');
    console.log('  4. Register a user account via POST /api/auth/register');
    console.log('  5. Login and start querying via POST /api/run_graph');
    console.log('');
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