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

When responding to search-related queries:
1. Reference specific past conversations when available
2. Identify patterns in user interests
3. Provide personalized recommendations
4. Explain connections between past and current queries
5. Suggest related topics based on history
6. Maintain user privacy while being helpful

Be insightful about user patterns while respecting privacy and providing valuable context.`;
  }

  async execute(query, userId, sessionId, context = []) {
    try {
      const conversationHistory = await this.memoryManager.getUserConversationHistory(
        userId, 
        10
      );
      const searchResults = await this.memoryManager.searchUserHistory(
        userId, 
        query
      );
      
      let searchContext = `User has ${conversationHistory.length} previous conversations. `;
      
      if (searchResults.length > 0) {
        const recentQueries = searchResults
          .filter(entry => entry.type === 'query')
          .slice(0, 3)
          .map(entry => entry.content);
        
        searchContext += `Found ${searchResults.length} relevant entries. Recent related queries: ${recentQueries.join(', ')}. `;
      }
      
      if (conversationHistory.length > 0) {
        const lastQuery = conversationHistory[0];
        searchContext += `Last query was about "${lastQuery.query}". `;
      }
      
      searchContext += `Current query: ${query}`;

      // Use Ollama to generate contextual response
      const startTime = Date.now();
      const ollamaResponse = await this.ollama.generateResponse(
        this.systemPrompt,
        searchContext,
        context
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
}