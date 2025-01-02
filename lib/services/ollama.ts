import { sleep } from '../utils';

export class OllamaService {
  private static instance: OllamaService;
  private isConnected: boolean = false;
  private readonly baseUrl: string;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000; // 1 second
  private modelName: string = 'llama3.2'; // Default model

  private constructor() {
    // Use environment variable or fall back to default
    this.baseUrl = process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://127.0.0.1:11434';
    console.log('Initializing Ollama service with base URL:', this.baseUrl);
  }

  public static getInstance(): OllamaService {
    if (!OllamaService.instance) {
      OllamaService.instance = new OllamaService();
    }
    return OllamaService.instance;
  }

  private async detectAvailableModel(): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        if (data.models?.length > 0) {
          // Look for llama3.2 specifically
          const llama32 = data.models.find((model: any) => 
            model.name === 'llama3.2' || 
            model.name.startsWith('llama3.2:')
          );
          if (llama32) {
            console.log('Found llama3.2 model:', llama32.name);
            return 'llama3.2';
          }
          // Fallback to first non-vision model
          const nonVisionModel = data.models.find((model: any) => 
            !model.name.includes('vision')
          );
          if (nonVisionModel) {
            console.log('Using fallback model:', nonVisionModel.name);
            return nonVisionModel.name;
          }
        }
      }
    } catch (error) {
      console.error('Error detecting model:', error);
    }
    return null;
  }

  private async waitForConnection(retries: number = this.maxRetries): Promise<boolean> {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Attempting to connect to Ollama at ${this.baseUrl} (attempt ${i + 1}/${retries})...`);
        const detectedModel = await this.detectAvailableModel();
        if (detectedModel) {
          this.modelName = detectedModel;
          this.isConnected = true;
          console.log(`Successfully connected to Ollama using model: ${this.modelName}`);
          return true;
        }
      } catch (error) {
        console.error(`Connection attempt ${i + 1} failed:`, error);
      }
      
      if (i < retries - 1) {
        console.log(`Waiting ${this.retryDelay}ms before next attempt...`);
        await sleep(this.retryDelay);
      }
    }
    return false;
  }

  public async checkConnection(): Promise<{ isRunning: boolean; error?: string }> {
    try {
      const isConnected = await this.waitForConnection();
      if (!isConnected) {
        return {
          isRunning: false,
          error: `Could not connect to Ollama at ${this.baseUrl} after multiple attempts. Please ensure Ollama is running.`
        };
      }
      return { isRunning: true };
    } catch (error: any) {
      return {
        isRunning: false,
        error: `Failed to connect to Ollama: ${error.message}`
      };
    }
  }

  public async generate(prompt: string): Promise<string> {
    if (!this.isConnected) {
      const status = await this.checkConnection();
      if (!status.isRunning) {
        throw new Error(status.error);
      }
    }

    try {
      console.log(`Generating response using model: ${this.modelName}`);
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.modelName,
          prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.statusText}. ${errorText}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error: any) {
      console.error('Generation error:', error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  public async getEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.isConnected) {
      const status = await this.checkConnection();
      if (!status.isRunning) {
        throw new Error(status.error);
      }
    }

    try {
      console.log(`Generating embeddings using model: ${this.modelName}`);
      const embeddings: number[][] = [];
      for (const text of texts) {
        const response = await fetch(`${this.baseUrl}/api/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.modelName,
            prompt: text,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to get embeddings: ${response.statusText}`);
        }

        const data = await response.json();
        embeddings.push(data.embedding);
      }

      return embeddings;
    } catch (error: any) {
      console.error('Embeddings error:', error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }
} 