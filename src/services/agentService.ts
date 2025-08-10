import { Agent, AgentResponse, QueryResult } from '@/types/agent';
import { memoryService } from './memoryService';

export class AgentService {
  private agents: Agent[] = [
    {
      id: 'scenic-001',
      name: 'Scenic Agent',
      type: 'scenic',
      description: 'Specializes in scenic locations, viewpoints, and tourist attractions',
      capabilities: ['location_search', 'scenic_recommendations', 'tourism_info', 'photography_spots']
    },
    {
      id: 'river-001',
      name: 'River Agent',
      type: 'river',
      description: 'Expert in rivers, lakes, waterfalls, and aquatic activities',
      capabilities: ['water_bodies', 'river_info', 'aquatic_activities', 'fishing_spots', 'water_sports']
    },
    {
      id: 'park-001',
      name: 'Park Agent',
      type: 'park',
      description: 'Handles parks, gardens, recreational areas, and outdoor activities',
      capabilities: ['parks', 'recreation', 'outdoor_activities', 'facilities', 'family_spots']
    },
    {
      id: 'search-001',
      name: 'Search Agent',
      type: 'search',
      description: 'Searches through user history and provides contextual information',
      capabilities: ['memory_search', 'historical_data', 'context_retrieval', 'pattern_analysis']
    }
  ];

  private determineRelevantAgents(query: string): Agent[] {
    const queryLower = query.toLowerCase();
    const relevantAgents: Agent[] = [];
    const agentScores: Map<string, number> = new Map();

    // Scenic Agent keywords and scoring
    const scenicKeywords = ['scenic', 'beautiful', 'view', 'tourist', 'attraction', 'place', 'visit', 'sightseeing', 'landscape', 'mountain', 'hill', 'sunset', 'sunrise', 'photography'];
    let scenicScore = 0;
    scenicKeywords.forEach(keyword => {
      if (queryLower.includes(keyword)) scenicScore += 1;
    });
    if (scenicScore > 0) {
      agentScores.set('scenic', scenicScore);
      relevantAgents.push(this.agents.find(a => a.type === 'scenic')!);
    }

    // River Agent keywords and scoring
    const riverKeywords = ['river', 'water', 'lake', 'stream', 'waterfall', 'aquatic', 'fishing', 'boating', 'swimming', 'dam', 'reservoir', 'creek', 'pond'];
    let riverScore = 0;
    riverKeywords.forEach(keyword => {
      if (queryLower.includes(keyword)) riverScore += 1;
    });
    if (riverScore > 0) {
      agentScores.set('river', riverScore);
      relevantAgents.push(this.agents.find(a => a.type === 'river')!);
    }

    // Park Agent keywords and scoring
    const parkKeywords = ['park', 'playground', 'recreation', 'outdoor', 'picnic', 'garden', 'trail', 'hiking', 'walking', 'family', 'children', 'sports', 'camping'];
    let parkScore = 0;
    parkKeywords.forEach(keyword => {
      if (queryLower.includes(keyword)) parkScore += 1;
    });
    if (parkScore > 0) {
      agentScores.set('park', parkScore);
      relevantAgents.push(this.agents.find(a => a.type === 'park')!);
    }

    // Search Agent - include for historical context or when explicitly requested
    const searchKeywords = ['past', 'history', 'previous', 'remember', 'before', 'earlier', 'search', 'find', 'show me my'];
    let searchScore = 0;
    searchKeywords.forEach(keyword => {
      if (queryLower.includes(keyword)) searchScore += 2; // Higher weight for search terms
    });
    
    // Always include search agent if other agents are involved (for context)
    if (relevantAgents.length > 0 || searchScore > 0) {
      agentScores.set('search', Math.max(searchScore, 1));
      if (!relevantAgents.find(a => a.type === 'search')) {
        relevantAgents.push(this.agents.find(a => a.type === 'search')!);
      }
    }

    // If no specific agents matched, use scenic as default
    if (relevantAgents.length === 0) {
      relevantAgents.push(this.agents.find(a => a.type === 'scenic')!);
      agentScores.set('scenic', 1);
    }

    // Sort agents by relevance score
    relevantAgents.sort((a, b) => {
      const scoreA = agentScores.get(a.type) || 0;
      const scoreB = agentScores.get(b.type) || 0;
      return scoreB - scoreA;
    });

    console.log(`[ROUTING] Query: "${query}" -> Agents: ${relevantAgents.map(a => `${a.name}(${agentScores.get(a.type)})`).join(', ')}`);
    return relevantAgents;
  }

