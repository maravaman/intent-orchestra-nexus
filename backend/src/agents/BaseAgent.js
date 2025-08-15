import { OllamaService } from '../services/OllamaService.js';

export class BaseAgent {
  constructor(config, memoryManager, ollamaService) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.description = config.description;
    this.capabilities = config.capabilities || [];
    this.keywords = config.keywords || [];
    this.priority = config.priority || 1;
    this.enabled = config.enabled !== false;
    this.systemPrompt = config.systemPrompt || this.getDefaultSystemPrompt();
    this.modelConfig = config.modelConfig || {};
    this.memoryManager = memoryManager;
    this.ollama = ollamaService;
  }

  getDefaultSystemPrompt() {
    return `You are a specialized AI agent named ${this.name}. 
Your role: ${this.description}
Your capabilities: ${this.capabilities.join(', ')}

Provide helpful, accurate, and detailed responses within your area of expertise.
Be conversational and engaging while maintaining professionalism.
If a query is outside your expertise, acknowledge this and provide what relevant information you can.
Always provide specific, actionable information when possible.`;
  }

  async execute(query, userId, sessionId, context = []) {
    const startTime = Date.now();
    
    try {
      console.log(`[${this.name}] Processing query: "${query}"`);
      
      // Get relevant context from user's memory
      const relevantContext = await this.memoryManager.getRelevantContext(userId, query, 3);
      const combinedContext = [...context, ...relevantContext];
      
      // Generate response using Ollama
      const ollamaResponse = await this.ollama.generateResponse(
        this.systemPrompt,
        this.formatQueryWithContext(query, combinedContext),
        combinedContext,
        this.modelConfig
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
        totalTokens: ollamaResponse.totalTokens,
        model: ollamaResponse.model,
        timestamp: new Date(),
        relevanceScore: relevanceScore
      };

      console.log(`[${this.name}] Response generated in ${executionTime}ms (${ollamaResponse.totalTokens} tokens)`);
      return agentResponse;
      
    } catch (error) {
      console.error(`[${this.name}] Execution error:`, error);
      
      // Return fallback response
      return {
        agentId: this.id,
        agentName: this.name,
        response: `I apologize, but I encountered an error while processing your query about ${this.type} topics. Please try again or rephrase your question.`,
        confidence: 0.1,
        executionTime: Date.now() - startTime,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        model: 'fallback',
        timestamp: new Date(),
        relevanceScore: 1,
        error: error.message
      };
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

Current query: ${query}

Please provide a comprehensive response that takes into account the user's previous interactions and interests.`;
  }

  calculateRelevanceScore(query) {
    const queryLower = query.toLowerCase();
    let score = 0;
    
    // Calculate relevance based on keyword matches
    this.keywords.forEach(keyword => {
      if (queryLower.includes(keyword.toLowerCase())) {
        score += 1;
      }
    });
    
    // Bonus for exact type match
    if (queryLower.includes(this.type)) {
      score += 2;
    }
    
    // Normalize score to 1-10 range
    return Math.min(Math.max(score, 1), 10);
  }

  calculateConfidence(query, response) {
    // Base confidence calculation
    let confidence = 0.6; // Base 60%
    
    // Increase confidence based on keyword matches
    const queryLower = query.toLowerCase();
    const keywordMatches = this.keywords.filter(keyword => 
      queryLower.includes(keyword.toLowerCase())
    ).length;
    
    confidence += (keywordMatches * 0.05); // +5% per keyword match
    
    // Increase confidence based on response length and detail
    if (response.length > 200) confidence += 0.1;
    if (response.length > 500) confidence += 0.1;
    
    // Increase confidence if response contains specific information
    if (response.includes('specific') || response.includes('located') || response.includes('features')) {
      confidence += 0.1;
    }
    
    // Ensure confidence is between 0.1 and 1.0
    return Math.min(Math.max(confidence, 0.1), 1.0);
  }

  isRelevant(query) {
    const queryLower = query.toLowerCase();
    
    // Check for direct keyword matches
    const hasKeywordMatch = this.keywords.some(keyword => 
      queryLower.includes(keyword.toLowerCase())
    );
    
    // Check for type match
    const hasTypeMatch = queryLower.includes(this.type);
    
    return hasKeywordMatch || hasTypeMatch;
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

  getAgentInfo() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      description: this.description,
      capabilities: this.capabilities,
      keywords: this.keywords,
      priority: this.priority,
      enabled: this.enabled
    };
  }
}