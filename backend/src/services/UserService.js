import { v4 as uuidv4 } from 'uuid';

export class UserService {
  constructor(mysqlConnection, memoryManager) {
    this.mysql = mysqlConnection;
    this.memoryManager = memoryManager;
  }

  generateUserId() {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async createUser(name, email) {
    try {
      const userId = this.generateUserId();
      const sessionId = this.generateSessionId();
      
      const user = {
        id: userId,
        name: name || `User ${userId.slice(-6)}`,
        email: email || null,
        session_id: sessionId,
        preferences: JSON.stringify({
          preferredAgents: [],
          responseFormat: 'detailed',
          language: 'en'
        }),
        created_at: new Date(),
        updated_at: new Date()
      };
      
      await this.mysql.execute(
        'INSERT INTO users (id, name, email, session_id, preferences, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [user.id, user.name, user.email, user.session_id, user.preferences, user.created_at, user.updated_at]
      );
      
      // Store user creation in LTM
      await this.memoryManager.storeInLTM(userId, {
        sessionId,
        type: 'context',
        content: 'User account created',
        metadata: {
          action: 'user_created',
          name: user.name,
          email: user.email
        }
      });
      
      console.log(`[USER] Created user: ${userId} with session: ${sessionId}`);
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        sessionId: user.session_id,
        preferences: JSON.parse(user.preferences),
        createdAt: user.created_at,
        lastActiveAt: user.updated_at
      };
    } catch (error) {
      console.error('[USER] Creation error:', error);
      throw error;
    }
  }

  async getUser(userId) {
    try {
      const [rows] = await this.mysql.execute(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      const user = rows[0];
      
      // Update last active
      await this.mysql.execute(
        'UPDATE users SET updated_at = ? WHERE id = ?',
        [new Date(), userId]
      );
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        sessionId: user.session_id,
        preferences: JSON.parse(user.preferences),
        createdAt: user.created_at,
        lastActiveAt: new Date()
      };
    } catch (error) {
      console.error('[USER] Retrieval error:', error);
      return null;
    }
  }

  async updateUserPreferences(userId, preferences) {
    try {
      const [rows] = await this.mysql.execute(
        'SELECT preferences FROM users WHERE id = ?',
        [userId]
      );
      
      if (rows.length === 0) {
        throw new Error('User not found');
      }
      
      const currentPreferences = JSON.parse(rows[0].preferences);
      const updatedPreferences = { ...currentPreferences, ...preferences };
      
      await this.mysql.execute(
        'UPDATE users SET preferences = ?, updated_at = ? WHERE id = ?',
        [JSON.stringify(updatedPreferences), new Date(), userId]
      );
      
      // Store preference update in LTM
      await this.memoryManager.storeInLTM(userId, {
        sessionId: await this.getSessionId(userId),
        type: 'context',
        content: 'User preferences updated',
        metadata: {
          action: 'preferences_updated',
          preferences
        }
      });
      
      console.log(`[USER] Updated preferences for user: ${userId}`);
    } catch (error) {
      console.error('[USER] Preference update error:', error);
      throw error;
    }
  }

  async getSessionId(userId) {
    try {
      const [rows] = await this.mysql.execute(
        'SELECT session_id FROM users WHERE id = ?',
        [userId]
      );
      
      return rows.length > 0 ? rows[0].session_id : null;
    } catch (error) {
      console.error('[USER] Session retrieval error:', error);
      return null;
    }
  }

  async getUserStats(userId) {
    try {
      const user = await this.getUser(userId);
      if (!user) return null;

      const memoryStats = await this.memoryManager.getMemoryStats(userId);
      const conversationHistory = await this.memoryManager.getUserConversationHistory(userId, 100);
      
      const totalQueries = conversationHistory.length;
      const avgResponseTime = totalQueries > 0 
        ? conversationHistory.reduce((sum, q) => sum + q.totalExecutionTime, 0) / totalQueries 
        : 0;

      return {
        user: {
          id: user.id,
          name: user.name,
          createdAt: user.createdAt,
          lastActiveAt: user.lastActiveAt,
          sessionId: user.sessionId
        },
        activity: {
          totalQueries,
          avgResponseTime: Math.round(avgResponseTime),
          lastQueryTime: conversationHistory[0]?.timestamp,
          sessionsCount: 1
        },
        memory: memoryStats
      };
    } catch (error) {
      console.error('[USER] Stats error:', error);
      return null;
    }
  }

  async deleteUser(userId) {
    try {
      await this.memoryManager.deleteUserData(userId);
      await this.mysql.execute('DELETE FROM users WHERE id = ?', [userId]);
      
      console.log(`[PRIVACY] User ${userId} and all associated data deleted`);
    } catch (error) {
      console.error('[PRIVACY] User deletion error:', error);
      throw error;
    }
  }

  async exportUserData(userId) {
    try {
      const user = await this.getUser(userId);
      if (!user) return null;

      const memoryData = await this.memoryManager.exportUserData(userId);
      const stats = await this.getUserStats(userId);
      
      return {
        user,
        stats,
        memoryData,
        exportDate: new Date()
      };
    } catch (error) {
      console.error('[PRIVACY] Data export error:', error);
      throw error;
    }
  }
}