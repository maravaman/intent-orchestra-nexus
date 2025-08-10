import { User, UserPreferences } from '@/types/agent';
import { memoryService } from './memoryService';

export class UserService {
  private users: Map<string, User> = new Map();
  private activeSessions: Map<string, string> = new Map(); // sessionId -> userId

  generateUserId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async createUser(name?: string, email?: string): Promise<User> {
    const userId = this.generateUserId();
    const sessionId = this.generateSessionId();
    
    const user: User = {
      id: userId,
      name: name || `User ${userId.slice(-6)}`,
      email,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      sessionId,
      preferences: {
        preferredAgents: [],
        responseFormat: 'detailed',
        language: 'en'
      }
    };
    
    this.users.set(userId, user);
    this.activeSessions.set(sessionId, userId);
    
    // Store user creation in LTM
    await memoryService.storeInLTM(userId, {
      userId,
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
    return user;
  }

  async getUser(userId: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (user) {
      user.lastActiveAt = new Date();
      this.users.set(userId, user);
    }
    return user;
  }

  async getUserBySession(sessionId: string): Promise<User | undefined> {
    const userId = this.activeSessions.get(sessionId);
    if (userId) {
      return this.getUser(userId);
    }
    return undefined;
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.preferences = { ...user.preferences, ...preferences };
      user.lastActiveAt = new Date();
      this.users.set(userId, user);
      
      // Store preference update in LTM
      await memoryService.storeInLTM(userId, {
        userId,
        sessionId: user.sessionId,
        type: 'context',
        content: 'User preferences updated',
        metadata: {
          action: 'preferences_updated',
          preferences
        }
      });
    }
  }

  async getUserStats(userId: string) {
    const user = this.users.get(userId);
    if (!user) return null;

    const memoryStats = await memoryService.getMemoryStats(userId);
    const conversationHistory = await memoryService.getUserConversationHistory(userId, 100);
    
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
        sessionsCount: 1 // For now, one session per user
      },
      memory: memoryStats
    };
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Privacy and Data Management
  async deleteUser(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      this.activeSessions.delete(user.sessionId);
      this.users.delete(userId);
      await memoryService.deleteUserData(userId);
      console.log(`[PRIVACY] User ${userId} and all associated data deleted`);
    }
  }

  async exportUserData(userId: string): Promise<any> {
    const user = this.users.get(userId);
    if (!user) return null;

    const memoryData = await memoryService.exportUserData(userId);
    const stats = await this.getUserStats(userId);
    
    return {
      user,
      stats,
      memoryData,
      exportDate: new Date()
    };
  }

  // Session Management
  async refreshSession(userId: string): Promise<string> {
    const user = this.users.get(userId);
    if (user) {
      // Remove old session
      this.activeSessions.delete(user.sessionId);
      
      // Create new session
      const newSessionId = this.generateSessionId();
      user.sessionId = newSessionId;
      user.lastActiveAt = new Date();
      
      this.users.set(userId, user);
      this.activeSessions.set(newSessionId, userId);
      
      return newSessionId;
    }
    throw new Error('User not found');
  }

  async getActiveSessionsCount(): Promise<number> {
    return this.activeSessions.size;
  }
}

export const userService = new UserService();