# **PDFGod: Product Requirements Document (PRD)**

## **1. Project Overview**

### **1.1 Description**
**PDFGod** is a local-first application (built on **Next.js**) that provides core PDF manipulation features—merge, split, convert, and compress—alongside an AI-powered “Chat with PDF” function. Rather than relying on a remote API for AI queries, **PDFGod** leverages a locally hosted LLM (e.g., **Llama 3.1** at 3B or 1B parameters, quantized for efficiency) using **Olama**. The AI component employs Retrieval-Augmented Generation (RAG) so users can ask questions about a PDF’s content and receive relevant, context-aware answers.

### **1.2 Goals & Phases**
- **Phase 1 (Immediate)**
  - Implement core PDF operations:
    - **Merge** multiple PDFs
    - **Split** a PDF
    - **Convert** PDFs to other formats (e.g., Word, text, image)
    - **Compress** a PDF
  - Integrate a **RAG-based Chat with PDF** feature that references a single PDF at a time, powered by a local LLM (Llama 3.1).
  - Keep authentication minimal or omit it entirely for now.
  - Use simple local storage for file handling; advanced security is optional.

- **Phase 2 (Future Enhancements)**
  - Add **OCR** for scanned PDFs.
  - Introduce user **authentication** (e.g., Clerk) for advanced use cases.
  - Implement advanced **data privacy** or encryption features.
  - Potential **monetization** or usage limits (free vs. paid tiers).

### **1.3 Primary Audience**
1. **Everyday Users** needing quick PDF tasks such as merging resumes, splitting lengthy PDFs, converting to text/images, etc.
2. **Students and Researchers** wanting to query and extract insights from academic PDFs using a local AI model for confidentiality.

### **1.4 Constraints & Considerations**
- **Local Environment**: The application runs locally and does not rely on external AI APIs.  
- **File Size Limits**: An optional ~50–100 MB limit may be imposed to avoid performance or memory issues in a local environment.  
- **Minimal Security**: For MVP, files are processed locally and can be deleted after processing. No encryption required unless easily implemented.  
- **Model & Performance**: The chosen local LLM (e.g., 3B or 1B) must fit in memory (possibly quantized) and deliver acceptable performance in RAG tasks.  
- **Deployment**: Could be a local server (Node-based) or local machine environment. It should be easily set up for personal use.

---

## **2. Core Functionalities**

### **2.1 PDF Upload & Management**
- **Single/Multiple PDF Upload**: A drag-and-drop interface or file picker for uploading one or multiple PDFs.
- **File Details**: Show filename, size, page count (if easily retrievable).
- **Remove/Cancel**: Allow users to remove or cancel uploads.

**Edge Cases**  
- Non-PDF files → Display error messages.  
- Large files → Offer a warning if exceeding recommended thresholds.

### **2.2 PDF Manipulation**
1. **Merge**  
   - Users select multiple PDFs and reorder them before merging into a single PDF.

2. **Split**  
   - Split an uploaded PDF by specific page ranges (e.g., 1–5, 6–10) or by a fixed interval (e.g., every N pages).

3. **Convert**  
   - Convert a PDF to other formats:
     - **PDF → Word (DOCX)**
     - **PDF → Image (PNG/JPG)**
     - **PDF → Text**
   - (Future: Word/Image → PDF, if needed)

4. **Compress**  
   - Offer basic compression levels (e.g., low, medium, high).
   - Show approximate size savings or a success message after compression.

**Edge Cases**  
- Very large PDFs may slow down or crash local processes.  
- Password-protected PDFs are out of scope for Phase 1.

### **2.3 AI-Powered “Chat with PDF” (RAG)**
- **Text Extraction & Chunking**: Convert PDF text into manageable chunks, generating embeddings with a local LLM embedding model.
- **Local Embeddings Storage**: Store embeddings in a simple in-memory or local database (e.g., disk-based JSON or an embedded DB).
- **Chat Interface**:
  - A text box for user queries.
  - Retrieve top-ranked chunks, provide them as context to the local LLM, and display the answer.
- **Single PDF Scope**: Initially, only one PDF’s content is referenced during a chat session.

