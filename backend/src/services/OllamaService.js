import { Ollama } from 'ollama';
import dotenv from 'dotenv';

dotenv.config();

export class OllamaService {
  constructor() {
    this.ollama = new Ollama({
      host: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    });
    this.model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
    this.initialized = false;
  }

  async initialize() {
    try {
      // Check if Ollama is running
      const models = await this.ollama.list();
      console.log('✅ Ollama service connected successfully');
      
      // Check if the specified model is available
      const modelExists = models.models.some(m => m.name === this.model);
      if (!modelExists) {
        console.log(`📥 Pulling model: ${this.model}`);
        await this.ollama.pull({ model: this.model });
        console.log(`✅ Model ${this.model} pulled successfully`);
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('❌ Ollama service initialization failed:', error);
      console.error('Make sure Ollama is running locally on port 11434');
      throw error;
    }
  }

  async generateResponse(systemPrompt, userPrompt, context = []) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        }
      ];

      // Add context if available
      if (context.length > 0) {
        messages.push({
          role: 'system',
          content: `Previous conversation context: ${JSON.stringify(context.slice(-3))}`
        });
      }

      messages.push({
        role: 'user',
        content: userPrompt
      });

      const startTime = Date.now();
      
      const response = await this.ollama.chat({
        model: this.model,
        messages: messages,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 1000
        }
      });

      const executionTime = Date.now() - startTime;

      return {
        content: response.message.content,
        executionTime,
        inputTokens: response.prompt_eval_count || 0,
        outputTokens: response.eval_count || 0,
        model: this.model
      };
    } catch (error) {
      console.error('❌ Ollama generation error:', error);
      throw error;
    }
  }

  async generateEmbedding(text) {
    try {
      const response = await this.ollama.embeddings({
        model: 'nomic-embed-text',
        prompt: text
      });
      
      return response.embedding;
    } catch (error) {
      console.error('❌ Embedding generation error:', error);
      // Return null if embedding model is not available
      return null;
    }
  }

  async isHealthy() {
    try {
      await this.ollama.list();
      return true;
    } catch (error) {
      return false;
    }
  }

  getModelInfo() {
    return {
      model: this.model,
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      initialized: this.initialized
    };
  }
}