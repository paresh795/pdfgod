'use client';

import { useState, useRef } from 'react';
import { loadAndProcessPDF } from '@/lib/rag/pdf-processor';
import { addDocumentsToStore } from '@/lib/rag/vector-store';
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
  const formRef = useRef<HTMLFormElement>(null);

  const handleFileUpload = async (files: PDFFile[]) => {
    const file = files[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    
    try {
      // Process the PDF and get text chunks
      console.log('Processing PDF:', file.name);
      const chunks = await loadAndProcessPDF(file);
      console.log('Generated chunks:', chunks.length);
      
      // Add chunks to vector store
      console.log('Adding chunks to vector store...');
      await addDocumentsToStore(chunks);
      
      setSelectedFile(file);
      setMessages([]);
      console.log('PDF processed successfully');
    } catch (err: any) {
      console.error('PDF processing error:', err);
      setError(err.message || 'Failed to process PDF');
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
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: messages.map(({ role, content }) => ({ role, content }))
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
      <div className="flex-none">
        <PDFUpload onUpload={handleFileUpload} />
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <Card className="flex-grow overflow-auto p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex flex-col ${
                message.role === 'assistant' ? 'items-start' : 'items-end'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === 'assistant'
                    ? 'bg-secondary'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.context && message.context.length > 0 && (
                  <div className="mt-2 text-sm opacity-70">
                    <p className="font-semibold">Relevant context:</p>
                    {message.context.map((chunk, i) => (
                      <p key={i} className="mt-1">{chunk}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <form onSubmit={handleSubmit} ref={formRef} className="flex-none">
        <div className="flex gap-2">
          <Textarea
            name="message"
            placeholder="Ask a question about the PDF..."
            className="flex-grow"
            disabled={isLoading || !selectedFile}
          />
          <Button type="submit" disabled={isLoading || !selectedFile}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Send'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
} 