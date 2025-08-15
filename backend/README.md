# Perfect Multi-Agent Framework with LangGraph & Ollama

A comprehensive multi-agent system built with LangGraph orchestration, local Ollama LLM integration, and complete user privacy controls.

## 🏗️ Architecture

This backend implements the exact architecture from your diagram:

```
Client Request (POST /run_graph)
           ↓
    LangGraph Orchestrator
           ↓
    Registered Agents ←→ Edge Map
           ↓
    Memory Manager (STM/LTM)
           ↓
    MySQL Database
```

## 🚀 Features

### 🤖 Perfect Multi-Agent Framework
- **4 Specialized Agents**: Scenic, River, Park, and Search agents
- **LangGraph Orchestration**: State-based workflow management
- **Intelligent Routing**: Automatic agent selection based on query analysis
- **Parallel Processing**: All relevant agents process queries simultaneously
- **Dynamic Agent Management**: Add/delete agents without code changes

### 🧠 Advanced Memory Management
- **STM (Short-Term Memory)**: 7-day auto-expiring entries
- **LTM (Long-Term Memory)**: Permanent conversation history storage
- **Context Retrieval**: Agents access relevant user history
- **Memory Statistics**: Real-time tracking and analytics

### 🔐 Complete User Authentication & Privacy
- **User Registration/Login**: Secure JWT-based authentication
- **Unique User IDs**: Cryptographically secure user identification
- **Session Management**: Secure session tracking
- **GDPR Compliance**: Complete data export and deletion
- **Privacy Controls**: User owns and controls their data

### 🤖 Local Ollama LLM Integration
- **100% Local**: No external API dependencies
- **Real AI Responses**: Each agent uses Ollama for intelligent responses
- **Model Flexibility**: Easy to switch between different Ollama models
- **Token Tracking**: Complete usage statistics

### 📊 Dynamic Agent System
- **Runtime Agent Management**: Create, update, delete agents dynamically
- **Agent Configuration**: Customizable prompts, keywords, capabilities
- **Performance Metrics**: Track agent performance and usage
- **Priority System**: Agent execution priority management

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- Ollama (local installation)

### 1. Install Ollama
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve

# Pull required model
ollama pull llama3.1:8b
```

### 2. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MySQL credentials
```

### 3. Configure Environment
```env
# Server
PORT=3001
NODE_ENV=development

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=multiagent_ltm

# Security
JWT_SECRET=your_super_secret_jwt_key_here
BCRYPT_ROUNDS=12
```

### 4. Start the Server
```bash
npm run dev
```

## 📡 API Endpoints

### Authentication
```bash
# Register new user
POST /api/auth/register
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "secure123",
  "fullName": "John Doe"
}

# Login
POST /api/auth/login
{
  "username": "john_doe",
  "password": "secure123"
}

# Logout
POST /api/auth/logout
Authorization: Bearer <token>
```

### Query Processing (Main Endpoint)
```bash
# Process multi-agent query
POST /api/run_graph
Authorization: Bearer <token>
{
  "query": "Beautiful scenic rivers with parks nearby"
}
```

### User Management
```bash
# Get user profile
GET /api/users/me
Authorization: Bearer <token>

# Get conversation history
GET /api/users/:userId/conversations?limit=20&offset=0
Authorization: Bearer <token>

# Search user history
GET /api/users/:userId/search?q=scenic&limit=50
Authorization: Bearer <token>

# Get user statistics
GET /api/users/:userId/stats
Authorization: Bearer <token>
```

### Dynamic Agent Management
```bash
# List all agents
GET /api/agents

# Create new agent
POST /api/agents
Authorization: Bearer <token>
{
  "name": "Mountain Agent",
  "type": "scenic",
  "description": "Specializes in mountain locations",
  "capabilities": ["mountain_info", "hiking_trails"],
  "keywords": ["mountain", "peak", "summit", "hiking"],
  "enabled": true,
  "priority": 1
}

# Update agent
PUT /api/agents/:agentId
Authorization: Bearer <token>
{
  "description": "Updated description",
  "keywords": ["mountain", "peak", "summit", "hiking", "trekking"]
}

# Delete agent
DELETE /api/agents/:agentId
Authorization: Bearer <token>
```

### System & Health
```bash
# Health check
GET /api/health

# System status
GET /api/system/status
```

### Privacy & Data
```bash
# Export user data (GDPR)
GET /api/privacy/export
Authorization: Bearer <token>

# Delete account and all data
DELETE /api/privacy/delete-account
Authorization: Bearer <token>
```

## 🎯 How It Works

### 1. User Authentication Flow
1. **Register** → Create account with unique user ID
2. **Login** → Get JWT token for authenticated requests
3. **Query** → Send authenticated requests to `/run_graph`

### 2. Multi-Agent Query Processing
1. **Query Analysis** → LangGraph analyzes query keywords and context
2. **Agent Routing** → Selects relevant agents (can be multiple)
3. **Parallel Execution** → All selected agents process simultaneously using Ollama
4. **Memory Integration** → Context retrieved from user's STM/LTM
5. **Response Aggregation** → Combined intelligent responses with confidence scores
6. **Storage** → Results stored in MySQL with proper relationships

### 3. Dynamic Agent Management
- **Runtime Creation** → Add new agents without restarting server
- **Configuration Updates** → Modify agent behavior dynamically
- **Performance Tracking** → Monitor agent usage and effectiveness

## 🔍 Example Usage

### 1. Register & Login
```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "email": "alice@example.com",
    "password": "secure123",
    "fullName": "Alice Johnson"
  }'

# Login (save the token)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "secure123"
  }'
```

### 2. Process Multi-Agent Query
```bash
curl -X POST http://localhost:3001/api/run_graph \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "query": "Beautiful scenic places with rivers and parks for family recreation"
  }'
```

### 3. View Conversation History
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:3001/api/users/YOUR_USER_ID/conversations?limit=10
```

## 🎯 Key Benefits

✅ **Perfect Multi-Agent Orchestration** - LangGraph manages complex agent workflows  
✅ **100% Local LLM** - No external API dependencies, complete privacy  
✅ **Dynamic Agent Management** - Add/remove agents without code changes  
✅ **Complete User Privacy** - GDPR-compliant data controls  
✅ **Intelligent Memory** - STM/LTM system with context retrieval  
✅ **Production Ready** - Full authentication, rate limiting, security  
✅ **Scalable Architecture** - Easy to extend with new agent types  

## 🔧 Database Schema

The system automatically creates these tables:
- **users** - User accounts and authentication
- **agents** - Dynamic agent configurations
- **conversations** - Complete query-response history
- **memory_entries** - STM/LTM memory storage
- **agent_interactions** - Detailed agent performance metrics
- **user_sessions** - Secure session management

## 🚀 Production Deployment

1. Set `NODE_ENV=production`
2. Configure production MySQL database
3. Set strong JWT secret
4. Configure CORS for your domain
5. Set up SSL/TLS certificates
6. Configure reverse proxy (nginx)
7. Set up monitoring and logging

This backend provides everything you need for a production-ready, privacy-first multi-agent system with complete user control and dynamic agent management! 🎉