import { v4 as uuidv4 } from 'uuid';
import { ScenicAgent } from '../agents/ScenicAgent.js';
import { RiverAgent } from '../agents/RiverAgent.js';
import { ParkAgent } from '../agents/ParkAgent.js';
import { SearchAgent } from '../agents/SearchAgent.js';

export class AgentManager {
  constructor(mysqlConnection, memoryManager, ollamaService) {
    this.mysql = mysqlConnection;
    this.memoryManager = memoryManager;
    this.ollamaService = ollamaService;
    this.agents = new Map();
    this.agentClasses = {
      'scenic': ScenicAgent,
      'river': RiverAgent,
      'park': ParkAgent,
      'search': SearchAgent
    };
  }

  async initialize() {
    try {
      console.log('🤖 Initializing Agent Manager...');
      
      // Load default agents if none exist
      await this.loadDefaultAgents();
      
      // Load agents from database
      await this.loadAgentsFromDB();
      
      console.log(`✅ Agent Manager initialized with ${this.agents.size} agents`);
    } catch (error) {
      console.error('❌ Agent Manager initialization failed:', error);
      throw error;
    }
  }

  async loadDefaultAgents() {
    try {
      const [existingAgents] = await this.mysql.execute('SELECT COUNT(*) as count FROM agents');
      
      if (existingAgents[0].count === 0) {
        console.log('📦 Loading default agents...');
        
        const defaultAgents = [
          {
            id: 'scenic-agent',
            name: 'Scenic Agent',
            type: 'scenic',
            description: 'Specializes in scenic locations, viewpoints, and tourist attractions',
            capabilities: ['location_search', 'scenic_recommendations', 'tourism_info', 'photography_spots'],
            keywords: ['scenic', 'beautiful', 'view', 'tourist', 'attraction', 'place', 'visit', 'sightseeing', 'landscape', 'mountain', 'hill', 'sunset', 'sunrise', 'photography'],
            priority: 1,
            enabled: true
          },
          {
            id: 'river-agent',
            name: 'River Agent',
            type: 'river',
            description: 'Expert in rivers, lakes, waterfalls, and aquatic activities',
            capabilities: ['water_bodies', 'river_info', 'aquatic_activities', 'fishing_spots', 'water_sports'],
            keywords: ['river', 'water', 'lake', 'stream', 'waterfall', 'aquatic', 'fishing', 'boating', 'swimming', 'dam', 'reservoir', 'creek', 'pond'],
            priority: 2,
            enabled: true
          },
          {
            id: 'park-agent',
            name: 'Park Agent',
            type: 'park',
            description: 'Handles parks, gardens, recreational areas, and outdoor activities',
            capabilities: ['parks', 'recreation', 'outdoor_activities', 'facilities', 'family_spots'],
            keywords: ['park', 'playground', 'recreation', 'outdoor', 'picnic', 'garden', 'trail', 'hiking', 'walking', 'family', 'children', 'sports', 'camping'],
            priority: 3,
            enabled: true
          },
          {
            id: 'search-agent',
            name: 'Search Agent',
            type: 'search',
            description: 'Searches through user history and provides contextual information',
            capabilities: ['memory_search', 'historical_data', 'context_retrieval', 'pattern_analysis'],
            keywords: ['past', 'history', 'previous', 'remember', 'before', 'earlier', 'search', 'find', 'show me my'],
            priority: 4,
            enabled: true
          }
        ];

        for (const agentConfig of defaultAgents) {
          await this.createAgent(agentConfig, 'system');
        }
        
        console.log('✅ Default agents loaded successfully');
      }
    } catch (error) {
      console.error('❌ Failed to load default agents:', error);
      throw error;
    }
  }

