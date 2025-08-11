import { BaseAgent } from './BaseAgent.js';

export class ScenicAgent extends BaseAgent {
  async generateResponse(query, context) {
    const queryLower = query.toLowerCase();
    
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
      },
      {
        text: "The Valley of Flowers in Uttarakhand transforms into a colorful carpet during monsoon season. This UNESCO World Heritage site offers breathtaking alpine meadows filled with endemic flowers, set against the backdrop of snow-capped Himalayan peaks.",
        keywords: ['flowers', 'uttarakhand', 'himalayan', 'meadows', 'unesco'],
        score: 9
      }
    ];

    // Find the most relevant response based on query keywords
    let selectedResponse = responses.find(r => 
      r.keywords.some(keyword => queryLower.includes(keyword))
    );

    // If no specific match, select based on general scenic terms or random
    if (!selectedResponse) {
      selectedResponse = responses[Math.floor(Math.random() * responses.length)];
    }

    // Add context if available
    if (context.length > 0) {
      selectedResponse.text += ` Based on your previous interests, you might also enjoy exploring similar scenic destinations in the region.`;
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, this.getProcessingTime()));

    return selectedResponse.text;
  }
}