**Edge Cases**  
- Scanned PDFs or images require OCR (planned for Phase 2).  
- For large PDFs, partial or incremental indexing might be needed to prevent memory overload.

---

## **3. Tech Stack**

### **3.1 Frontend**
- **Next.js** (latest, App Router) for UI and routing.
- **shadcn/ui** + **Tailwind CSS** for design and components.
- Standard React hooks/state to manage file uploads and progress.

### **3.2 Backend / Processing (Local)**
- **Node.js** with Next.js API routes or local server routes for PDF tasks.
- **pdf-lib** or an equivalent library to handle merging, splitting, etc.
- Additional libraries for conversion and compression as needed.

### **3.3 AI Integration (Local LLM)**
- **Olama** for hosting or interfacing with the Llama 3.1 local model (3B or 1B parameters).
- **RAG Workflow**:
  1. Extract PDF text.
  2. Chunk the text and generate local embeddings.
  3. Retrieve relevant chunks.
  4. Pass context to Llama 3.1 for final answer generation.

### **3.4 File Storage**
- **Local Folder** or in-memory approach to store uploaded PDFs.
- Temporary storage purged on completion or closure of the session, if desired.
- Potential expansions to more robust local or external storage if needed.

---

## **4. Docs**

# PDFGod Implementation Documentation

## 4.1 Setting Up the Environment

### Initial Setup for Windows

1. First, ensure you have Node.js installed (v18+ recommended for Next.js 13+):
```bash
# Check Node version
node --v

# Create new Next.js project with TypeScript
npx create-next-app@latest pdfgod --typescript --tailwind --eslint
cd pdfgod

# Install necessary dependencies
npm install pdf-lib pdf-parse sharp @react-pdf/renderer
npm install langchain vectordb-local
npm install @types/node @types/react @types/react-dom typescript
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install lucide-react class-variance-authority clsx tailwind-merge
```

2. Install shadcn/ui components:
```bash
npx shadcn-ui@latest init
```

3. Configure Olama for Windows:
```powershell
# Download Olama installer for Windows
# Run from PowerShell as Administrator
winget install olama

# Start Olama service
olama serve

# Pull the Llama model (3B quantized version)
olama pull llama2-3b-chat-q4
```

4. Create environment variables (.env.local):
```plaintext
NEXT_PUBLIC_OLAMA_API_URL=http://localhost:11434/api
NEXT_PUBLIC_MAX_FILE_SIZE=104857600  # 100MB in bytes
```

## 4.2 PDF Manipulation Implementation

### 1. Merge PDFs
```typescript
// lib/pdf-utils.ts
import { PDFDocument } from 'pdf-lib';

export async function mergePDFs(pdfBuffers: ArrayBuffer[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  
  for (const pdfBuffer of pdfBuffers) {
    const pdf = await PDFDocument.load(pdfBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  
  return mergedPdf.save();
}

// app/api/pdfgod/merge/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { mergePDFs } from '@/lib/pdf-utils';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    
    const pdfBuffers = await Promise.all(
      files.map((file) => file.arrayBuffer())
    );
    
    const mergedPdfBytes = await mergePDFs(pdfBuffers);
    
    return new NextResponse(mergedPdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="merged.pdf"'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to merge PDFs' },
      { status: 500 }
    );
  }
}
```

### 2. Split PDFs
```typescript
// lib/pdf-utils.ts
export async function splitPDF(
  pdfBuffer: ArrayBuffer,
  ranges: { start: number; end: number }[]
): Promise<Uint8Array[]> {
  const sourcePdf = await PDFDocument.load(pdfBuffer);
  const results: Uint8Array[] = [];
  
  for (const range of ranges) {
    const newPdf = await PDFDocument.create();
    const pages = await newPdf.copyPages(
      sourcePdf,
      Array.from(
        { length: range.end - range.start + 1 },
        (_, i) => range.start + i - 1
      )
    );
    
    pages.forEach((page) => newPdf.addPage(page));
    results.push(await newPdf.save());
  }
  
  return results;
}

// app/api/pdfgod/split/route.ts
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const ranges = JSON.parse(formData.get('ranges') as string);
    
    const pdfBuffer = await file.arrayBuffer();
    const splitPdfs = await splitPDF(pdfBuffer, ranges);
    
    // Return first split PDF for now (in practice, you'd zip multiple PDFs)
    return new NextResponse(splitPdfs[0], {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="split.pdf"'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to split PDF' },
      { status: 500 }
    );
  }
}
```

