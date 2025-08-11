import { BaseAgent } from './BaseAgent.js';

export class SearchAgent extends BaseAgent {
  async generateResponse(query, context) {
    try {
      const conversationHistory = await this.memoryManager.getUserConversationHistory(
        context.userId || 'unknown', 
        10
      );
      const searchResults = await this.memoryManager.searchUserHistory(
        context.userId || 'unknown', 
        query
      );
      
      let response = '';

      if (searchResults.length > 0) {
        const recentQueries = searchResults
          .filter(entry => entry.type === 'query')
          .slice(0, 3)
          .map(entry => entry.content);

        response = `I found ${searchResults.length} relevant entries in your conversation history. Your recent related queries include: "${recentQueries.join('", "')}"`;
        
        if (conversationHistory.length > 0) {
          const lastQuery = conversationHistory[0];
          response += ` Your last query was about "${lastQuery.query}" on ${new Date(lastQuery.timestamp).toLocaleDateString()}.`;
        }

        response += ` I can see patterns in your interests that might help provide more personalized recommendations.`;
      } else if (conversationHistory.length > 0) {
        response = `While I didn't find direct matches for your current query, I can see from your conversation history that you've made ${conversationHistory.length} previous queries. Your interests seem to focus on exploration and discovery, which aligns well with your current question.`;
      } else {
        response = `This appears to be one of your first queries with our system. I'm building a profile of your interests to provide better personalized recommendations in future conversations. Welcome to our multi-agent assistance platform!`;
      }

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, this.getProcessingTime()));

      return response;
    } catch (error) {
      console.error('[SearchAgent] Error generating response:', error);
      return "I'm currently unable to search your history, but I'm here to help with your current query. Please try again or ask about specific topics.";
    }
  }

  async execute(query, userId, sessionId, context = []) {
    // Override execute to pass userId in context for search operations
    const enhancedContext = [...context, { userId, sessionId }];
    return super.execute(query, userId, sessionId, enhancedContext);
  }
}