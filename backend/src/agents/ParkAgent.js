import { BaseAgent } from './BaseAgent.js';

export class ParkAgent extends BaseAgent {
  async generateResponse(query, context) {
    const queryLower = query.toLowerCase();
    
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
      },
      {
        text: "Jim Corbett National Park in Uttarakhand is India's oldest national park, famous for its Bengal tigers and diverse wildlife. The park offers jeep safaris, elephant rides, bird watching, and river rafting in the Ramganga River, making it perfect for wildlife enthusiasts.",
        keywords: ['corbett', 'uttarakhand', 'tiger', 'safari', 'wildlife'],
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
      selectedResponse.text += ` Based on your previous park visits, I've selected locations with similar amenities and family-friendly features.`;
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, this.getProcessingTime()));

    return selectedResponse.text;
  }
}