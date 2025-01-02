'use client';

import { useState, useRef } from 'react';
import { loadAndProcessPDF } from '@/lib/rag/pdf-processor';
import { initializeVectorStore, addDocumentsToStore, clearVectorStore } from '@/lib/rag/vector-store';
import { Alert, AlertDescription } from './alert';
import { PDFUpload, PDFFile } from './pdf-upload';
import { Button } from './button';
import { Textarea } from './textarea';
import { Card } from './card';
import { AlertCircle, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  context?: string[];
}

export default function PDFChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<PDFFile | null>(null);
  const [isPDFMode, setIsPDFMode] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleFileUpload = async (files: PDFFile[]) => {
    const file = files[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setError(null);
      
      // Clear any existing messages and state
      setMessages([]);
      setSelectedFile(null);
      setIsPDFMode(false);
      
      console.log('=== PDF PROCESSING START ===');
      console.log(`Processing PDF: ${file.name} (${Math.round(file.size / 1024)}KB)`);
      
      // Step 1: Process PDF into chunks
      console.log('Processing PDF into chunks...');
      const chunks = await loadAndProcessPDF(file);
      console.log(`Generated ${chunks.length} chunks`);
      
      if (chunks.length > 0) {
        console.log('Sample of first chunk:', chunks[0].slice(0, 100));
      }
      
      // Step 2: Send chunks to API for storage
      console.log('Sending chunks to API...');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chunks })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to store chunks');
      }
      
      // Step 3: Update UI state
      setSelectedFile(file);
      setIsPDFMode(true);
      setMessages([{
        role: 'assistant',
        content: `I've successfully processed your PDF "${file.name}" and I'm ready to answer questions about it. What would you like to know?`
      }]);
      
      console.log('=== PDF PROCESSING COMPLETE ===');
    } catch (error: any) {
      console.error('=== PDF PROCESSING ERROR ===');
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        fileName: file.name,
        fileSize: file.size
      });
      
      setError(`Failed to process PDF: ${error.message}`);
      setSelectedFile(null);
      setIsPDFMode(false);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const message = formData.get('message') as string;
    if (!message.trim()) return;

    // Add user message
    const userMessage: Message = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input
    if (formRef.current) {
      formRef.current.reset();
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: messages.map(({ role, content }) => ({ role, content })),
          isPDFMode
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }

      const { response: assistantMessage, context } = await response.json();
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: assistantMessage,
        context 
      }]);
    } catch (err: any) {
      setError(err.message || 'Failed to get response');
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto p-4 space-y-4">
      <div className="w-full">
        <PDFUpload onUpload={handleFileUpload} />
        {selectedFile && (
          <div className="mt-2 text-sm text-gray-600">
            Active PDF: {selectedFile.name}
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto">
        {messages.map((message, index) => (
          <Card key={index} className="p-4">
            <div className="font-semibold mb-2">
              {message.role === 'user' ? 'You' : 'Assistant'}:
            </div>
            <div className="whitespace-pre-wrap">{message.content}</div>
            {message.context && message.context.length > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                <div className="font-semibold">Relevant PDF Context:</div>
                {message.context.map((chunk, i) => (
                  <div key={i} className="mt-1 p-2 bg-gray-100 rounded">
                    {chunk}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      <form onSubmit={handleSubmit} ref={formRef} className="space-y-2">
        <Textarea
          name="message"
          placeholder={isPDFMode ? "Ask a question about the PDF..." : "Send a message..."}
          className="min-h-[80px]"
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Send'
          )}
        </Button>
      </form>
    </div>
  );
} 