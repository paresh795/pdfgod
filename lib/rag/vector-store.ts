import { Document } from "@langchain/core/documents";
import { OllamaService } from "../services/ollama";

interface StoredDocument {
  pageContent: string;
  embedding: number[];
}

class SimpleVectorStore {
  private documents: StoredDocument[] = [];
  private ollamaService: OllamaService;
  private isInitialized: boolean = false;

  constructor() {
    console.log("Initializing SimpleVectorStore...");
    this.ollamaService = OllamaService.getInstance();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const status = await this.ollamaService.checkConnection();
      if (!status.isRunning) {
        throw new Error(status.error || 'Failed to connect to Ollama service');
      }
      this.isInitialized = true;
      console.log("SimpleVectorStore initialized successfully");
    } catch (error) {
      console.error("Failed to initialize SimpleVectorStore:", error);
      throw error;
    }
  }

  async addDocuments(documents: Document[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const texts = documents.map(doc => doc.pageContent);
      console.log(`Getting embeddings for ${texts.length} documents...`);
      const embeddings = await this.ollamaService.getEmbeddings(texts);
      console.log(`Generated ${embeddings.length} embeddings`);

      this.documents.push(
        ...documents.map((doc, i) => ({
          pageContent: doc.pageContent,
          embedding: embeddings[i],
        }))
      );
      console.log(`Added ${documents.length} documents to store`);
    } catch (error) {
      console.error("Failed to add documents:", error);
      throw error;
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async similaritySearch(query: string, k: number = 3): Promise<Document[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.documents.length === 0) {
      return [];
    }

    try {
      console.log(`Searching for similar documents to: "${query}"`);
      const queryEmbedding = (await this.ollamaService.getEmbeddings([query]))[0];

      const similarities = this.documents.map((doc, i) => ({
        index: i,
        score: this.cosineSimilarity(queryEmbedding, doc.embedding),
      }));

      const topK = similarities
        .sort((a, b) => b.score - a.score)
        .slice(0, k)
        .map(({ index }) => new Document({ pageContent: this.documents[index].pageContent }));

      console.log(`Found ${topK.length} similar documents`);
      return topK;
    } catch (error) {
      console.error("Failed to perform similarity search:", error);
      return [];
    }
  }
}

// Singleton instance
let vectorStore: SimpleVectorStore | null = null;

export async function initializeVectorStore() {
  if (!vectorStore) {
    console.log("Creating new vector store instance...");
    vectorStore = new SimpleVectorStore();
    await vectorStore.initialize();
  }
  return vectorStore;
}

export async function addDocumentsToStore(chunks: string[]) {
  const store = await initializeVectorStore();
  const documents = chunks.map(chunk => new Document({ pageContent: chunk }));
  await store.addDocuments(documents);
}

export async function searchSimilarChunks(query: string, k: number = 3) {
  const store = await initializeVectorStore();
  const documents = await store.similaritySearch(query, k);
  return documents.map(doc => doc.pageContent);
} 