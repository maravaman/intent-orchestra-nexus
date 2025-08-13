import express from 'express';
import { LangGraphOrchestrator } from '../services/LangGraphOrchestrator.js';
import { UserService } from '../services/UserService.js';
import { MemoryManager } from '../services/MemoryManager.js';

const router = express.Router();

// Initialize services (these will be injected by the main server)
let orchestrator, userService, memoryManager, ollamaService;

export const initializeServices = (services) => {
  orchestrator = services.orchestrator;
  userService = services.userService;
  memoryManager = services.memoryManager;
  ollamaService = services.ollamaService;
};

// Health check endpoint
router.get('/health', (req, res) => {
  const ollamaHealth = ollamaService ? ollamaService.isHealthy() : false;
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      orchestrator: !!orchestrator,
      userService: !!userService,
      memoryManager: !!memoryManager,
      ollama: ollamaHealth
    },
    ollama: ollamaService ? ollamaService.getModelInfo() : null
  });
});

// Ollama status endpoint
router.get('/ollama/status', async (req, res) => {
  try {
    if (!ollamaService) {
      return res.status(503).json({
        error: 'Ollama service not initialized'
      });
    }

    const isHealthy = await ollamaService.isHealthy();
    const modelInfo = ollamaService.getModelInfo();

    res.json({
      success: true,
      healthy: isHealthy,
      model: modelInfo
    });
  } catch (error) {
    console.error('[API] Ollama status error:', error);
    res.status(500).json({
      error: 'Failed to check Ollama status',
      message: error.message
    });
    }
  });
});

// Main query processing endpoint (matches the diagram: POST /run_graph)
router.post('/run_graph', async (req, res) => {
  try {
    const { query, userId, sessionId } = req.body;

    if (!query || !userId) {
      return res.status(400).json({
        error: 'Missing required fields: query and userId'
      });
    }

    console.log(`[API] Processing query from user ${userId}: "${query}"`);

    // Process query through LangGraph orchestrator
    const result = await orchestrator.processQuery(query, userId, sessionId);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Query processing error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// User management endpoints
router.post('/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await userService.createUser(name, email);
    
    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('[API] User creation error:', error);
    res.status(500).json({
      error: 'Failed to create user',
      message: error.message
    });
  }
});

router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await userService.getUser(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('[API] User retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve user',
      message: error.message
    });
  }
});

router.put('/users/:userId/preferences', async (req, res) => {
  try {
    const { userId } = req.params;
    const { preferences } = req.body;
    
    await userService.updateUserPreferences(userId, preferences);
    
    res.json({
      success: true,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    console.error('[API] Preference update error:', error);
    res.status(500).json({
      error: 'Failed to update preferences',
      message: error.message
    });
  }
});

router.get('/users/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = await userService.getUserStats(userId);
    
    if (!stats) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[API] User stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve user stats',
      message: error.message
    });
  }
});

// Memory management endpoints
router.get('/users/:userId/conversations', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    
    const conversations = await memoryManager.getUserConversationHistory(userId, parseInt(limit));
    
    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    console.error('[API] Conversation history error:', error);
    res.status(500).json({
      error: 'Failed to retrieve conversations',
      message: error.message
    });
  }
});

router.get('/users/:userId/search', async (req, res) => {
  try {
    const { userId } = req.params;
    const { q: searchTerm } = req.query;
    
    if (!searchTerm) {
      return res.status(400).json({
        error: 'Missing search term'
      });
    }

    const results = await memoryManager.searchUserHistory(userId, searchTerm);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('[API] Search error:', error);
    res.status(500).json({
      error: 'Failed to search history',
      message: error.message
    });
  }
});

router.get('/users/:userId/memory/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = await memoryManager.getMemoryStats(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[API] Memory stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve memory stats',
      message: error.message
    });
  }
});

// Privacy endpoints
router.get('/users/:userId/export', async (req, res) => {
  try {
    const { userId } = req.params;
    const exportData = await userService.exportUserData(userId);
    
    if (!exportData) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}-${new Date().toISOString().split('T')[0]}.json"`);
    
    res.json(exportData);
  } catch (error) {
    console.error('[API] Data export error:', error);
    res.status(500).json({
      error: 'Failed to export data',
      message: error.message
    });
  }
});

router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await userService.deleteUser(userId);
    
    res.json({
      success: true,
      message: 'User and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('[API] User deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      message: error.message
    });
  }
});

// System information endpoints
router.get('/agents', (req, res) => {
  try {
    const stats = orchestrator.getAgentStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[API] Agent stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve agent stats',
      message: error.message
    });
  }
});

router.get('/system/status', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        status: 'operational',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        agents: orchestrator.getAgentStats()
      }
    });
  } catch (error) {
    console.error('[API] System status error:', error);
    res.status(500).json({
      error: 'Failed to retrieve system status',
      message: error.message
    });
  }
});

export default router;