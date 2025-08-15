import { v4 as uuidv4 } from 'uuid';

export class LangGraphOrchestrator {
  constructor(memoryManager, agentManager) {
    this.memoryManager = memoryManager;
    this.agentManager = agentManager;
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('🎯 Initializing LangGraph Orchestrator...');
      
      // Initialize agent manager
      await this.agentManager.initialize();
      
      this.initialized = true;
      console.log('✅ LangGraph Orchestrator initialized successfully');
    } catch (error) {
      console.error('❌ LangGraph Orchestrator initialization failed:', error);
      throw error;
    }
  }

  async processQuery(query, userId, sessionId) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log(`[ORCHESTRATOR] Processing query for user ${userId}: "${query}"`);
      
      const startTime = Date.now();
      
      // Step 1: Analyze query and get context
      const context = await this.analyzeQuery(query, userId);
      
      // Step 2: Route to relevant agents
      const relevantAgents = await this.agentManager.routeQuery(query);
      
      if (relevantAgents.length === 0) {
        throw new Error('No agents available to process the query');
      }
      
      // Step 3: Execute agents in parallel
      const responses = await this.executeAgents(relevantAgents, query, userId, sessionId, context);
      
      // Step 4: Aggregate and store results
      const queryResult = await this.aggregateResponses(query, userId, sessionId, responses, startTime);
      
      return queryResult;
    } catch (error) {
      console.error('[ORCHESTRATOR] Query processing error:', error);
      throw error;
    }
  }

  async analyzeQuery(query, userId) {
    console.log(`[ORCHESTRATOR] Analyzing query: "${query}"`);
    
    try {
      // Get user context from memory
      const context = await this.memoryManager.getRelevantContext(userId, query, 5);
      
      console.log(`[ORCHESTRATOR] Found ${context.length} relevant context entries`);
      return context;
    } catch (error) {
      console.error('[ORCHESTRATOR] Query analysis error:', error);
      return [];
    }
  }

  async executeAgents(relevantAgents, query, userId, sessionId, context) {
    console.log(`[ORCHESTRATOR] Executing ${relevantAgents.length} agents in parallel`);
    
    const startTime = Date.now();
    
    // Execute all relevant agents in parallel
    const agentPromises = relevantAgents.map(({ agent }) =>
      agent.execute(query, userId, sessionId, context).catch(error => {
        console.error(`[ORCHESTRATOR] Agent ${agent.name} failed:`, error);
        // Return error response instead of failing completely
        return {
          agentId: agent.id,
          agentName: agent.name,
          response: `I apologize, but I encountered an error while processing your query. Please try again.`,
          confidence: 0.1,
          executionTime: Date.now() - startTime,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          model: 'error',
          timestamp: new Date(),
          relevanceScore: 1,
          error: error.message
        };
      })
    );

    try {
      const responses = await Promise.all(agentPromises);
      const executionTime = Date.now() - startTime;

      console.log(`[ORCHESTRATOR] All agents completed in ${executionTime}ms`);

      // Filter out failed responses if we have at least one successful response
      const successfulResponses = responses.filter(r => !r.error);
      if (successfulResponses.length > 0) {
        return successfulResponses;
      }

      return responses; // Return all responses if none succeeded
    } catch (error) {
      console.error('[ORCHESTRATOR] Agent execution error:', error);
      throw error;
    }
  }

  async aggregateResponses(query, userId, sessionId, responses, startTime) {
    console.log('[ORCHESTRATOR] Aggregating responses');
    
    try {
      // Sort responses by relevance score
      const sortedResponses = responses.sort((a, b) => b.relevanceScore - a.relevanceScore);
      const totalExecutionTime = Date.now() - startTime;

      // Create final query result
      const queryResult = {
        queryId: uuidv4(),
        userId: userId,
        sessionId: sessionId,
        query: query,
        responses: sortedResponses,
        totalExecutionTime: totalExecutionTime,
        timestamp: new Date(),
        agentCount: sortedResponses.length
      };

      // Store in memory
      await this.memoryManager.storeConversation(queryResult);

      console.log(`[ORCHESTRATOR] Query processed successfully with ${sortedResponses.length} responses`);

      return queryResult;
    } catch (error) {
      console.error('[ORCHESTRATOR] Response aggregation error:', error);
      throw error;
    }
  }

  getSystemStats() {
    const agentStats = this.agentManager.getStats();
    
    return {
      orchestrator: {
        initialized: this.initialized,
        version: '1.0.0'
      },
      agents: agentStats,
      timestamp: new Date()
    };
  }

  // Health check
  async healthCheck() {
    try {
      const stats = this.getSystemStats();
      const activeAgents = this.agentManager.getActiveAgents();
      
      return {
        status: 'healthy',
        initialized: this.initialized,
        activeAgents: activeAgents.length,
        totalAgents: stats.agents.totalAgents,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}