### 3. Convert PDFs
```typescript
// lib/pdf-utils.ts
import sharp from 'sharp';
import pdf2img from 'pdf-img-convert';

export async function pdfToImages(
  pdfBuffer: ArrayBuffer
): Promise<Buffer[]> {
  const options = {
    width: 1920,
    height: 1080,
    quality: 90
  };
  
  const images = await pdf2img.convert(Buffer.from(pdfBuffer), options);
  return images;
}

export async function pdfToText(
  pdfBuffer: ArrayBuffer
): Promise<string> {
  const pdf = await PDFDocument.load(pdfBuffer);
  let text = '';
  
  for (let i = 0; i < pdf.getPageCount(); i++) {
    const page = pdf.getPage(i);
    text += await page.getText();
  }
  
  return text;
}

// app/api/pdfgod/convert/route.ts
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const format = formData.get('format') as string;
    
    const pdfBuffer = await file.arrayBuffer();
    
    switch (format) {
      case 'image': {
        const images = await pdfToImages(pdfBuffer);
        // Return first image for simplicity
        return new NextResponse(images[0], {
          headers: {
            'Content-Type': 'image/png',
            'Content-Disposition': 'attachment; filename="converted.png"'
          }
        });
      }
      case 'text': {
        const text = await pdfToText(pdfBuffer);
        return new NextResponse(text, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': 'attachment; filename="converted.txt"'
          }
        });
      }
      default:
        throw new Error('Unsupported format');
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to convert PDF' },
      { status: 500 }
    );
  }
}
```

### 4. Compress PDFs
```typescript
// lib/pdf-utils.ts
export async function compressPDF(
  pdfBuffer: ArrayBuffer,
  quality: 'low' | 'medium' | 'high'
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(pdfBuffer);
  
  const compressionLevels = {
    low: { imageQuality: 0.3, compress: true },
    medium: { imageQuality: 0.5, compress: true },
    high: { imageQuality: 0.7, compress: true }
  };
  
  const options = compressionLevels[quality];
  
  // Compress images in the PDF
  for (let i = 0; i < pdf.getPageCount(); i++) {
    const page = pdf.getPage(i);
    const images = await page.getImages();
    
    for (const image of images) {
      const imageData = await image.getData();
      const compressedImage = await sharp(imageData)
        .jpeg({ quality: options.imageQuality * 100 })
        .toBuffer();
      
      await pdf.embedJpg(compressedImage);
    }
  }
  
  return pdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
    compress: options.compress
  });
}

// app/api/pdfgod/compress/route.ts
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const quality = formData.get('quality') as 'low' | 'medium' | 'high';
    
    const pdfBuffer = await file.arrayBuffer();
    const compressedPdf = await compressPDF(pdfBuffer, quality);
    
    return new NextResponse(compressedPdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="compressed.pdf"'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to compress PDF' },
      { status: 500 }
    );
  }
}
```

## 4.3 RAG-Based "Chat with PDF" Implementation

