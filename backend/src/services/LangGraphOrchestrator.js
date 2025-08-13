import { OllamaService } from './OllamaService.js';
import { ScenicAgent } from '../agents/ScenicAgent.js';
import { RiverAgent } from '../agents/RiverAgent.js';
import { ParkAgent } from '../agents/ParkAgent.js';
import { SearchAgent } from '../agents/SearchAgent.js';
import agentsConfig from '../config/agents.json\' assert { type: 'json' };
import { v4 as uuidv4 } from 'uuid';

export class LangGraphOrchestrator {
  constructor(memoryManager) {
    this.memoryManager = memoryManager;
    this.ollamaService = new OllamaService();
    this.agents = new Map();
    this.initialized = false;
  }

  async initialize() {
    try {
      // Initialize Ollama service
      await this.ollamaService.initialize();
      
      // Initialize agents
      await this.initializeAgents();
      
      // Register agents in database
      await this.registerAgentsInDB();
      
      this.initialized = true;
      console.log('✅ LangGraph Orchestrator initialized successfully');
    } catch (error) {
      console.error('❌ LangGraph Orchestrator initialization failed:', error);
      throw error;
    }
  }

  async initializeAgents() {
    const agentClasses = {
      'scenic': ScenicAgent,
      'river': RiverAgent,
      'park': ParkAgent,
      'search': SearchAgent
    };

    agentsConfig.agents.forEach(config => {
      if (config.enabled) {
        const AgentClass = agentClasses[config.type];
        if (AgentClass) {
          const agent = new AgentClass(config, this.memoryManager, this.ollamaService);
          this.agents.set(config.id, agent);
          console.log(`✅ Initialized ${config.name}`);
        }
      }
    });
  }

  async registerAgentsInDB() {
    try {
      for (const [agentId, agent] of this.agents) {
        await this.memoryManager.mysql.execute(
          'INSERT INTO agents (id, name, type, description, capabilities, keywords, system_prompt, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), capabilities=VALUES(capabilities), keywords=VALUES(keywords), system_prompt=VALUES(system_prompt), enabled=VALUES(enabled)',
          [
            agent.id,
            agent.name,
            agent.type,
            agent.description,
            JSON.stringify(agent.capabilities),
            JSON.stringify(agent.keywords),
            agent.systemPrompt,
            agent.enabled
          ]
        );
      }
      console.log('✅ Agents registered in database');
    } catch (error) {
      console.error('❌ Failed to register agents in database:', error);
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
      const relevantAgents = await this.routeAgents(query);
      
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
    
    // Extract context and keywords from query
    const queryLower = state.query.toLowerCase();
    const keywords = queryLower.split(' ').filter(word => word.length > 2);
    
    // Get user context from memory
    const context = await this.memoryManager.getRelevantContext(userId, query);
    
    return context;
  }

  async routeAgents(query) {
    console.log('[ORCHESTRATOR] Routing to relevant agents');
    
    const relevantAgents = [];
    const queryLower = query.toLowerCase();

    // Determine relevant agents based on query content
    for (const [agentId, agent] of this.agents) {
      if (agent.isRelevant(query)) {
        const relevanceScore = agent.calculateRelevanceScore(query);
        relevantAgents.push({
          agent,
          relevanceScore
        });
      }
    }

    // Always include search agent for context
    const searchAgent = this.agents.get('search-agent');
    if (searchAgent && !relevantAgents.find(ra => ra.agent.id === 'search-agent')) {
      relevantAgents.push({
        agent: searchAgent,
        relevanceScore: 1
      });
    }

    // If no specific agents matched, use scenic as default
    if (relevantAgents.length === 0) {
      const scenicAgent = this.agents.get('scenic-agent');
      if (scenicAgent) {
        relevantAgents.push({
          agent: scenicAgent,
          relevanceScore: 1
        });
      }
    }

    // Sort by relevance score
    relevantAgents.sort((a, b) => b.relevanceScore - a.relevanceScore);

    console.log(`[ORCHESTRATOR] Selected ${relevantAgents.length} agents: ${relevantAgents.map(ra => ra.agent.name).join(', ')}`);

    return relevantAgents;
  }

  async executeAgents(relevantAgents, query, userId, sessionId, context) {
    console.log('[ORCHESTRATOR] Executing agents in parallel');
    
    const startTime = Date.now();
    
    // Execute all relevant agents in parallel
    const agentPromises = relevantAgents.map(({ agent }) =>
      agent.execute(query, userId, sessionId, context)
    );

    try {
      const responses = await Promise.all(agentPromises);
      const executionTime = Date.now() - startTime;

      console.log(`[ORCHESTRATOR] All agents completed in ${executionTime}ms`);

      return responses;
    } catch (error) {
      console.error('[ORCHESTRATOR] Agent execution error:', error);
      throw error;
    }
  }

  async aggregateResponses(query, userId, sessionId, responses, startTime) {
    console.log('[ORCHESTRATOR] Aggregating responses');
    
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
    await this.memoryManager.storeQueryResult(queryResult);

    console.log(`[ORCHESTRATOR] Query processed successfully with ${sortedResponses.length} responses`);

    return queryResult;
  }

  getAgentStats() {
    const stats = {
      totalAgents: this.agents.size,
      enabledAgents: Array.from(this.agents.values()).filter(agent => agent.enabled).length,
      agentTypes: Array.from(this.agents.values()).map(agent => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        capabilities: agent.capabilities.length,
        enabled: agent.enabled
      }))
    };

    return stats;
  }

  // Edge communication methods
  async communicateAgents(fromAgentId, toAgentId, message) {
    const fromAgent = this.agents.get(fromAgentId);
    const toAgent = this.agents.get(toAgentId);

    if (!fromAgent || !toAgent) {
      throw new Error('Invalid agent IDs for communication');
    }

    console.log(`[EDGE] Communication: ${fromAgent.name} → ${toAgent.name}`);
    
    // Implement edge communication logic based on agents.json rules
    const edgeRules = agentsConfig.edge_rules;
    const applicableRule = edgeRules.find(rule => 
      rule.from === fromAgentId && (rule.to === toAgentId || rule.to === '*')
    );

    if (applicableRule) {
      console.log(`[EDGE] Applied rule: ${applicableRule.condition} (Priority: ${applicableRule.priority})`);
      return {
        success: true,
        rule: applicableRule,
        message
      };
    }

    return {
      success: false,
      error: 'No applicable edge rule found'
    };
  }
}