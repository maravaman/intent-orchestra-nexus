export class BaseAgent {
  constructor(config, memoryManager) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.description = config.description;
    this.capabilities = config.capabilities;
    this.keywords = config.keywords;
    this.priority = config.priority;
    this.enabled = config.enabled;
    this.memoryManager = memoryManager;
  }

  async execute(query, userId, sessionId, context = []) {
    const startTime = Date.now();
    
    try {
      console.log(`[${this.name}] Processing query: "${query}"`);
      
      // Get relevant context from user's memory
      const relevantContext = await this.memoryManager.getRelevantContext(userId, query);
      const combinedContext = [...context, ...relevantContext];
      
      // Generate response based on agent type
      const response = await this.generateResponse(query, combinedContext);
      
      const executionTime = Date.now() - startTime;
      const confidence = this.calculateConfidence(query, response);
      const relevanceScore = this.calculateRelevanceScore(query);
      
      const agentResponse = {
        agentId: this.id,
        agentName: this.name,
        response: response,
        confidence: confidence,
        executionTime: executionTime,
        timestamp: new Date(),
        relevanceScore: relevanceScore
      };
      
      console.log(`[${this.name}] Response generated in ${executionTime}ms`);
      return agentResponse;
      
    } catch (error) {
      console.error(`[${this.name}] Execution error:`, error);
      throw error;
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