```typescript
// lib/chat-rag.ts
import { OlamaEmbeddings } from 'langchain/embeddings/olama';
import { Document } from 'langchain/document';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { BaseMessage, HumanMessage, SystemMessage } from 'langchain/schema';

export class PDFChatSystem {
  private vectorStore: MemoryVectorStore | null = null;
  private embeddings: OlamaEmbeddings;
  
  constructor() {
    this.embeddings = new OlamaEmbeddings({
      model: "llama2-3b-chat-q4",
      baseUrl: process.env.NEXT_PUBLIC_OLAMA_API_URL
    });
  }
  
  async loadPDF(pdfText: string) {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200
    });
    
    const docs = await splitter.createDocuments([pdfText]);
    
    this.vectorStore = await MemoryVectorStore.fromDocuments(
      docs,
      this.embeddings
    );
  }
  
  async query(question: string): Promise<string> {
    if (!this.vectorStore) {
      throw new Error('No PDF loaded');
    }
    
    // Get relevant chunks
    const relevantDocs = await this.vectorStore.similaritySearch(
      question,
      3
    );
    
    // Prepare context from relevant chunks
    const context = relevantDocs
      .map((doc) => doc.pageContent)
      .join('\n\n');
    
    // Prepare messages for the chat
    const messages: BaseMessage[] = [
      new SystemMessage(
        `You are a helpful AI assistant. Answer questions based on the following context:\n\n${context}`
      ),
      new HumanMessage(question)
    ];
    
    // Get response from Olama
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_OLAMA_API_URL}/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama2-3b-chat-q4',
          messages: messages.map((msg) => ({
            role: msg._getType(),
            content: msg.content
          }))
        })
      }
    );
    
    const result = await response.json();
    return result.message.content;
  }
}

// app/api/pdfgod/chat/route.ts
import { PDFChatSystem } from '@/lib/chat-rag';

const chatSystem = new PDFChatSystem();

export async function POST(req: NextRequest) {
  try {
    const { type, content } = await req.json();
    
    switch (type) {
      case 'load': {
        await chatSystem.loadPDF(content);
        return NextResponse.json({ message: 'PDF loaded successfully' });
      }
      case 'query': {
        const answer = await chatSystem.query(content);
        return NextResponse.json({ answer });
      }
      default:
        throw new Error('Invalid operation');
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Chat operation failed' },
      { status: 500 }
    );
  }
}
```

## Component Examples

Here are some example UI components you'll need:

```typescript
// components/ui/pdf-upload.tsx
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from './button';
import { Progress } from './progress';

export function PDFUpload({
  onUpload,
  multiple = false
}: {
  onUpload: (files: File[]) => void;
  multiple?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploading(true);
      setProgress(0);
      
      try {
        await onUpload(acceptedFiles);
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [onUpload]
  );
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple
  });
  
  return (
    <div
      {...getRootProps()}
      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary"
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the PDF{multiple ? 's' : ''} here...</p>
      ) : (
        <p>
          Drag & drop PDF{multiple ? 's' : ''} here, or click to select
        </p>
      )}
      {uploading && <Progress value={progress} className="mt-4" />}
    </div>
  );
}
```

UI Components and Handlers
PDF Operations UI Example
typescriptCopy// components/ui/pdf-operations.tsx
import { useState } from 'react';
import { Button } from './button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { PDFUpload } from './pdf-upload';

export function PDFOperations() {
  const [loading, setLoading] = useState(false);

  // Example handler for merge operation
  const handleMerge = async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    const response = await fetch('/api/pdfgod/merge', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const blob = await response.blob();
      // Download logic here
    }
  };

  return (
    <Tabs defaultValue="merge">
      <TabsList>
        <TabsTrigger value="merge">Merge PDFs</TabsTrigger>
        <TabsTrigger value="split">Split PDF</TabsTrigger>
        <TabsTrigger value="convert">Convert</TabsTrigger>
        <TabsTrigger value="compress">Compress</TabsTrigger>
      </TabsList>
      
      <TabsContent value="merge">
        <PDFUpload multiple onUpload={handleMerge} />
      </TabsContent>
      {/* Other TabsContent components */}
    </Tabs>
  );
}
Chat Interface Example
typescriptCopy// components/ui/pdf-chat.tsx
import { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { ScrollArea } from './scroll-area';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function PDFChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  
  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    const response = await fetch('/api/pdfgod/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'query', content: input })
    });
    
    if (response.ok) {
      const { answer } = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    }
  };

  return (
    <div className="flex flex-col h-[600px]">
      <ScrollArea className="flex-1">
        {messages.map((message, i) => (
          <div
            key={i}
            className={`p-4 ${
              message.role === 'assistant' ? 'bg-muted' : ''
            }`}
          >
            {message.content}
          </div>
        ))}
      </ScrollArea>
      
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask a question..."
            onKeyPress={e => e.key === 'Enter' && handleSend()}
          />
          <Button onClick={handleSend}>Send</Button>
        </div>
      </div>
    </div>
  );
}
Error Handling Examples
API Error Handling Utility
typescriptCopy// lib/error-handling.ts
export class PDFProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'PDFProcessingError';
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof PDFProcessingError) {
    return {
      error: error.message,
      code: error.code,
      details: error.details
    };
  }
  
  return {
    error: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR'
  };
}
Implementation Notes
File Size Handling
typescriptCopy// lib/utils.ts
export const MAX_FILE_SIZE = 104857600; // 100MB

