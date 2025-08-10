export interface Agent {
  id: string;
  name: string;
  type: 'scenic' | 'river' | 'park' | 'search';
  description: string;
  capabilities: string[];
}

export interface AgentResponse {
  agentId: string;
  agentName: string;
  response: string;
  confidence: number;
  executionTime: number;
  timestamp: Date;
  relevanceScore: number;
}

export interface QueryResult {
  queryId: string;
  userId: string;
  query: string;
  responses: AgentResponse[];
  totalExecutionTime: number;
  timestamp: Date;
  sessionId: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  createdAt: Date;
  lastActiveAt: Date;
  sessionId: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  preferredAgents: string[];
  responseFormat: 'detailed' | 'summary';
  language: string;
}

export interface MemoryEntry {
  id: string;
  userId: string;
  sessionId: string;
  type: 'query' | 'response' | 'context';
  content: string;
  metadata: Record<string, any>;
  timestamp: Date;
  expiresAt?: Date;
}

export interface ConversationHistory {
  userId: string;
  conversations: QueryResult[];
  totalQueries: number;
  lastAccessed: Date;
}