import { sleep } from '../utils';

export class OllamaService {
  private static instance: OllamaService;
  private isConnected: boolean = false;
  private readonly baseUrl: string = 'http://127.0.0.1:11434';
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000; // 1 second

  private constructor() {}

  public static getInstance(): OllamaService {
    if (!OllamaService.instance) {
      OllamaService.instance = new OllamaService();
    }
    return OllamaService.instance;
  }

  private async waitForConnection(retries: number = this.maxRetries): Promise<boolean> {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Attempting to connect to Ollama (attempt ${i + 1}/${retries})...`);
        const response = await fetch(`${this.baseUrl}/api/tags`);
        if (response.ok) {
          const data = await response.json();
          const hasModel = data.models?.some((model: any) => model.name.includes("llama3.2"));
          if (hasModel) {
            this.isConnected = true;
            console.log("Successfully connected to Ollama");
            return true;
          }
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
          error: "Could not connect to Ollama after multiple attempts. Please ensure Ollama is running and the llama3.2 model is installed."
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

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
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
  }

  public async getEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.isConnected) {
      const status = await this.checkConnection();
      if (!status.isRunning) {
        throw new Error(status.error);
      }
    }

    const embeddings: number[][] = [];
    for (const text of texts) {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2',
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
  }
} 