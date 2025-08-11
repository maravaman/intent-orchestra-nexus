import { StateGraph, END } from 'langgraph';
import { ScenicAgent } from '../agents/ScenicAgent.js';
import { RiverAgent } from '../agents/RiverAgent.js';
import { ParkAgent } from '../agents/ParkAgent.js';
import { SearchAgent } from '../agents/SearchAgent.js';
import agentsConfig from '../config/agents.json' assert { type: 'json' };
import { v4 as uuidv4 } from 'uuid';

export class LangGraphOrchestrator {
  constructor(memoryManager) {
    this.memoryManager = memoryManager;
    this.agents = new Map();
    this.graph = null;
    this.initializeAgents();
    this.buildGraph();
  }

  initializeAgents() {
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
          const agent = new AgentClass(config, this.memoryManager);
          this.agents.set(config.id, agent);
          console.log(`✅ Initialized ${config.name}`);
        }
      }
    });
  }

  buildGraph() {
    // Define the state structure
    const graphState = {
      query: null,
      userId: null,
      sessionId: null,
      relevantAgents: [],
      responses: [],
      context: [],
      executionTime: 0
    };

    // Create the state graph
    this.graph = new StateGraph(graphState);

    // Add nodes
    this.graph.addNode('analyze_query', this.analyzeQuery.bind(this));
    this.graph.addNode('route_agents', this.routeAgents.bind(this));
    this.graph.addNode('execute_agents', this.executeAgents.bind(this));
    this.graph.addNode('aggregate_responses', this.aggregateResponses.bind(this));

    // Add edges
    this.graph.addEdge('analyze_query', 'route_agents');
    this.graph.addEdge('route_agents', 'execute_agents');
    this.graph.addEdge('execute_agents', 'aggregate_responses');
    this.graph.addEdge('aggregate_responses', END);

    // Set entry point
    this.graph.setEntryPoint('analyze_query');

    console.log('✅ LangGraph orchestrator initialized');
  }

  async analyzeQuery(state) {
    console.log(`[ORCHESTRATOR] Analyzing query: "${state.query}"`);
    
    // Extract context and keywords from query
    const queryLower = state.query.toLowerCase();
    const keywords = queryLower.split(' ').filter(word => word.length > 2);
    
    // Get user context from memory
    const context = await this.memoryManager.getRelevantContext(state.userId, state.query);
    
    return {
      ...state,
      context,
      keywords,
      analyzedAt: new Date()
    };
  }

  async routeAgents(state) {
    console.log('[ORCHESTRATOR] Routing to relevant agents');
    
    const relevantAgents = [];
    const queryLower = state.query.toLowerCase();

    // Determine relevant agents based on query content
    for (const [agentId, agent] of this.agents) {
      if (agent.isRelevant(state.query)) {
        const relevanceScore = agent.calculateRelevanceScore(state.query);
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

    return {
      ...state,
      relevantAgents
    };
  }

  async executeAgents(state) {
    console.log('[ORCHESTRATOR] Executing agents in parallel');
    
    const startTime = Date.now();
    
    // Execute all relevant agents in parallel
    const agentPromises = state.relevantAgents.map(({ agent }) =>
      agent.execute(state.query, state.userId, state.sessionId, state.context)
    );

    try {
      const responses = await Promise.all(agentPromises);
      const executionTime = Date.now() - startTime;

      console.log(`[ORCHESTRATOR] All agents completed in ${executionTime}ms`);

      return {
        ...state,
        responses,
        executionTime
      };
    } catch (error) {
      console.error('[ORCHESTRATOR] Agent execution error:', error);
      throw error;
    }
  }

  async aggregateResponses(state) {
    console.log('[ORCHESTRATOR] Aggregating responses');
    
    // Sort responses by relevance score
    const sortedResponses = state.responses.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Create final query result
    const queryResult = {
      queryId: uuidv4(),
      userId: state.userId,
      sessionId: state.sessionId,
      query: state.query,
      responses: sortedResponses,
      totalExecutionTime: state.executionTime,
      timestamp: new Date(),
      agentCount: sortedResponses.length
    };

    // Store in memory
    await this.memoryManager.storeQueryResult(queryResult);

    console.log(`[ORCHESTRATOR] Query processed successfully with ${sortedResponses.length} responses`);

    return {
      ...state,
      queryResult
    };
  }

  async processQuery(query, userId, sessionId) {
    try {
      console.log(`[ORCHESTRATOR] Processing query for user ${userId}`);
      
      const initialState = {
        query,
        userId,
        sessionId,
        relevantAgents: [],
        responses: [],
        context: [],
        executionTime: 0
      };

      // Execute the graph
      const finalState = await this.graph.invoke(initialState);
      
      return finalState.queryResult;
    } catch (error) {
      console.error('[ORCHESTRATOR] Query processing error:', error);
      throw error;
    }
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