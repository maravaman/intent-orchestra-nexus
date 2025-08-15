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
      console.log('🤖 Initializing Ollama service...');
      
      // Check if Ollama is running
      const models = await this.ollama.list();
      console.log('✅ Ollama service connected successfully');
      
      // Check if the specified model is available
      const modelExists = models.models.some(m => m.name === this.model);
      if (!modelExists) {
        console.log(`📥 Pulling model: ${this.model}`);
        await this.ollama.pull({ model: this.model });
        console.log(`✅ Model ${this.model} pulled successfully`);
      } else {
        console.log(`✅ Model ${this.model} is available`);
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('❌ Ollama service initialization failed:', error);
      console.error('Make sure Ollama is running locally on port 11434');
      console.error('Run: ollama serve');
      throw error;
    }
  }

  async generateResponse(systemPrompt, userPrompt, context = [], options = {}) {
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
        const contextStr = context
          .slice(-3) // Last 3 context items
          .map(c => `Previous: ${c.content}`)
          .join('\n');
        
        messages.push({
          role: 'system',
          content: `Context from previous conversations:\n${contextStr}`
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
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          max_tokens: options.max_tokens || 1000,
          ...options
        }
      });

      const executionTime = Date.now() - startTime;

      return {
        content: response.message.content,
        executionTime,
        inputTokens: response.prompt_eval_count || 0,
        outputTokens: response.eval_count || 0,
        model: this.model,
        totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0)
      };
    } catch (error) {
      console.error('❌ Ollama generation error:', error);
      throw new Error(`Ollama generation failed: ${error.message}`);
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
      console.warn('⚠️ Embedding generation failed, continuing without embeddings:', error.message);
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

  async getAvailableModels() {
    try {
      const models = await this.ollama.list();
      return models.models.map(model => ({
        name: model.name,
        size: model.size,
        modified_at: model.modified_at
      }));
    } catch (error) {
      console.error('❌ Failed to get available models:', error);
      return [];
    }
  }
}