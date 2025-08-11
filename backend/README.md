# Multi-Agent Backend System

A comprehensive backend system built with LangGraph for orchestrating multiple AI agents with memory management and user privacy controls.

## 🏗️ Architecture

This backend implements the exact architecture shown in your diagram:

```
Client Request (POST /run_graph)
           ↓
    LangGraph Orchestrator
           ↓
    Registered Agents ←→ Edge Map
           ↓
    Memory Manager (STM/LTM)
           ↓
    Redis (STM) + MySQL (LTM)
```

## 🚀 Features

### 🤖 Multi-Agent System
- **4 Specialized Agents**: Scenic, River, Park, and Search agents
- **LangGraph Orchestration**: State-based workflow management
- **Intelligent Routing**: Automatic agent selection based on query analysis
- **Parallel Processing**: All relevant agents process queries simultaneously

### 🧠 Advanced Memory Management
- **STM (Redis)**: Short-term memory with 7-day auto-expiration
- **LTM (MySQL)**: Permanent conversation history storage
- **Context Retrieval**: Agents access relevant user history
- **Memory Statistics**: Real-time tracking and analytics

### 🔐 Privacy & Security
- **Unique User IDs**: Cryptographically secure user identification
- **Data Export**: GDPR-compliant data portability
- **Data Deletion**: Complete user data removal
- **Rate Limiting**: Protection against abuse
- **Security Headers**: Comprehensive security middleware

### 📊 Edge Communication
- **Agent-to-Agent Communication**: Based on configurable rules
- **Priority-based Routing**: High/medium/low priority edge rules
- **Conditional Logic**: Smart agent communication triggers

## 🛠️ Installation

### Prerequisites
- Node.js 18+ 
- Redis Server
- MySQL 8.0+
- OpenAI API Key (optional, for enhanced responses)

### Setup

1. **Clone and Install**
```bash
cd backend
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. **Database Setup**
```bash
# Start Redis
redis-server

# Start MySQL and create database
mysql -u root -p
CREATE DATABASE multiagent_ltm;
```

4. **Start the Server**
```bash
# Development
npm run dev

# Production
npm start
```

## 📡 API Endpoints

### Core Endpoints

#### `POST /api/run_graph`
Main query processing endpoint (matches your diagram)
```json
{
  "query": "Show me scenic places near rivers",
  "userId": "user-1234567890-abc123",
  "sessionId": "session-1234567890-def456"
}
```

#### `POST /api/users`
Create a new user with unique ID
```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

#### `GET /api/users/:userId/conversations`
Retrieve user's conversation history

#### `GET /api/users/:userId/search?q=scenic`
Search user's memory for specific terms

### System Endpoints

#### `GET /api/health`
Health check for all services

#### `GET /api/agents`
Get information about all registered agents

#### `GET /api/system/status`
Complete system status and metrics

## 🔧 Configuration

### Agent Configuration (`src/config/agents.json`)
```json
{
  "agents": [
    {
      "id": "scenic-agent",
      "name": "Scenic Agent",
      "type": "scenic",
      "keywords": ["scenic", "beautiful", "view"],
      "enabled": true
    }
  ],
  "edge_rules": [
    {
      "from": "scenic-agent",
      "to": "river-agent",
      "condition": "location.type === 'water-adjacent'",
      "priority": "high"
    }
  ]
}
```

### Environment Variables
```env
# Server
PORT=3001
NODE_ENV=development

# Databases
REDIS_HOST=localhost
REDIS_PORT=6379
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=multiagent_ltm

# Security
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
```

## 🏃‍♂️ Usage Examples

### 1. Create a User
```bash
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com"}'
```

### 2. Process a Query
```bash
curl -X POST http://localhost:3001/api/run_graph \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Beautiful scenic places with rivers and parks",
    "userId": "user-1234567890-abc123",
    "sessionId": "session-1234567890-def456"
  }'
```

### 3. Get Conversation History
```bash
curl http://localhost:3001/api/users/user-1234567890-abc123/conversations?limit=10
```

## 🔍 How It Works

### 1. Query Processing Flow
1. **Client Request** → POST /run_graph
2. **LangGraph Orchestrator** → Analyzes query
3. **Agent Routing** → Selects relevant agents
4. **Parallel Execution** → All agents process simultaneously
5. **Memory Storage** → Results stored in STM/LTM
6. **Response Aggregation** → Combined response returned

### 2. Memory Management
- **STM (Redis)**: Recent interactions, 7-day expiry
- **LTM (MySQL)**: Permanent conversation history
- **Context Retrieval**: Agents access relevant past conversations

### 3. Agent Communication
- **Edge Rules**: Configurable agent-to-agent communication
- **Priority System**: High/medium/low priority routing
- **Conditional Logic**: Smart triggers for agent collaboration

## 🧪 Testing

```bash
# Run health check
curl http://localhost:3001/api/health

# Test query processing
curl -X POST http://localhost:3001/api/run_graph \
  -H "Content-Type: application/json" \
  -d '{"query": "scenic places", "userId": "test-user"}'
```

## 📊 Monitoring

### Logs
- **Error logs**: `logs/error.log`
- **Combined logs**: `logs/combined.log`
- **Console output**: Real-time in development

### Metrics
- Memory usage statistics
- Agent performance metrics
- Query processing times
- User activity tracking

## 🔒 Security Features

- **Rate Limiting**: 100 requests per 15 minutes
- **Query Rate Limiting**: 10 queries per minute
- **Input Sanitization**: XSS protection
- **Security Headers**: Helmet.js integration
- **CORS Configuration**: Configurable origins
- **Error Handling**: No sensitive data leakage

## 🚀 Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Configure production database URLs
3. Set up SSL certificates
4. Configure reverse proxy (nginx)
5. Set up monitoring and logging

### Docker Support (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 🤝 Integration with Frontend

The backend is designed to work seamlessly with your existing frontend. Update your frontend API calls to point to:

```javascript
const API_BASE_URL = 'http://localhost:3001/api';

// Process query
const response = await fetch(`${API_BASE_URL}/run_graph`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, userId, sessionId })
});
```

## 📈 Performance

- **Parallel Agent Processing**: All agents execute simultaneously
- **Redis Caching**: Fast STM retrieval
- **Connection Pooling**: Efficient database connections
- **Memory Management**: Automatic cleanup and optimization

This backend provides a production-ready, scalable multi-agent system that perfectly matches your architecture diagram and integrates seamlessly with your frontend application.