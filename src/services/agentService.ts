import { Agent, AgentResponse, QueryResult } from '@/types/agent';

export class AgentService {
  private agents: Agent[] = [
    {
      id: 'scenic-001',
      name: 'Scenic Agent',
      type: 'scenic',
      description: 'Handles scenic location queries and recommendations',
      capabilities: ['location_search', 'scenic_recommendations', 'tourism_info']
    },
    {
      id: 'river-001',
      name: 'River Agent',
      type: 'river',
      description: 'Manages river and water-body related queries',
      capabilities: ['water_bodies', 'river_info', 'aquatic_activities']
    },
    {
      id: 'park-001',
      name: 'Park Agent',
      type: 'park',
      description: 'Processes park and recreational area information',
      capabilities: ['parks', 'recreation', 'outdoor_activities', 'facilities']
    },
    {
      id: 'search-001',
      name: 'Search Agent',
      type: 'search',
      description: 'Vector similarity search across STM and LTM',
      capabilities: ['memory_search', 'historical_data', 'context_retrieval']
    }
  ];

  private determineRelevantAgents(query: string): Agent[] {
    const queryLower = query.toLowerCase();
    const relevantAgents: Agent[] = [];

    // Scenic Agent keywords
    if (queryLower.includes('scenic') || queryLower.includes('beautiful') || 
        queryLower.includes('view') || queryLower.includes('tourist') ||
        queryLower.includes('attraction') || queryLower.includes('place')) {
      relevantAgents.push(this.agents.find(a => a.type === 'scenic')!);
    }

    // River Agent keywords
    if (queryLower.includes('river') || queryLower.includes('water') || 
        queryLower.includes('lake') || queryLower.includes('stream') ||
        queryLower.includes('aquatic') || queryLower.includes('fishing')) {
      relevantAgents.push(this.agents.find(a => a.type === 'river')!);
    }

    // Park Agent keywords
    if (queryLower.includes('park') || queryLower.includes('playground') || 
        queryLower.includes('recreation') || queryLower.includes('outdoor') ||
        queryLower.includes('picnic') || queryLower.includes('garden')) {
      relevantAgents.push(this.agents.find(a => a.type === 'park')!);
    }

    // Search Agent - always include for historical context
    if (queryLower.includes('past') || queryLower.includes('history') || 
        queryLower.includes('previous') || queryLower.includes('remember') ||
        relevantAgents.length > 0) {
      relevantAgents.push(this.agents.find(a => a.type === 'search')!);
    }

    // If no specific agents matched, use scenic as default
    if (relevantAgents.length === 0) {
      relevantAgents.push(this.agents.find(a => a.type === 'scenic')!);
    }

    return relevantAgents;
  }

  private async generateAgentResponse(agent: Agent, query: string, userId: string): Promise<AgentResponse> {
    const startTime = Date.now();
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    let response = '';
    const confidence = Math.random() * 0.4 + 0.6; // 60-100% confidence

    switch (agent.type) {
      case 'scenic':
        response = this.generateScenicResponse(query);
        break;
      case 'river':
        response = this.generateRiverResponse(query);
        break;
      case 'park':
        response = this.generateParkResponse(query);
        break;
      case 'search':
        response = this.generateSearchResponse(query, userId);
        break;
    }

    const executionTime = Date.now() - startTime;

    return {
      agentId: agent.id,
      agentName: agent.name,
      response,
      confidence,
      executionTime,
      timestamp: new Date()
    };
  }

  private generateScenicResponse(query: string): string {
    const scenicResponses = [
      "I found several beautiful scenic locations that match your query. The Marina Beach in Chennai offers stunning sunrise views, while the Mahabalipuram Shore Temple provides a perfect blend of history and coastal beauty.",
      "Based on your request, I recommend visiting the Nilgiri Hills for breathtaking mountain scenery. The tea gardens and misty landscapes create an unforgettable experience.",
      "For scenic places, consider the backwaters of Kerala or the hill stations like Ooty and Kodaikanal. Each offers unique natural beauty and peaceful environments.",
      "The Western Ghats region has numerous scenic spots including waterfalls, viewpoints, and lush green valleys perfect for nature photography and relaxation."
    ];
    return scenicResponses[Math.floor(Math.random() * scenicResponses.length)];
  }

  private generateRiverResponse(query: string): string {
    const riverResponses = [
      "The Kaveri River system offers excellent opportunities for water activities. You can enjoy boating, fishing, and riverside camping along its banks.",
      "For river-related activities, I suggest exploring the Periyar River in Kerala, known for its wildlife sanctuary and boat cruises through pristine waters.",
      "The Godavari River provides scenic boat rides and has several ghats perfect for spiritual experiences and photography.",
      "Consider visiting the Tungabhadra River near Hampi, where you can combine river activities with historical exploration of ancient ruins."
    ];
    return riverResponses[Math.floor(Math.random() * riverResponses.length)];
  }

  private generateParkResponse(query: string): string {
    const parkResponses = [
      "I found several parks with excellent facilities. Cubbon Park in Bangalore offers walking trails, playgrounds, and beautiful gardens perfect for families.",
      "For recreational activities, visit Sanjay Gandhi National Park which features nature trails, boating facilities, and wildlife viewing opportunities.",
      "The Botanical Gardens in Ooty provide a perfect setting for picnics with diverse flora, well-maintained lawns, and children's play areas.",
      "Consider Guindy National Park in Chennai, which combines urban convenience with natural beauty, offering both recreational facilities and wildlife conservation."
    ];
    return parkResponses[Math.floor(Math.random() * parkResponses.length)];
  }

  private generateSearchResponse(query: string, userId: string): string {
    const searchResponses = [
      `Based on your previous queries, I found relevant context from your conversation history. You've shown interest in similar locations before.`,
      `From your past interactions, I retrieved information that might be helpful for your current query about scenic places.`,
      `Your query history suggests you prefer locations with both natural beauty and accessibility. I've found matching recommendations.`,
      `Analyzing your previous searches, I notice a pattern in your preferences which helps me provide more personalized suggestions.`
    ];
    return searchResponses[Math.floor(Math.random() * searchResponses.length)];
  }

  async processQuery(query: string, userId: string): Promise<QueryResult> {
    const queryId = `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const relevantAgents = this.determineRelevantAgents(query);
    
    const startTime = Date.now();
    
    // Process query with all relevant agents in parallel
    const responsePromises = relevantAgents.map(agent => 
      this.generateAgentResponse(agent, query, userId)
    );
    
    const responses = await Promise.all(responsePromises);
    const totalExecutionTime = Date.now() - startTime;

    return {
      queryId,
      userId,
      query,
      responses,
      totalExecutionTime,
      timestamp: new Date()
    };
  }

  getAgents(): Agent[] {
    return this.agents;
  }
}

export const agentService = new AgentService();