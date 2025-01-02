import { NextRequest, NextResponse } from 'next/server';
import { searchSimilarChunks } from "@/lib/rag/vector-store";
import { OllamaService } from "@/lib/services/ollama";
import { formatError } from '@/lib/utils';

export async function POST(req: NextRequest) {
  console.log("Received chat request");
  try {
    // Initialize Ollama service
    const ollama = OllamaService.getInstance();
    
    // Check Ollama status first
    console.log("Checking Ollama status...");
    const status = await ollama.checkConnection();
    if (!status.isRunning) {
      console.log("Ollama not running:", status.error);
      return NextResponse.json({ error: status.error }, { status: 503 });
    }

    const { message, history } = await req.json();
    console.log("Processing request:", { messageLength: message?.length, historyLength: history?.length });

    if (!message) {
      console.log("No message provided in request");
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    let contextChunks: string[] = [];
    let prompt: string;

    try {
      // Try to get relevant context from vector store
      console.log("Searching for relevant context...");
      contextChunks = await searchSimilarChunks(message);
      console.log("Found context chunks:", contextChunks.length);
    } catch (error) {
      // If no documents in store, just continue without context
      console.log("No documents in vector store, continuing without context");
    }

    // Prepare the prompt with or without context
    console.log("Preparing prompt for Ollama...");
    if (contextChunks.length > 0) {
      const context = contextChunks.join("\n\n");
      prompt = `You are a helpful AI assistant. Use the following context to answer the user's question. If you cannot find the answer in the context, say so.

Context:
${context}

Chat History:
${history.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}

User: ${message}
Assistant:`;
    } else {
      prompt = `You are a helpful AI assistant. Answer the user's question to the best of your ability.

Chat History:
${history.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}

User: ${message}
Assistant:`;
    }

    // Generate response using Ollama service
    console.log("Generating response...");
    const response = await ollama.generate(prompt);
    console.log("Response generated successfully");
    
    return NextResponse.json({ 
      response,
      context: contextChunks 
    });
  } catch (error: any) {
    console.error("Chat API error:", {
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