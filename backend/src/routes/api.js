import express from 'express';
import Joi from 'joi';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Global services (will be initialized in server.js)
let orchestrator, authService, agentManager, memoryManager, ollamaService;

// Initialize services
export const initializeServices = (services) => {
  orchestrator = services.orchestrator;
  authService = services.authService;
  agentManager = services.agentManager;
  memoryManager = services.memoryManager;
  ollamaService = services.ollamaService;
};

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  fullName: Joi.string().max(100).optional()
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

const querySchema = Joi.object({
  query: Joi.string().min(1).max(1000).required(),
  userId: Joi.string().optional(),
  sessionId: Joi.string().optional()
});

const agentSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  type: Joi.string().valid('scenic', 'river', 'park', 'search').required(),
  description: Joi.string().max(500).optional(),
  capabilities: Joi.array().items(Joi.string()).optional(),
  keywords: Joi.array().items(Joi.string()).optional(),
  systemPrompt: Joi.string().max(2000).optional(),
  modelConfig: Joi.object().optional(),
  enabled: Joi.boolean().optional(),
  priority: Joi.number().integer().min(1).max(10).optional()
});

// Authentication Routes
router.post('/auth/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const result = await authService.register(value);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result
    });
  } catch (error) {
    console.error('[API] Registration error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const result = await authService.login(value);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    console.error('[API] Login error:', error);
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/auth/logout', authenticateToken(authService), async (req, res) => {
  try {
    const token = req.headers['authorization'].split(' ')[1];
    await authService.logout(token);
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('[API] Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// Main query processing endpoint (matches the diagram)
router.post('/run_graph', optionalAuth(authService), async (req, res) => {
  try {
    const { error, value } = querySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { query } = value;
    let { userId, sessionId } = value;

    // Use authenticated user if available, otherwise use provided IDs
    if (req.user) {
      userId = req.user.userId;
      sessionId = req.user.sessionId;
    } else if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User authentication required or userId must be provided'
      });
    }

    console.log(`[API] Processing query from user ${userId}: "${query}"`);

    const result = await orchestrator.processQuery(query, userId, sessionId);

    res.json({
      success: true,
      message: 'Query processed successfully',
      data: result
    });
  } catch (error) {
    console.error('[API] Query processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Query processing failed'
    });
  }
});

// User management routes
router.get('/users/me', authenticateToken(authService), async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('[API] Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user information'
    });
  }
});

router.get('/users/:userId/conversations', authenticateToken(authService), async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    // Check if user can access this data
    if (req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const conversations = await memoryManager.getUserConversationHistory(
      userId, 
      parseInt(limit), 
      parseInt(offset)
    );

    res.json({
      success: true,
      data: { conversations }
    });
  } catch (error) {
    console.error('[API] Get conversations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation history'
    });
  }
});

router.get('/users/:userId/search', authenticateToken(authService), async (req, res) => {
  try {
    const { userId } = req.params;
    const { q: searchTerm, limit = 50 } = req.query;

    // Check if user can access this data
    if (req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        error: 'Search term is required'
      });
    }

    const results = await memoryManager.searchUserMemory(userId, searchTerm, parseInt(limit));

    res.json({
      success: true,
      data: { results, searchTerm }
    });
  } catch (error) {
    console.error('[API] Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
});

router.get('/users/:userId/stats', authenticateToken(authService), async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user can access this data
    if (req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const stats = await memoryManager.getMemoryStats(userId);

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('[API] Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user statistics'
    });
  }
});

// Agent management routes
router.get('/agents', async (req, res) => {
  try {
    const agents = await agentManager.getAllAgents();
    
    res.json({
      success: true,
      data: { agents }
    });
  } catch (error) {
    console.error('[API] Get agents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agents'
    });
  }
});

router.post('/agents', authenticateToken(authService), async (req, res) => {
  try {
    const { error, value } = agentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const agentId = await agentManager.createAgent(value, req.user.userId);

    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      data: { agentId }
    });
  } catch (error) {
    console.error('[API] Create agent error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/agents/:agentId', authenticateToken(authService), async (req, res) => {
  try {
    const { agentId } = req.params;
    const { error, value } = agentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    await agentManager.updateAgent(agentId, value, req.user.userId);

    res.json({
      success: true,
      message: 'Agent updated successfully'
    });
  } catch (error) {
    console.error('[API] Update agent error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/agents/:agentId', authenticateToken(authService), async (req, res) => {
  try {
    const { agentId } = req.params;
    await agentManager.deleteAgent(agentId, req.user.userId);

    res.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    console.error('[API] Delete agent error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// System routes
router.get('/health', async (req, res) => {
  try {
    const orchestratorHealth = await orchestrator.healthCheck();
    const ollamaHealth = await ollamaService.isHealthy();
    
    const systemHealth = {
      status: orchestratorHealth.status === 'healthy' && ollamaHealth ? 'healthy' : 'unhealthy',
      components: {
        orchestrator: orchestratorHealth,
        ollama: {
          status: ollamaHealth ? 'healthy' : 'unhealthy',
          model: ollamaService.getModelInfo()
        },
        database: {
          status: 'healthy' // Assume healthy if we got this far
        }
      },
      timestamp: new Date()
    };

    res.json({
      success: true,
      data: systemHealth
    });
  } catch (error) {
    console.error('[API] Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      timestamp: new Date()
    });
  }
});

router.get('/system/status', async (req, res) => {
  try {
    const stats = orchestrator.getSystemStats();
    const ollamaModels = await ollamaService.getAvailableModels();
    
    res.json({
      success: true,
      data: {
        ...stats,
        ollama: {
          ...ollamaService.getModelInfo(),
          availableModels: ollamaModels
        }
      }
    });
  } catch (error) {
    console.error('[API] System status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system status'
    });
  }
});

// Privacy routes
router.get('/privacy/export', authenticateToken(authService), async (req, res) => {
  try {
    const exportData = await memoryManager.exportUserData(req.user.userId);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="user-data-${req.user.userId}-${new Date().toISOString().split('T')[0]}.json"`);
    
    res.json(exportData);
  } catch (error) {
    console.error('[API] Data export error:', error);
    res.status(500).json({
      success: false,
      error: 'Data export failed'
    });
  }
});

router.delete('/privacy/delete-account', authenticateToken(authService), async (req, res) => {
  try {
    const token = req.headers['authorization'].split(' ')[1];
    
    // Delete all user data
    await memoryManager.deleteUserData(req.user.userId);
    
    // Logout user
    await authService.logout(token);
    
    res.json({
      success: true,
      message: 'Account and all data deleted successfully'
    });
  } catch (error) {
    console.error('[API] Account deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Account deletion failed'
    });
  }
});

export default router;