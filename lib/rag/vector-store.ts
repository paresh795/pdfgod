import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "langchain/document";
import { OllamaService } from "../services/ollama";

// Global state for vector store
let vectorStore: MemoryVectorStore | null = null;
let embeddings: OllamaEmbeddings | null = null;
let storedDocuments: Document[] = [];

export async function initializeVectorStore() {
  console.log('=== VECTOR STORE INITIALIZATION START ===');
  
  try {
    if (vectorStore && embeddings) {
      console.log('Vector store already initialized with', storedDocuments.length, 'documents');
      return vectorStore;
    }
    
    console.log('Connecting to Ollama service...');
    const ollama = OllamaService.getInstance();
    const status = await ollama.checkConnection();
    if (!status.isRunning) {
      throw new Error(status.error || 'Failed to connect to Ollama');
    }
    console.log('Successfully connected to Ollama');
    
    const baseUrl = process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://127.0.0.1:11434';
    console.log('Using Ollama base URL:', baseUrl);
    
    embeddings = new OllamaEmbeddings({
      model: "llama3.2",
      baseUrl: baseUrl
    });
    
    console.log('Creating new vector store instance...');
    vectorStore = new MemoryVectorStore(embeddings);
    
    // If we have stored documents, add them back
    if (storedDocuments.length > 0) {
      await vectorStore.addDocuments(storedDocuments);
      console.log('Restored', storedDocuments.length, 'documents to vector store');
    }
    
    console.log('Vector store initialized successfully');
    console.log('=== VECTOR STORE INITIALIZATION COMPLETE ===');
    return vectorStore;
  } catch (error: any) {
    console.error('=== VECTOR STORE INITIALIZATION ERROR ===');
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    throw new Error(`Failed to initialize vector store: ${error.message}`);
  }
}

export async function addDocumentsToStore(documents: string[]) {
  console.log('=== DOCUMENT EMBEDDING START ===');
  console.log(`Processing ${documents.length} documents for embedding`);
  
  try {
    if (!vectorStore || !embeddings) {
      await initializeVectorStore();
    }
    
    if (!vectorStore || !embeddings) {
      throw new Error('Vector store initialization failed');
    }
    
    if (documents.length > 0) {
      console.log('Sample text for embedding:', documents[0].slice(0, 100));
    }
    
    console.log('Generating embeddings via Ollama...');
    const docs = documents.map((text, index) => new Document({
      pageContent: text,
      metadata: { id: `doc-${storedDocuments.length + index}` }
    }));
    
    await vectorStore.addDocuments(docs);
    storedDocuments.push(...docs);
    
    console.log('Successfully generated embeddings');
    console.log('Total documents in store:', storedDocuments.length);
    console.log('=== DOCUMENT EMBEDDING COMPLETE ===');
  } catch (error: any) {
    console.error('=== DOCUMENT EMBEDDING ERROR ===');
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    throw new Error(`Failed to add documents to vector store: ${error.message}`);
  }
}

export async function searchSimilarChunks(query: string): Promise<string[]> {
  console.log('=== SIMILARITY SEARCH START ===');
  console.log(`Searching for documents similar to query: "${query}"`);
  
  try {
    if (!vectorStore || !embeddings) {
      console.log('Vector store not initialized, initializing now...');
      await initializeVectorStore();
    }
    
    if (!vectorStore || !embeddings) {
      throw new Error('Failed to initialize vector store');
    }
    
    if (storedDocuments.length === 0) {
      console.log('No documents in store');
      return [];
    }
    
    console.log('Total documents to search:', storedDocuments.length);
    console.log('Generating query embedding...');
    const results = await vectorStore.similaritySearch(query, 3);
    console.log(`Found ${results.length} similar documents`);
    
    if (results.length > 0) {
      console.log('Sample of first result:', results[0].pageContent.slice(0, 100));
    }
    
    console.log('=== SIMILARITY SEARCH COMPLETE ===');
    return results.map(doc => doc.pageContent);
  } catch (error: any) {
    console.error('=== SIMILARITY SEARCH ERROR ===');
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    throw new Error(`Failed to search similar chunks: ${error.message}`);
  }
}

export function clearVectorStore() {
  vectorStore = null;
  embeddings = null;
  storedDocuments = [];
  console.log('Vector store cleared');
} 