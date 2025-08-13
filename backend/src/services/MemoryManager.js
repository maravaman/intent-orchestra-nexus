import { v4 as uuidv4 } from 'uuid';

export class MemoryManager {
  constructor(mysqlConnection) {
    this.mysql = mysqlConnection;
  }

  // Store in MySQL with TTL simulation
  async storeInMemory(userId, entry, isShortTerm = true) {
    try {
      const memoryEntry = {
        id: uuidv4(),
        user_id: userId,
        session_id: entry.sessionId,
        type: entry.type,
        content: entry.content,
        metadata: JSON.stringify(entry.metadata || {}),
        agent_id: entry.agentId || null,
        relevance_score: entry.relevanceScore || 0,
        timestamp: new Date()
      };

      await this.mysql.execute(
        'INSERT INTO memory_entries (id, user_id, session_id, type, content, metadata, agent_id, relevance_score, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [memoryEntry.id, memoryEntry.user_id, memoryEntry.session_id, memoryEntry.type, memoryEntry.content, memoryEntry.metadata, memoryEntry.agent_id, memoryEntry.relevance_score, memoryEntry.timestamp]
      );

      // Clean old short-term entries (older than 7 days)
      if (isShortTerm) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        await this.mysql.execute(
          'DELETE FROM memory_entries WHERE user_id = ? AND type IN ("query", "response") AND timestamp < ?',
          [userId, sevenDaysAgo]
        );
      }

      console.log(`[MEMORY] Stored ${isShortTerm ? 'STM' : 'LTM'} entry for user ${userId}`);
      return memoryEntry;
    } catch (error) {
      console.error('[MEMORY] Storage error:', error);
      throw error;
    }
  }

  // Legacy method for compatibility
  async storeInSTM(userId, entry) {
    return this.storeInMemory(userId, entry, true);
  }

  async storeInLTM(userId, entry) {
    return this.storeInMemory(userId, entry, false);
  }

  async getFromMemory(userId, limit = 20, type = null) {
    try {
      let query = 'SELECT * FROM memory_entries WHERE user_id = ?';
      const params = [userId];
      
      if (type) {
        query += ' AND type = ?';
        params.push(type);
      }
      
      query += ' ORDER BY timestamp DESC LIMIT ?';
      params.push(limit);

      const [rows] = await this.mysql.execute(query, params);
      
      return rows.map(row => ({
        ...entry,
        id: row.id,
        userId: row.user_id,
        sessionId: row.session_id,
        type: row.type,
        content: row.content,
        metadata: JSON.parse(row.metadata || '{}'),
        agentId: row.agent_id,
        relevanceScore: row.relevance_score,
        timestamp: row.timestamp
      }));
    } catch (error) {
      console.error('[MEMORY] Retrieval error:', error);
      return [];
    }
  }

  // Legacy methods for compatibility
  async getFromSTM(userId, limit = 20) {
    return this.getFromMemory(userId, limit, 'query');
  }

  async getFromLTM(userId, limit = 50) {
    return this.getFromMemory(userId, limit);
  }

  // LTM Operations (MySQL)
  async storeInLTM(userId, entry) {
    try {
      const memoryEntry = {
        id: uuidv4(),
        user_id: userId,
        session_id: entry.sessionId,
        type: entry.type,
        content: entry.content,
        metadata: JSON.stringify(entry.metadata || {}),
        timestamp: new Date()
      };

      await this.mysql.execute(
        'INSERT INTO memory_entries (id, user_id, session_id, type, content, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [memoryEntry.id, memoryEntry.user_id, memoryEntry.session_id, memoryEntry.type, memoryEntry.content, memoryEntry.metadata, memoryEntry.timestamp]
      );

      console.log(`[LTM] Stored entry for user ${userId}`);
      return memoryEntry;
    } catch (error) {
      console.error('[LTM] Storage error:', error);
      throw error;
    }
  }

  async getFromLTM(userId, limit = 50) {
    try {
      const [rows] = await this.mysql.execute(
        'SELECT * FROM memory_entries WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
        [userId, limit]
      );

      return rows.map(row => ({
        ...row,
        metadata: JSON.parse(row.metadata || '{}')
      }));
    } catch (error) {
      console.error('[LTM] Retrieval error:', error);
      return [];
    }
  }

  // Store Query Result
  async storeQueryResult(queryResult) {
    try {
      const { userId, sessionId } = queryResult;

      // Store in STM for quick access
      await this.storeInSTM(userId, {
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
        sessionId,
        type: 'query',
        content: JSON.stringify(queryResult),
        metadata: {
          queryId: queryResult.queryId,
          timestamp: queryResult.timestamp
        }
      });

      // Store conversation in conversations table
      await this.mysql.execute(
        'INSERT INTO conversations (id, user_id, query, responses, total_execution_time, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [
          queryResult.queryId,
          userId,
          queryResult.query,
          JSON.stringify(queryResult.responses),
          queryResult.totalExecutionTime,
          queryResult.timestamp
        ]
      );

    } catch (error) {
      console.error('[MEMORY] Query result storage error:', error);
      throw error;
    }
  }

  // Get User Conversation History
  async getUserConversationHistory(userId, limit = 10) {
    try {
      const [rows] = await this.mysql.execute(
        'SELECT * FROM conversations WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
        [userId, limit]
      );

      return rows.map(row => ({
        queryId: row.id,
        userId: row.user_id,
        query: row.query,
        responses: JSON.parse(row.responses),
        totalExecutionTime: row.total_execution_time,
        timestamp: row.timestamp
      }));
    } catch (error) {
      console.error('[MEMORY] Conversation history error:', error);
      return [];
    }
  }

  // Search User History
  async searchUserHistory(userId, searchTerm) {
    try {
      const stmEntries = await this.getFromSTM(userId, 100);
      const ltmEntries = await this.getFromLTM(userId, 200);
      
      const allEntries = [...stmEntries, ...ltmEntries];
      
      return allEntries.filter(entry =>
        entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(entry.metadata).toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('[MEMORY] Search error:', error);
      return [];
    }
  }

  // Get Relevant Context for Agents
  async getRelevantContext(userId, query) {
    try {
      const recentSTM = await this.getFromSTM(userId, 10);
      const keywords = query.toLowerCase().split(' ');
      
      return recentSTM.filter(entry => {
        const content = entry.content.toLowerCase();
        return keywords.some(keyword => content.includes(keyword));
      });
    } catch (error) {
      console.error('[MEMORY] Context retrieval error:', error);
      return [];
    }
  }

  // Get Memory Statistics
  async getMemoryStats(userId) {
    try {
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
    } catch (error) {
      console.error('[MEMORY] Stats error:', error);
      return { stm: {}, ltm: {} };
    }
  }

  // Delete User Data (Privacy)
  async deleteUserData(userId) {
    try {
      // Delete from Redis (STM)
      await this.redis.del(`stm:${userId}`);
      
      // Delete from MySQL (LTM)
      await this.mysql.execute('DELETE FROM memory_entries WHERE user_id = ?', [userId]);
      await this.mysql.execute('DELETE FROM conversations WHERE user_id = ?', [userId]);
      
      console.log(`[PRIVACY] Deleted all data for user ${userId}`);
    } catch (error) {
      console.error('[PRIVACY] Data deletion error:', error);
      throw error;
    }
  }

  // Export User Data (Privacy)
  async exportUserData(userId) {
    try {
      const stmData = await this.getFromSTM(userId, 10000);
      const ltmData = await this.getFromLTM(userId, 10000);
      const conversations = await this.getUserConversationHistory(userId, 1000);
      
      return {
        userId,
        exportDate: new Date(),
        shortTermMemory: stmData,
        longTermMemory: ltmData,
        conversations,
        totalEntries: stmData.length + ltmData.length
      };
    } catch (error) {
      console.error('[PRIVACY] Data export error:', error);
      throw error;
    }
  }
}