  async loadAgentsFromDB() {
    try {
      const [agents] = await this.mysql.execute(
        'SELECT * FROM agents WHERE enabled = TRUE ORDER BY priority ASC'
      );

      for (const agentData of agents) {
        const AgentClass = this.agentClasses[agentData.type];
        if (AgentClass) {
          const agentConfig = {
            id: agentData.id,
            name: agentData.name,
            type: agentData.type,
            description: agentData.description,
            capabilities: JSON.parse(agentData.capabilities || '[]'),
            keywords: JSON.parse(agentData.keywords || '[]'),
            systemPrompt: agentData.system_prompt,
            modelConfig: JSON.parse(agentData.model_config || '{}'),
            priority: agentData.priority,
            enabled: agentData.enabled
          };

          const agent = new AgentClass(agentConfig, this.memoryManager, this.ollamaService);
          this.agents.set(agentData.id, agent);
          
          console.log(`✅ Loaded agent: ${agentData.name}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load agents from database:', error);
      throw error;
    }
  }

  async createAgent(agentConfig, createdBy = null) {
    try {
      const agentId = agentConfig.id || `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Validate agent type
      if (!this.agentClasses[agentConfig.type]) {
        throw new Error(`Unsupported agent type: ${agentConfig.type}`);
      }

      // Insert into database
      await this.mysql.execute(
        'INSERT INTO agents (id, name, type, description, capabilities, keywords, system_prompt, model_config, enabled, priority, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          agentId,
          agentConfig.name,
          agentConfig.type,
          agentConfig.description,
          JSON.stringify(agentConfig.capabilities || []),
          JSON.stringify(agentConfig.keywords || []),
          agentConfig.systemPrompt || null,
          JSON.stringify(agentConfig.modelConfig || {}),
          agentConfig.enabled !== false,
          agentConfig.priority || 1,
          createdBy
        ]
      );

      // Create agent instance if enabled
      if (agentConfig.enabled !== false) {
        const AgentClass = this.agentClasses[agentConfig.type];
        const agent = new AgentClass({
          ...agentConfig,
          id: agentId
        }, this.memoryManager, this.ollamaService);
        
        this.agents.set(agentId, agent);
      }

      console.log(`[AGENT_MANAGER] Created agent: ${agentConfig.name} (${agentId})`);
      return agentId;
    } catch (error) {
      console.error('[AGENT_MANAGER] Create agent error:', error);
      throw error;
    }
  }

  async updateAgent(agentId, updates, updatedBy = null) {
    try {
      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];

      if (updates.name) {
        updateFields.push('name = ?');
        updateValues.push(updates.name);
      }
      if (updates.description) {
        updateFields.push('description = ?');
        updateValues.push(updates.description);
      }
      if (updates.capabilities) {
        updateFields.push('capabilities = ?');
        updateValues.push(JSON.stringify(updates.capabilities));
      }
      if (updates.keywords) {
        updateFields.push('keywords = ?');
        updateValues.push(JSON.stringify(updates.keywords));
      }
      if (updates.systemPrompt) {
        updateFields.push('system_prompt = ?');
        updateValues.push(updates.systemPrompt);
      }
      if (updates.modelConfig) {
        updateFields.push('model_config = ?');
        updateValues.push(JSON.stringify(updates.modelConfig));
      }
      if (updates.enabled !== undefined) {
        updateFields.push('enabled = ?');
        updateValues.push(updates.enabled);
      }
      if (updates.priority) {
        updateFields.push('priority = ?');
        updateValues.push(updates.priority);
      }

      updateFields.push('updated_at = ?');
      updateValues.push(new Date());
      updateValues.push(agentId);

      await this.mysql.execute(
        `UPDATE agents SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Reload agent if it exists
      if (this.agents.has(agentId)) {
        await this.reloadAgent(agentId);
      }

      console.log(`[AGENT_MANAGER] Updated agent: ${agentId}`);
      return true;
    } catch (error) {
      console.error('[AGENT_MANAGER] Update agent error:', error);
      throw error;
    }
  }

  async deleteAgent(agentId, deletedBy = null) {
    try {
      // Remove from memory
      this.agents.delete(agentId);

      // Delete from database
      await this.mysql.execute('DELETE FROM agents WHERE id = ?', [agentId]);

      console.log(`[AGENT_MANAGER] Deleted agent: ${agentId}`);
      return true;
    } catch (error) {
      console.error('[AGENT_MANAGER] Delete agent error:', error);
      throw error;
    }
  }

  async reloadAgent(agentId) {
    try {
      const [agents] = await this.mysql.execute(
        'SELECT * FROM agents WHERE id = ?',
        [agentId]
      );

      if (agents.length === 0) {
        this.agents.delete(agentId);
        return false;
      }

      const agentData = agents[0];
      const AgentClass = this.agentClasses[agentData.type];
      
      if (AgentClass && agentData.enabled) {
        const agentConfig = {
          id: agentData.id,
          name: agentData.name,
          type: agentData.type,
          description: agentData.description,
          capabilities: JSON.parse(agentData.capabilities || '[]'),
          keywords: JSON.parse(agentData.keywords || '[]'),
          systemPrompt: agentData.system_prompt,
          modelConfig: JSON.parse(agentData.model_config || '{}'),
          priority: agentData.priority,
          enabled: agentData.enabled
        };

        const agent = new AgentClass(agentConfig, this.memoryManager, this.ollamaService);
        this.agents.set(agentId, agent);
        return true;
      } else {
        this.agents.delete(agentId);
        return false;
      }
    } catch (error) {
      console.error('[AGENT_MANAGER] Reload agent error:', error);
      return false;
    }
  }

  async getAllAgents() {
    try {
      const [agents] = await this.mysql.execute(
        'SELECT * FROM agents ORDER BY priority ASC, name ASC'
      );

      return agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        description: agent.description,
        capabilities: JSON.parse(agent.capabilities || '[]'),
        keywords: JSON.parse(agent.keywords || '[]'),
        enabled: agent.enabled,
        priority: agent.priority,
        createdAt: agent.created_at,
        updatedAt: agent.updated_at
      }));
    } catch (error) {
      console.error('[AGENT_MANAGER] Get all agents error:', error);
      return [];
    }
  }

  getActiveAgents() {
    return Array.from(this.agents.values());
  }

  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  async routeQuery(query) {
    const queryLower = query.toLowerCase();
    const relevantAgents = [];

    for (const [agentId, agent] of this.agents) {
      if (agent.isRelevant && agent.isRelevant(query)) {
        const relevanceScore = agent.calculateRelevanceScore ? agent.calculateRelevanceScore(query) : 1;
        relevantAgents.push({
          agent,
          relevanceScore
        });
      }
    }

    // Always include search agent for context if available
    const searchAgent = this.agents.get('search-agent');
    if (searchAgent && !relevantAgents.find(ra => ra.agent.id === 'search-agent')) {
      relevantAgents.push({
        agent: searchAgent,
        relevanceScore: 1
      });
    }

    // If no specific agents matched, use the first available agent
    if (relevantAgents.length === 0 && this.agents.size > 0) {
      const firstAgent = this.agents.values().next().value;
      relevantAgents.push({
        agent: firstAgent,
        relevanceScore: 1
      });
    }

    // Sort by relevance score
    relevantAgents.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return relevantAgents;
  }

  getStats() {
    return {
      totalAgents: this.agents.size,
      enabledAgents: this.agents.size,
      agentTypes: Array.from(this.agents.values()).map(agent => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        capabilities: agent.capabilities?.length || 0,
        enabled: agent.enabled
      }))
    };
  }
}