  private async generateAgentResponse(agent: Agent, query: string, userId: string, sessionId: string): Promise<AgentResponse> {
    const startTime = Date.now();
    
    // Get relevant context from user's memory
    const context = await memoryService.getRelevantContext(userId, query);
    
    // Simulate processing time based on agent type
    const processingTime = this.getProcessingTime(agent.type);
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    let response = '';
    let relevanceScore = 0;
    const confidence = Math.random() * 0.4 + 0.6; // 60-100% confidence

    switch (agent.type) {
      case 'scenic':
        ({ response, relevanceScore } = this.generateScenicResponse(query, context));
        break;
      case 'river':
        ({ response, relevanceScore } = this.generateRiverResponse(query, context));
        break;
      case 'park':
        ({ response, relevanceScore } = this.generateParkResponse(query, context));
        break;
      case 'search':
        ({ response, relevanceScore } = await this.generateSearchResponse(query, userId, context));
        break;
    }

    const executionTime = Date.now() - startTime;

    return {
      agentId: agent.id,
      agentName: agent.name,
      response,
      confidence,
      executionTime,
      timestamp: new Date(),
      relevanceScore
    };
  }

  private getProcessingTime(agentType: string): number {
    const baseTimes = {
      scenic: 300,
      river: 250,
      park: 200,
      search: 400
    };
    const baseTime = baseTimes[agentType as keyof typeof baseTimes] || 300;
    return baseTime + Math.random() * 200; // Add some randomness
  }

  private generateScenicResponse(query: string, context: any[]): { response: string, relevanceScore: number } {
    const queryLower = query.toLowerCase();
    let relevanceScore = 0;
    
    const responses = [
      {
        text: "I found several breathtaking scenic locations perfect for your query. Marina Beach in Chennai offers stunning sunrise views over the Bay of Bengal, while the Mahabalipuram Shore Temple provides a magnificent blend of ancient architecture and coastal beauty. The rock-cut sculptures against the ocean backdrop create an unforgettable visual experience.",
        keywords: ['chennai', 'beach', 'temple', 'coast'],
        score: 8
      },
      {
        text: "For spectacular mountain scenery, I highly recommend the Nilgiri Hills region. The winding roads through Ooty offer panoramic views of rolling tea gardens, misty valleys, and pristine lakes. The Doddabetta Peak provides the highest viewpoint in the Nilgiris, perfect for photography enthusiasts.",
        keywords: ['mountain', 'hill', 'ooty', 'tea', 'peak'],
        score: 9
      },
      {
        text: "The Western Ghats region boasts numerous scenic treasures including the Athirappilly Falls in Kerala, often called the 'Niagara of India'. The surrounding tropical forests and the thundering cascade create a mesmerizing natural amphitheater perfect for nature lovers.",
        keywords: ['waterfall', 'kerala', 'forest', 'nature'],
        score: 8
      },
      {
        text: "For unique geological formations, visit the Hampi landscape in Karnataka. The boulder-strewn terrain with ancient ruins creates a surreal, almost lunar landscape. The sunset views from Matanga Hill over the Vijayanagara ruins are absolutely spectacular.",
        keywords: ['hampi', 'karnataka', 'ruins', 'sunset', 'hill'],
        score: 7
      }
    ];

    // Calculate relevance based on query keywords
    const selectedResponse = responses.find(r => 
      r.keywords.some(keyword => queryLower.includes(keyword))
    ) || responses[Math.floor(Math.random() * responses.length)];

    relevanceScore = selectedResponse.score;
    
    // Add context if available
    if (context.length > 0) {
      selectedResponse.text += ` Based on your previous interests, you might also enjoy exploring similar scenic destinations in the region.`;
      relevanceScore += 1;
    }

    return { response: selectedResponse.text, relevanceScore };
  }

