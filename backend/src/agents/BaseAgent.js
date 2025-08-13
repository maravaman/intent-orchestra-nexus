import { OllamaService } from '../services/OllamaService.js';

export class BaseAgent {
  constructor(config, memoryManager, ollamaService) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.description = config.description;
    this.capabilities = config.capabilities;
    this.keywords = config.keywords;
    this.priority = config.priority;
    this.enabled = config.enabled;
    this.systemPrompt = config.systemPrompt || this.getDefaultSystemPrompt();
    this.memoryManager = memoryManager;
    this.ollama = ollamaService;
  }

  getDefaultSystemPrompt() {
    return `You are a specialized AI agent named ${this.name}. 
Your role: ${this.description}
Your capabilities: ${this.capabilities.join(', ')}

Provide helpful, accurate, and detailed responses within your area of expertise.
Be conversational and engaging while maintaining professionalism.
If a query is outside your expertise, acknowledge this and provide what relevant information you can.`;
  }

  async execute(query, userId, sessionId, context = []) {
    const startTime = Date.now();
    
    try {
      console.log(`[${this.name}] Processing query: "${query}"`);
      
      // Get relevant context from user's memory
      const relevantContext = await this.memoryManager.getRelevantContext(userId, query);
      const combinedContext = [...context, ...relevantContext];
      
      // Generate response based on agent type
      const ollamaResponse = await this.ollama.generateResponse(
        this.systemPrompt,
        this.formatQueryWithContext(query, combinedContext),
        combinedContext
      );
      
      const executionTime = Date.now() - startTime;
      const confidence = this.calculateConfidence(query, ollamaResponse.content);
      const relevanceScore = this.calculateRelevanceScore(query);
      
      const agentResponse = {
        agentId: this.id,
        agentName: this.name,
        response: ollamaResponse.content,
        confidence: confidence,
        executionTime: executionTime,
        inputTokens: ollamaResponse.inputTokens,
        outputTokens: ollamaResponse.outputTokens,
        timestamp: new Date(),
        relevanceScore: relevanceScore
      };

      // Store agent interaction
      await this.storeAgentInteraction(query, userId, sessionId, ollamaResponse, confidence, relevanceScore);
      
      console.log(`[${this.name}] Response generated in ${executionTime}ms`);
      return agentResponse;
      
    } catch (error) {
      console.error(`[${this.name}] Execution error:`, error);
      throw error;
    }
  }

  formatQueryWithContext(query, context) {
    if (context.length === 0) {
      return query;
    }

    const contextStr = context
      .slice(-3) // Last 3 context items
      .map(c => `Previous: ${c.content}`)
      .join('\n');

    return `Context from previous conversations:
${contextStr}

Current query: ${query}`;
  }

  async storeAgentInteraction(query, userId, sessionId, ollamaResponse, confidence, relevanceScore) {
    try {
      const interaction = {
        id: `interaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        query_id: `query-${Date.now()}`,
        agent_id: this.id,
        user_id: userId,
        input_tokens: ollamaResponse.inputTokens,
        output_tokens: ollamaResponse.outputTokens,
        execution_time: ollamaResponse.executionTime,
        confidence_score: confidence,
        relevance_score: relevanceScore,
        timestamp: new Date()
      };

      await this.memoryManager.mysql.execute(
        'INSERT INTO agent_interactions (id, query_id, agent_id, user_id, input_tokens, output_tokens, execution_time, confidence_score, relevance_score, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [interaction.id, interaction.query_id, interaction.agent_id, interaction.user_id, interaction.input_tokens, interaction.output_tokens, interaction.execution_time, interaction.confidence_score, interaction.relevance_score, interaction.timestamp]
      );
    } catch (error) {
      console.error(`[${this.name}] Failed to store interaction:`, error);
    }
  }
  calculateRelevanceScore(query) {
    const queryLower = query.toLowerCase();
    let score = 0;
    
    // Calculate relevance based on keyword matches
    this.keywords.forEach(keyword => {
      if (queryLower.includes(keyword)) {
        score += 1;
      }
    });
    
    // Normalize score to 1-10 range
    return Math.min(Math.max(score, 1), 10);
  }

  calculateConfidence(query, response) {
    // Base confidence calculation
    let confidence = 0.6; // Base 60%
    
    // Increase confidence based on keyword matches
    const queryLower = query.toLowerCase();
    const keywordMatches = this.keywords.filter(keyword => 
      queryLower.includes(keyword)
    ).length;
    
    confidence += (keywordMatches * 0.1); // +10% per keyword match
    
    // Ensure confidence is between 0.6 and 1.0
    return Math.min(Math.max(confidence, 0.6), 1.0);
  }

  async generateResponse(query, context) {
    // This method should be overridden by specific agent implementations
    throw new Error('generateResponse method must be implemented by subclass');
  }

  isRelevant(query) {
    const queryLower = query.toLowerCase();
    return this.keywords.some(keyword => queryLower.includes(keyword));
  }

  getProcessingTime() {
    // Simulate different processing times for different agent types
    const baseTimes = {
      scenic: 300,
      river: 250,
      park: 200,
      search: 400
    };
    
    const baseTime = baseTimes[this.type] || 300;
    return baseTime + Math.random() * 200; // Add some randomness
  }
}