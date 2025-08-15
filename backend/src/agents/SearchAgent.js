import { BaseAgent } from './BaseAgent.js';

export class SearchAgent extends BaseAgent {
  getDefaultSystemPrompt() {
    return `You are the Search Agent, a specialized AI assistant focused on searching through user conversation history and providing contextual information.

Your expertise includes:
- Analyzing user conversation patterns
- Finding relevant historical information
- Providing personalized recommendations based on history
- Identifying user preferences and interests
- Connecting past conversations to current queries
- Pattern recognition in user behavior
- Contextual information retrieval
- Memory-based personalization

When responding to search-related queries:
1. Reference specific past conversations when available
2. Identify patterns in user interests
3. Provide personalized recommendations
4. Explain connections between past and current queries
5. Suggest related topics based on history
6. Maintain user privacy while being helpful
7. Highlight recurring themes in user queries
8. Provide insights into user preferences
9. Suggest new areas of interest based on history
10. Connect different types of queries (scenic, rivers, parks)

Be insightful about user patterns while respecting privacy and providing valuable context.
Always explain how past conversations relate to current queries.
Focus on providing personalized, context-aware responses.`;
  }

  async execute(query, userId, sessionId, context = []) {
    try {
      console.log(`[${this.name}] Processing search query: "${query}"`);
      
      const startTime = Date.now();
      
      // Get comprehensive user history
      const conversationHistory = await this.memoryManager.getUserConversationHistory(userId, 10);
      const searchResults = await this.memoryManager.searchUserMemory(userId, query, 20);
      const memoryStats = await this.memoryManager.getMemoryStats(userId);
      
      // Build context-rich prompt
      let searchContext = `User Profile Analysis:
- Total conversations: ${conversationHistory.length}
- Memory entries found: ${searchResults.length}
- Total queries in history: ${memoryStats.conversations.total}
- Average agents per query: ${memoryStats.conversations.avgAgentsPerQuery}

`;
      
      if (searchResults.length > 0) {
        const recentQueries = searchResults
          .filter(entry => entry.type === 'query')
          .slice(0, 5)
          .map(entry => entry.content);
        
        searchContext += `Recent related queries:
${recentQueries.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

`;
        
        const agentInteractions = searchResults
          .filter(entry => entry.type === 'response' && entry.metadata.agentName)
          .reduce((acc, entry) => {
            const agentName = entry.metadata.agentName;
            acc[agentName] = (acc[agentName] || 0) + 1;
            return acc;
          }, {});
        
        if (Object.keys(agentInteractions).length > 0) {
          searchContext += `Most consulted agents:
${Object.entries(agentInteractions)
  .sort(([,a], [,b]) => b - a)
  .map(([agent, count]) => `- ${agent}: ${count} interactions`)
  .join('\n')}

`;
        }
      }
      
      if (conversationHistory.length > 0) {
        const lastQuery = conversationHistory[0];
        searchContext += `Most recent query: "${lastQuery.query}" (${new Date(lastQuery.timestamp).toLocaleDateString()})

`;
        
        // Analyze query patterns
        const queryTypes = conversationHistory.reduce((acc, conv) => {
          const query = conv.query.toLowerCase();
          if (query.includes('scenic') || query.includes('beautiful')) acc.scenic++;
          if (query.includes('river') || query.includes('water')) acc.river++;
          if (query.includes('park') || query.includes('recreation')) acc.park++;
          return acc;
        }, { scenic: 0, river: 0, park: 0 });
        
        const totalQueries = Object.values(queryTypes).reduce((a, b) => a + b, 0);
        if (totalQueries > 0) {
          searchContext += `Interest patterns:
${Object.entries(queryTypes)
  .filter(([, count]) => count > 0)
  .map(([type, count]) => `- ${type}: ${Math.round((count / totalQueries) * 100)}%`)
  .join('\n')}

`;
        }
      }
      
      searchContext += `Current query: "${query}"

Please provide a comprehensive analysis of the user's query in the context of their history, identify patterns, and make personalized recommendations.`;

      // Use Ollama to generate contextual response
      const ollamaResponse = await this.ollama.generateResponse(
        this.systemPrompt,
        searchContext,
        context,
        this.modelConfig
      );
      
      const executionTime = Date.now() - startTime;
      const confidence = this.calculateSearchConfidence(searchResults.length, conversationHistory.length);
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
        relevanceScore: relevanceScore,
        metadata: {
          searchResultsCount: searchResults.length,
          conversationHistoryCount: conversationHistory.length,
          memoryStats: memoryStats
        }
      };

      console.log(`[${this.name}] Search response generated in ${executionTime}ms`);
      return agentResponse;

    } catch (error) {
      console.error(`[${this.name}] Execution error:`, error);
      
      // Return fallback response
      const executionTime = Date.now() - Date.now();
      return {
        agentId: this.id,
        agentName: this.name,
        response: "I apologize, but I encountered an error while searching through your conversation history. Please try again or rephrase your question.",
        confidence: 0.1,
        executionTime: executionTime,
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

  calculateSearchConfidence(searchResultsCount, historyCount) {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on available data
    if (searchResultsCount > 0) confidence += 0.2;
    if (searchResultsCount > 5) confidence += 0.1;
    if (historyCount > 0) confidence += 0.1;
    if (historyCount > 3) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }
}