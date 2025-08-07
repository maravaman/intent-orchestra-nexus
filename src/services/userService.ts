import { User, QueryResult } from '@/types/agent';

export class UserService {
  private users: Map<string, User> = new Map();

  generateUserId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  createUser(name?: string): User {
    const userId = this.generateUserId();
    const user: User = {
      id: userId,
      name: name || `User ${userId.slice(-6)}`,
      createdAt: new Date(),
      queryHistory: []
    };
    
    this.users.set(userId, user);
    return user;
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  addQueryToHistory(userId: string, queryResult: QueryResult): void {
    const user = this.users.get(userId);
    if (user) {
      user.queryHistory.push(queryResult);
      // Keep only last 50 queries
      if (user.queryHistory.length > 50) {
        user.queryHistory = user.queryHistory.slice(-50);
      }
    }
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  getUserStats(userId: string) {
    const user = this.users.get(userId);
    if (!user) return null;

    const totalQueries = user.queryHistory.length;
    const avgResponseTime = totalQueries > 0 
      ? user.queryHistory.reduce((sum, q) => sum + q.totalExecutionTime, 0) / totalQueries 
      : 0;

    return {
      totalQueries,
      avgResponseTime,
      lastQueryTime: user.queryHistory[user.queryHistory.length - 1]?.timestamp,
      createdAt: user.createdAt
    };
  }
}

export const userService = new UserService();