  private generateRiverResponse(query: string, context: any[]): { response: string, relevanceScore: number } {
    const queryLower = query.toLowerCase();
    let relevanceScore = 0;

    const responses = [
      {
        text: "The Kaveri River system offers exceptional water experiences across Karnataka and Tamil Nadu. You can enjoy white-water rafting near Coorg, peaceful coracle rides in Hogenakkal Falls, and excellent fishing spots along the quieter stretches. The river's cultural significance adds depth to any visit.",
        keywords: ['kaveri', 'rafting', 'fishing', 'hogenakkal'],
        score: 9
      },
      {
        text: "Kerala's backwaters, particularly around Alleppey and Kumarakom, provide unique aquatic experiences. Houseboat cruises through palm-fringed canals, traditional fishing techniques, and bird watching in Vembanad Lake create unforgettable memories. The interconnected waterways form a natural maze perfect for exploration.",
        keywords: ['backwater', 'kerala', 'alleppey', 'houseboat', 'lake'],
        score: 8
      },
      {
        text: "The Godavari River, India's second-longest river, offers diverse experiences from the source in Maharashtra to its delta in Andhra Pradesh. Sacred ghats in Nashik, boat rides through Papikondalu gorge, and the vibrant Pushkaram festival celebrations showcase the river's spiritual and cultural importance.",
        keywords: ['godavari', 'ghat', 'boat', 'festival'],
        score: 7
      },
      {
        text: "For adventure seekers, the Beas River in Himachal Pradesh provides thrilling water sports opportunities. River rafting from Kullu to Jhiri, trout fishing in the upper reaches, and camping along the riverbanks offer perfect mountain river experiences with stunning Himalayan backdrops.",
        keywords: ['beas', 'himachal', 'rafting', 'trout', 'mountain'],
        score: 8
      }
    ];

    const selectedResponse = responses.find(r => 
      r.keywords.some(keyword => queryLower.includes(keyword))
    ) || responses[Math.floor(Math.random() * responses.length)];

    relevanceScore = selectedResponse.score;

    if (context.length > 0) {
      selectedResponse.text += ` I notice from your history that you've shown interest in water activities, so these locations should align well with your preferences.`;
      relevanceScore += 1;
    }

    return { response: selectedResponse.text, relevanceScore };
  }

  private generateParkResponse(query: string, context: any[]): { response: string, relevanceScore: number } {
    const queryLower = query.toLowerCase();
    let relevanceScore = 0;

    const responses = [
      {
        text: "Cubbon Park in Bangalore is a green oasis in the heart of the city, featuring over 6,000 trees, walking trails, a children's playground, and the beautiful Glass House. The park hosts regular cultural events and provides excellent facilities for morning joggers and families alike.",
        keywords: ['bangalore', 'cubbon', 'children', 'playground', 'walking'],
        score: 8
      },
      {
        text: "Sanjay Gandhi National Park in Mumbai offers a unique blend of urban wilderness with leopard sightings, ancient Kanheri Caves, boating at Tulsi Lake, and extensive hiking trails. The park's butterfly garden and lion safari add to its diverse attractions for all age groups.",
        keywords: ['mumbai', 'sanjay gandhi', 'wildlife', 'hiking', 'boating'],
        score: 9
      },
      {
        text: "The Government Botanical Gardens in Ooty span 55 acres of terraced slopes with over 650 species of plants. The Italian-style garden design, fossil tree trunk, and annual flower shows make it perfect for family outings, photography, and educational visits.",
        keywords: ['ooty', 'botanical', 'garden', 'family', 'flower'],
        score: 7
      },
      {
        text: "Guindy National Park in Chennai is one of the smallest national parks in India but offers rich biodiversity within the city limits. The park features a children's park, snake park, and deer park, making it an ideal destination for educational family trips and nature walks.",
        keywords: ['chennai', 'guindy', 'family', 'children', 'nature'],
        score: 8
      }
    ];

    const selectedResponse = responses.find(r => 
      r.keywords.some(keyword => queryLower.includes(keyword))
    ) || responses[Math.floor(Math.random() * responses.length)];

    relevanceScore = selectedResponse.score;

    if (context.length > 0) {
      selectedResponse.text += ` Based on your previous park visits, I've selected locations with similar amenities and family-friendly features.`;
      relevanceScore += 1;
    }

    return { response: selectedResponse.text, relevanceScore };
  }

