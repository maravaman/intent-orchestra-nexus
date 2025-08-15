import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export class MemoryManager {
  constructor(mysqlConnection) {
    this.mysql = mysqlConnection;
  }

  generateId() {
    return uuidv4();
  }

  generateQueryHash(query) {
    return crypto.createHash('sha256').update(query.toLowerCase().trim()).digest('hex');
  }

  // Store conversation with all responses
  async storeConversation(conversationData) {
    try {
      const conversationId = conversationData.queryId || this.generateId();
      const queryHash = this.generateQueryHash(conversationData.query);

      // Store main conversation
      await this.mysql.execute(
        'INSERT INTO conversations (id, user_id, session_id, query, query_hash, responses, total_execution_time, agent_count, agents_used, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          conversationId,
          conversationData.userId,
          conversationData.sessionId,
          conversationData.query,
          queryHash,
          JSON.stringify(conversationData.responses),
          conversationData.totalExecutionTime,
          conversationData.responses.length,
          JSON.stringify(conversationData.responses.map(r => r.agentId)),
          conversationData.timestamp || new Date()
        ]
      );

      // Store individual memory entries
      await this.storeMemoryEntry(conversationData.userId, {
        sessionId: conversationData.sessionId,
        conversationId: conversationId,
        type: 'query',
        content: conversationData.query,
        metadata: {
          queryId: conversationId,
          agentCount: conversationData.responses.length,
          executionTime: conversationData.totalExecutionTime,
          queryHash: queryHash
        },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days for STM
      });

      // Store each agent response
      for (const response of conversationData.responses) {
        await this.storeMemoryEntry(conversationData.userId, {
          sessionId: conversationData.sessionId,
          conversationId: conversationId,
          type: 'response',
          content: response.response,
          agentId: response.agentId,
          metadata: {
            agentName: response.agentName,
            confidence: response.confidence,
            executionTime: response.executionTime,
            relevanceScore: response.relevanceScore,
            inputTokens: response.inputTokens,
            outputTokens: response.outputTokens
          },
          relevanceScore: response.relevanceScore,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days for STM
        });

        // Store agent interaction details
        await this.storeAgentInteraction({
          conversationId: conversationId,
          agentId: response.agentId,
          userId: conversationData.userId,
          query: conversationData.query,
          response: response.response,
          inputTokens: response.inputTokens || 0,
          outputTokens: response.outputTokens || 0,
          executionTime: response.executionTime,
          confidenceScore: response.confidence,
          relevanceScore: response.relevanceScore,
          modelUsed: response.model || 'unknown'
        });
      }

      console.log(`[MEMORY] Stored conversation: ${conversationId} for user ${conversationData.userId}`);
      return conversationId;
    } catch (error) {
      console.error('[MEMORY] Store conversation error:', error);
      throw error;
    }
  }

  // Store individual memory entry
  async storeMemoryEntry(userId, entry) {
    try {
      const memoryId = this.generateId();
      const embedding = entry.embeddingVector ? JSON.stringify(entry.embeddingVector) : null;

      await this.mysql.execute(
        'INSERT INTO memory_entries (id, user_id, session_id, conversation_id, type, content, metadata, agent_id, relevance_score, embedding_vector, expires_at, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          memoryId,
          userId,
          entry.sessionId,
          entry.conversationId || null,
          entry.type,
          entry.content,
          JSON.stringify(entry.metadata || {}),
          entry.agentId || null,
          entry.relevanceScore || 0,
          embedding,
          entry.expiresAt || null,
          entry.timestamp || new Date()
        ]
      );

      return memoryId;
    } catch (error) {
      console.error('[MEMORY] Store memory entry error:', error);
      throw error;
    }
  }

  // Store agent interaction details
  async storeAgentInteraction(interaction) {
    try {
      const interactionId = this.generateId();

      await this.mysql.execute(
        'INSERT INTO agent_interactions (id, conversation_id, agent_id, user_id, query, response, input_tokens, output_tokens, execution_time, confidence_score, relevance_score, model_used, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          interactionId,
          interaction.conversationId,
          interaction.agentId,
          interaction.userId,
          interaction.query,
          interaction.response,
          interaction.inputTokens,
          interaction.outputTokens,
          interaction.executionTime,
          interaction.confidenceScore,
          interaction.relevanceScore,
          interaction.modelUsed,
          new Date()
        ]
      );

      return interactionId;
    } catch (error) {
      console.error('[MEMORY] Store agent interaction error:', error);
      throw error;
    }
  }

  // Get user conversation history
  async getUserConversationHistory(userId, limit = 20, offset = 0) {
    try {
      const [conversations] = await this.mysql.execute(
        'SELECT * FROM conversations WHERE user_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [userId, limit, offset]
      );

      return conversations.map(conv => ({
        queryId: conv.id,
        userId: conv.user_id,
        sessionId: conv.session_id,
        query: conv.query,
        responses: JSON.parse(conv.responses || '[]'),
        totalExecutionTime: conv.total_execution_time,
        agentCount: conv.agent_count,
        agentsUsed: JSON.parse(conv.agents_used || '[]'),
        timestamp: conv.timestamp
      }));
    } catch (error) {
      console.error('[MEMORY] Get conversation history error:', error);
      return [];
    }
  }

  // Search user memory
  async searchUserMemory(userId, searchTerm, limit = 50) {
    try {
      const searchPattern = `%${searchTerm.toLowerCase()}%`;
      
      const [results] = await this.mysql.execute(
        'SELECT * FROM memory_entries WHERE user_id = ? AND (LOWER(content) LIKE ? OR LOWER(JSON_EXTRACT(metadata, "$.agentName")) LIKE ?) AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY timestamp DESC LIMIT ?',
        [userId, searchPattern, searchPattern, limit]
      );

      return results.map(entry => ({
        id: entry.id,
        userId: entry.user_id,
        sessionId: entry.session_id,
        conversationId: entry.conversation_id,
        type: entry.type,
        content: entry.content,
        metadata: JSON.parse(entry.metadata || '{}'),
        agentId: entry.agent_id,
        relevanceScore: entry.relevance_score,
        timestamp: entry.timestamp
      }));
    } catch (error) {
      console.error('[MEMORY] Search memory error:', error);
      return [];
    }
  }

  // Get relevant context for agents
  async getRelevantContext(userId, query, limit = 5) {
    try {
      const keywords = query.toLowerCase().split(' ').filter(word => word.length > 2);
      
      if (keywords.length === 0) {
        // Get recent entries if no keywords
        const [entries] = await this.mysql.execute(
          'SELECT * FROM memory_entries WHERE user_id = ? AND type IN ("query", "response") AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY timestamp DESC LIMIT ?',
          [userId, limit]
        );

        return entries.map(entry => ({
          id: entry.id,
          type: entry.type,
          content: entry.content,
          metadata: JSON.parse(entry.metadata || '{}'),
          timestamp: entry.timestamp
        }));
      }

      // Search for keyword matches
      const searchConditions = keywords.map(() => 'LOWER(content) LIKE ?').join(' OR ');
      const searchParams = [userId, ...keywords.map(k => `%${k}%`), limit];

      const [entries] = await this.mysql.execute(
        `SELECT * FROM memory_entries WHERE user_id = ? AND (${searchConditions}) AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY relevance_score DESC, timestamp DESC LIMIT ?`,
        searchParams
      );

      return entries.map(entry => ({
        id: entry.id,
        type: entry.type,
        content: entry.content,
        metadata: JSON.parse(entry.metadata || '{}'),
        timestamp: entry.timestamp
      }));
    } catch (error) {
      console.error('[MEMORY] Get relevant context error:', error);
      return [];
    }
  }

  // Get memory statistics
  async getMemoryStats(userId) {
    try {
      // STM stats (entries with expiration)
      const [stmStats] = await this.mysql.execute(
        'SELECT COUNT(*) as total, COUNT(CASE WHEN type = "query" THEN 1 END) as queries, COUNT(CASE WHEN type = "response" THEN 1 END) as responses, MIN(timestamp) as oldest FROM memory_entries WHERE user_id = ? AND expires_at IS NOT NULL AND expires_at > NOW()',
        [userId]
      );

      // LTM stats (entries without expiration)
      const [ltmStats] = await this.mysql.execute(
        'SELECT COUNT(*) as total, COUNT(CASE WHEN type = "query" THEN 1 END) as queries, COUNT(CASE WHEN type = "response" THEN 1 END) as responses, MIN(timestamp) as oldest FROM memory_entries WHERE user_id = ? AND expires_at IS NULL',
        [userId]
      );

      // Conversation stats
      const [convStats] = await this.mysql.execute(
        'SELECT COUNT(*) as total_conversations, AVG(total_execution_time) as avg_execution_time, AVG(agent_count) as avg_agents_per_query FROM conversations WHERE user_id = ?',
        [userId]
      );

      return {
        stm: {
          totalEntries: stmStats[0].total,
          queries: stmStats[0].queries,
          responses: stmStats[0].responses,
          oldestEntry: stmStats[0].oldest
        },
        ltm: {
          totalEntries: ltmStats[0].total,
          queries: ltmStats[0].queries,
          responses: ltmStats[0].responses,
          oldestEntry: ltmStats[0].oldest
        },
        conversations: {
          total: convStats[0].total_conversations,
          avgExecutionTime: Math.round(convStats[0].avg_execution_time || 0),
          avgAgentsPerQuery: Math.round(convStats[0].avg_agents_per_query || 0)
        }
      };
    } catch (error) {
      console.error('[MEMORY] Get memory stats error:', error);
      return {
        stm: { totalEntries: 0, queries: 0, responses: 0, oldestEntry: null },
        ltm: { totalEntries: 0, queries: 0, responses: 0, oldestEntry: null },
        conversations: { total: 0, avgExecutionTime: 0, avgAgentsPerQuery: 0 }
      };
    }
  }

  // Clean expired entries
  async cleanExpiredEntries() {
    try {
      const [result] = await this.mysql.execute(
        'DELETE FROM memory_entries WHERE expires_at IS NOT NULL AND expires_at < NOW()'
      );

      if (result.affectedRows > 0) {
        console.log(`[MEMORY] Cleaned ${result.affectedRows} expired entries`);
      }

      return result.affectedRows;
    } catch (error) {
      console.error('[MEMORY] Clean expired entries error:', error);
      return 0;
    }
  }

  // Delete all user data (GDPR compliance)
  async deleteUserData(userId) {
    try {
      // Delete in correct order due to foreign key constraints
      await this.mysql.execute('DELETE FROM agent_interactions WHERE user_id = ?', [userId]);
      await this.mysql.execute('DELETE FROM memory_entries WHERE user_id = ?', [userId]);
      await this.mysql.execute('DELETE FROM conversations WHERE user_id = ?', [userId]);
      await this.mysql.execute('DELETE FROM user_sessions WHERE user_id = ?', [userId]);

      console.log(`[MEMORY] Deleted all data for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('[MEMORY] Delete user data error:', error);
      throw error;
    }
  }

  // Export user data (GDPR compliance)
  async exportUserData(userId) {
    try {
      const [conversations] = await this.mysql.execute(
        'SELECT * FROM conversations WHERE user_id = ? ORDER BY timestamp DESC',
        [userId]
      );

      const [memoryEntries] = await this.mysql.execute(
        'SELECT * FROM memory_entries WHERE user_id = ? ORDER BY timestamp DESC',
        [userId]
      );

      const [interactions] = await this.mysql.execute(
        'SELECT * FROM agent_interactions WHERE user_id = ? ORDER BY timestamp DESC',
        [userId]
      );

      return {
        userId,
        exportDate: new Date(),
        conversations: conversations.map(conv => ({
          ...conv,
          responses: JSON.parse(conv.responses || '[]'),
          agents_used: JSON.parse(conv.agents_used || '[]')
        })),
        memoryEntries: memoryEntries.map(entry => ({
          ...entry,
          metadata: JSON.parse(entry.metadata || '{}')
        })),
        agentInteractions: interactions,
        totalRecords: conversations.length + memoryEntries.length + interactions.length
      };
    } catch (error) {
      console.error('[MEMORY] Export user data error:', error);
      throw error;
    }
  }
}