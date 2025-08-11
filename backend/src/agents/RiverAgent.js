import { BaseAgent } from './BaseAgent.js';

export class RiverAgent extends BaseAgent {
  async generateResponse(query, context) {
    const queryLower = query.toLowerCase();
    
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
      },
      {
        text: "The Ganges at Rishikesh offers both spiritual and adventure experiences. Known as the 'Yoga Capital of the World', it provides excellent white-water rafting, riverside camping, and the famous Ganga Aarti ceremonies. The confluence of spirituality and adventure makes it unique.",
        keywords: ['ganges', 'rishikesh', 'yoga', 'aarti', 'spiritual'],
        score: 9
      }
    ];

    let selectedResponse = responses.find(r => 
      r.keywords.some(keyword => queryLower.includes(keyword))
    );

    if (!selectedResponse) {
      selectedResponse = responses[Math.floor(Math.random() * responses.length)];
    }

    if (context.length > 0) {
      selectedResponse.text += ` I notice from your history that you've shown interest in water activities, so these locations should align well with your preferences.`;
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, this.getProcessingTime()));

    return selectedResponse.text;
  }
}