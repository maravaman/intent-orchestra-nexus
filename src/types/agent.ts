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
}

export interface QueryResult {
  queryId: string;
  userId: string;
  query: string;
  responses: AgentResponse[];
  totalExecutionTime: number;
  timestamp: Date;
}

export interface User {
  id: string;
  name: string;
  createdAt: Date;
  queryHistory: QueryResult[];
}