export function validatePDFFile(file: File) {
  if (file.size > MAX_FILE_SIZE) {
    throw new PDFProcessingError(
      'File too large',
      'FILE_TOO_LARGE',
      { maxSize: MAX_FILE_SIZE }
    );
  }
  
  if (!file.type.includes('pdf')) {
    throw new PDFProcessingError(
      'Invalid file type',
      'INVALID_FILE_TYPE',
      { acceptedTypes: ['application/pdf'] }
    );
  }
}
---

## **5. Minimal File Structure**

Below is a recommended file structure in **Next.js** with the **App Router** and minimal complexity:

```
my-app/
├── app/
│   ├── api/
│   │   └── pdfgod/
│   │       └── route.ts          // Single API route for PDF ops & RAG chat
│   ├── globals.css               // Global Tailwind & shadcn/ui styles
│   ├── layout.tsx                // App-wide layout
│   └── page.tsx                  // Main UI (upload, PDF ops, chat)
│
├── components/
│   └── ui/
│       ├── button.tsx            // Example shadcn/ui components
│       ├── input.tsx
│       └── ...other components
│
├── lib/
│   ├── pdf-utils.ts              // PDF manipulation logic
│   └── chat-rag.ts               // RAG logic (extraction, chunking, embedding, retrieval)
│
├── .gitignore
├── next.config.mjs
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

**Key Points**  
- **`app/api/pdfgod/route.ts`** handles all server-side logic for PDF operations and the chat RAG pipeline in one consolidated endpoint.  
- **`app/page.tsx`** is the main UI entry point with file uploads, PDF operation triggers, and the chat UI.  
- **`lib/`** folder contains utility logic for PDF ops and AI tasks, keeping the code organized and testable.  
- **`components/ui/`** can house shared or shadcn-based UI elements.

---

## **6. Implementation & Developer Notes**

1. **Incremental Feature Development**  
   - Implement each PDF operation (merge, split, etc.) separately and test individually before moving on.
   - Integrate the local LLM last to ensure PDF manipulations are already stable.

2. **Error Handling**  
   - Show clear error messages if file operations fail.  
   - Handle local LLM load errors (e.g., model not found, insufficient system memory).

3. **Performance Considerations**  
   - Large PDFs: Consider chunk-based reading to avoid memory spikes.  
   - Local LLM: The 3B or 1B Llama model should be quantized for faster inference. Adjust chunk sizes accordingly for the RAG pipeline.

4. **Basic Security**  
   - Since this is a local app, major security concerns (encryption, user auth) can be deferred unless working with sensitive data.  
   - If needed, automatically delete or overwrite PDFs after processing.

5. **Future Upgrades**  
   - Add OCR microservice (Phase 2) to handle scanned documents.  
   - Introduce user auth (Clerk) if deploying as a shared or commercial product.  
   - Migrate from in-memory storage to a more robust on-device or external database (if large-scale usage is anticipated).

---

## **7. Final Summary**

This **PRD** lays out a streamlined plan for **PDFGod** as a local-first PDF utility with RAG-based PDF chat. By keeping the file structure minimal, focusing on incremental feature development, and leveraging a local LLM with **Olama** and Llama 3.1, the project aims to deliver a functional MVP without overwhelming complexity. Future enhancements (OCR, authentication, encryption) can be layered on as needed, ensuring a smooth development journey and maintaining a robust, privacy-focused PDF toolkit.

---

**End of PRD**