  private async generateSearchResponse(query: string, userId: string, context: any[]): Promise<{ response: string, relevanceScore: number }> {
    const conversationHistory = await memoryService.getUserConversationHistory(userId, 10);
    const searchResults = await memoryService.searchUserHistory(userId, query);
    
    let relevanceScore = 0;
    let response = '';

    if (searchResults.length > 0) {
      const recentQueries = searchResults
        .filter(entry => entry.type === 'query')
        .slice(0, 3)
        .map(entry => entry.content);

      response = `I found ${searchResults.length} relevant entries in your conversation history. Your recent related queries include: "${recentQueries.join('", "')}"`;
      
      if (conversationHistory.length > 0) {
        const lastQuery = conversationHistory[0];
        response += ` Your last query was about "${lastQuery.query}" on ${lastQuery.timestamp.toLocaleDateString()}.`;
      }

      response += ` I can see patterns in your interests that might help provide more personalized recommendations.`;
      relevanceScore = 8;
    } else if (conversationHistory.length > 0) {
      response = `While I didn't find direct matches for your current query, I can see from your conversation history that you've made ${conversationHistory.length} previous queries. Your interests seem to focus on exploration and discovery, which aligns well with your current question.`;
      relevanceScore = 5;
    } else {
      response = `This appears to be one of your first queries with our system. I'm building a profile of your interests to provide better personalized recommendations in future conversations. Welcome to our multi-agent assistance platform!`;
      relevanceScore = 3;
    }

    return { response, relevanceScore };
  }

  async processQuery(query: string, userId: string, sessionId: string): Promise<QueryResult> {
    const queryId = `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const relevantAgents = this.determineRelevantAgents(query);
    
    const startTime = Date.now();
    
    console.log(`[PROCESSING] Query "${query}" for user ${userId} with ${relevantAgents.length} agents`);
    
    // Process query with all relevant agents in parallel
    const responsePromises = relevantAgents.map(agent => 
      this.generateAgentResponse(agent, query, userId, sessionId)
    );
    
    const responses = await Promise.all(responsePromises);
    const totalExecutionTime = Date.now() - startTime;

    // Sort responses by relevance score
    responses.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const queryResult: QueryResult = {
      queryId,
      userId,
      query,
      responses,
      totalExecutionTime,
      timestamp: new Date(),
      sessionId
    };

    // Store the query result in memory
    await memoryService.storeQueryResult(queryResult);

    console.log(`[COMPLETED] Query processed in ${totalExecutionTime}ms with ${responses.length} responses`);
    return queryResult;
  }

  getAgents(): Agent[] {
    return this.agents;
  }

  async getAgentStats() {
    return {
      totalAgents: this.agents.length,
      agentTypes: this.agents.map(a => ({
        name: a.name,
        type: a.type,
        capabilities: a.capabilities.length
      }))
    };
  }
}

export const agentService = new AgentService();