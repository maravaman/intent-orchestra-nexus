import { MemoryEntry, QueryResult, User } from '@/types/agent';

export class MemoryService {
  private stmStorage: Map<string, MemoryEntry[]> = new Map(); // Short-term memory (Redis simulation)
  private ltmStorage: Map<string, MemoryEntry[]> = new Map(); // Long-term memory (MySQL simulation)
  private userSessions: Map<string, string> = new Map(); // User session mapping

  // STM Operations (7-day retention)
  async storeInSTM(userId: string, entry: Omit<MemoryEntry, 'id' | 'timestamp' | 'expiresAt'>): Promise<void> {
    const memoryEntry: MemoryEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };

    const userSTM = this.stmStorage.get(userId) || [];
    userSTM.push(memoryEntry);
    
    // Keep only last 100 entries per user in STM
    if (userSTM.length > 100) {
      userSTM.splice(0, userSTM.length - 100);
    }
    
    this.stmStorage.set(userId, userSTM);
    console.log(`[STM] Stored entry for user ${userId}:`, entry.type);
  }

  async getFromSTM(userId: string, limit: number = 20): Promise<MemoryEntry[]> {
    const userSTM = this.stmStorage.get(userId) || [];
    const validEntries = userSTM.filter(entry => 
      !entry.expiresAt || entry.expiresAt > new Date()
    );
    
    // Update storage with valid entries only
    this.stmStorage.set(userId, validEntries);
    
    return validEntries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // LTM Operations (Permanent storage)
  async storeInLTM(userId: string, entry: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<void> {
    const memoryEntry: MemoryEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date()
    };

    const userLTM = this.ltmStorage.get(userId) || [];
    userLTM.push(memoryEntry);
    this.ltmStorage.set(userId, userLTM);
    console.log(`[LTM] Stored entry for user ${userId}:`, entry.type);
  }

  async getFromLTM(userId: string, limit: number = 50): Promise<MemoryEntry[]> {
    const userLTM = this.ltmStorage.get(userId) || [];
    return userLTM
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Query History Management
  async storeQueryResult(queryResult: QueryResult): Promise<void> {
    const { userId, sessionId } = queryResult;

    // Store in STM for quick access
    await this.storeInSTM(userId, {
      userId,
      sessionId,
      type: 'query',
      content: queryResult.query,
      metadata: {
        queryId: queryResult.queryId,
        agentCount: queryResult.responses.length,
        executionTime: queryResult.totalExecutionTime
      }
    });

    // Store responses in STM
    for (const response of queryResult.responses) {
      await this.storeInSTM(userId, {
        userId,
        sessionId,
        type: 'response',
        content: response.response,
        metadata: {
          agentId: response.agentId,
          agentName: response.agentName,
          confidence: response.confidence,
          executionTime: response.executionTime,
          queryId: queryResult.queryId
        }
      });
    }

    // Store in LTM for permanent history
    await this.storeInLTM(userId, {
      userId,
      sessionId,
      type: 'query',
      content: JSON.stringify(queryResult),
      metadata: {
        queryId: queryResult.queryId,
        timestamp: queryResult.timestamp
      }
    });
  }

  async getUserConversationHistory(userId: string, limit: number = 10): Promise<QueryResult[]> {
    const ltmEntries = await this.getFromLTM(userId, limit * 2);
    const queryEntries = ltmEntries.filter(entry => entry.type === 'query');
    
    return queryEntries
      .slice(0, limit)
      .map(entry => JSON.parse(entry.content) as QueryResult)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async searchUserHistory(userId: string, searchTerm: string): Promise<MemoryEntry[]> {
    const stmEntries = await this.getFromSTM(userId, 100);
    const ltmEntries = await this.getFromLTM(userId, 200);
    
    const allEntries = [...stmEntries, ...ltmEntries];
    
    return allEntries.filter(entry =>
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(entry.metadata).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Context Retrieval for Agents
  async getRelevantContext(userId: string, query: string): Promise<MemoryEntry[]> {
    const recentSTM = await this.getFromSTM(userId, 10);
    const keywords = query.toLowerCase().split(' ');
    
    return recentSTM.filter(entry => {
      const content = entry.content.toLowerCase();
      return keywords.some(keyword => content.includes(keyword));
    });
  }

  // Utility Methods
  private generateId(): string {
    return `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Memory Statistics
  async getMemoryStats(userId: string) {
    const stmEntries = await this.getFromSTM(userId, 1000);
    const ltmEntries = await this.getFromLTM(userId, 1000);
    
    return {
      stm: {
        totalEntries: stmEntries.length,
        queries: stmEntries.filter(e => e.type === 'query').length,
        responses: stmEntries.filter(e => e.type === 'response').length,
        oldestEntry: stmEntries.length > 0 ? stmEntries[stmEntries.length - 1].timestamp : null
      },
      ltm: {
        totalEntries: ltmEntries.length,
        queries: ltmEntries.filter(e => e.type === 'query').length,
        responses: ltmEntries.filter(e => e.type === 'response').length,
        oldestEntry: ltmEntries.length > 0 ? ltmEntries[ltmEntries.length - 1].timestamp : null
      }
    };
  }

  // Privacy Methods
  async deleteUserData(userId: string): Promise<void> {
    this.stmStorage.delete(userId);
    this.ltmStorage.delete(userId);
    this.userSessions.delete(userId);
    console.log(`[PRIVACY] Deleted all data for user ${userId}`);
  }

  async exportUserData(userId: string): Promise<any> {
    const stmData = this.stmStorage.get(userId) || [];
    const ltmData = this.ltmStorage.get(userId) || [];
    
    return {
      userId,
      exportDate: new Date(),
      shortTermMemory: stmData,
      longTermMemory: ltmData,
      totalEntries: stmData.length + ltmData.length
    };
  }
}

export const memoryService = new MemoryService();