import { NextRequest, NextResponse } from 'next/server';
import { searchSimilarChunks, initializeVectorStore, addDocumentsToStore } from "@/lib/rag/vector-store";
import { OllamaService } from "@/lib/services/ollama";
import { formatError } from '@/lib/utils';

// Initialize vector store when the API route is first loaded
let isInitialized = false;

async function ensureVectorStore() {
  if (!isInitialized) {
    console.log('Initializing vector store for API route...');
    await initializeVectorStore();
    isInitialized = true;
  }
}

export async function POST(req: NextRequest) {
  console.log("=== CHAT REQUEST START ===");
  try {
    // Initialize Ollama service
    const ollama = OllamaService.getInstance();
    
    // Check Ollama status first
    console.log("Checking Ollama service status...");
    const status = await ollama.checkConnection();
    if (!status.isRunning) {
      console.error("Ollama service not running:", status.error);
      return NextResponse.json(
        { error: `Ollama service not available: ${status.error}` }, 
        { status: 503 }
      );
    }
    console.log("Ollama service is running");

    const { message, history, isPDFMode, chunks } = await req.json();
    console.log("Request details:", { 
      messageLength: message?.length, 
      historyLength: history?.length,
      isPDFMode,
      hasChunks: !!chunks,
      messagePreview: message?.slice(0, 50)
    });

    // If chunks are provided, add them to the vector store
    if (chunks && chunks.length > 0) {
      console.log(`Adding ${chunks.length} chunks to vector store...`);
      await ensureVectorStore();
      await addDocumentsToStore(chunks);
      return NextResponse.json({ success: true });
    }

    if (!message) {
      console.log("Error: No message provided in request");
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    let contextChunks: string[] = [];
    let prompt: string;

    // Only try to get context if in PDF mode
    if (isPDFMode) {
      console.log("=== RAG CONTEXT RETRIEVAL START ===");
      try {
        await ensureVectorStore();
        console.log("Searching for relevant context in vector store...");
        contextChunks = await searchSimilarChunks(message);
        
        if (contextChunks.length === 0) {
          console.log("No relevant context found in vector store");
          return NextResponse.json(
            { error: 'No relevant information found in the PDF. Please try uploading the PDF again.' },
            { status: 404 }
          );
        }
        
        console.log(`Retrieved ${contextChunks.length} relevant chunks`);
        if (contextChunks.length > 0) {
          console.log("Sample of first context chunk:", contextChunks[0].slice(0, 100));
        }
        
        // Prepare the prompt with context
        console.log("=== PROMPT PREPARATION START ===");
        const context = contextChunks.join("\n\n");
        prompt = `You are a helpful AI assistant. Use the following context from the PDF document to answer the user's question. If you cannot find the answer in the context, say so.

Context from PDF:
${context}

Chat History:
${history.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}

User: ${message}
Assistant:`;
        console.log("Created prompt with context");
        console.log("=== PROMPT PREPARATION COMPLETE ===");
      } catch (error) {
        console.error("=== RAG CONTEXT RETRIEVAL ERROR ===");
        console.error("Failed to get context:", error);
        return NextResponse.json(
          { error: 'Failed to retrieve context from PDF. Please try uploading the PDF again.' },
          { status: 500 }
        );
      }
    } else {
      // Regular chat mode without context
      prompt = `You are a helpful AI assistant. Answer the user's question to the best of your ability.

Chat History:
${history.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}

User: ${message}
Assistant:`;
    }

    // Generate response using Ollama service
    console.log("=== RESPONSE GENERATION START ===");
    try {
      const response = await ollama.generate(prompt);
      console.log("Response preview:", response.slice(0, 100));
      console.log("=== RESPONSE GENERATION COMPLETE ===");
      console.log("=== CHAT REQUEST COMPLETE ===");
      return NextResponse.json({ 
        response,
        context: contextChunks 
      });
    } catch (error: any) {
      console.error("=== RESPONSE GENERATION ERROR ===");
      console.error("Error generating response:", error);
      return NextResponse.json(
        { error: `Failed to generate response: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("=== CHAT REQUEST ERROR ===");
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    
    // Format error message and determine status code
    const statusCode = error.code === 'ECONNREFUSED' ? 503 : 500;
    const errorMessage = formatError(error);
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
} 