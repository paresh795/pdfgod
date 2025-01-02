import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";

// We'll load pdf.js dynamically to avoid SSR issues
let pdfjsLib: any = null;

async function loadPdfJs() {
  console.log("Loading PDF.js library...");
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    }
    console.log("PDF.js library loaded successfully");
  }
  return pdfjsLib;
}

export async function loadAndProcessPDF(file: File): Promise<string[]> {
  console.log(`Processing PDF file: ${file.name} (${Math.round(file.size / 1024)}KB)`);
  
  try {
    // Load PDF.js library
    const pdfjs = await loadPdfJs();
    
    // Convert File to ArrayBuffer and then to Uint8Array
    console.log("Converting file to Uint8Array...");
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Load PDF document
    console.log("Loading PDF document...");
    const pdf = await pdfjs.getDocument({ data: uint8Array }).promise;
    console.log(`PDF loaded successfully. Total pages: ${pdf.numPages}`);
    
    // Extract text from each page
    console.log("Extracting text from pages...");
    const textContent: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`Processing page ${i}/${pdf.numPages}...`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item: any) => item.str)
        .join(' ');
      textContent.push(text);
      console.log(`Page ${i}: extracted ${text.length} characters`);
    }
    
    // Create text splitter
    console.log("Creating text splitter...");
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    // Combine all text
    const combinedText = textContent.join(' ');
    console.log(`Total text extracted: ${combinedText.length} characters`);
    
    // Split the text into chunks
    console.log("Splitting text into chunks...");
    const chunks = await textSplitter.createDocuments([combinedText]);
    console.log(`Created ${chunks.length} chunks`);
    
    // Log chunk sizes for debugging
    chunks.forEach((chunk, i) => {
      console.log(`Chunk ${i + 1}: ${chunk.pageContent.length} characters`);
    });
    
    // Return chunks
    return chunks.map(chunk => chunk.pageContent);
  } catch (error: any) {
    console.error('Error processing PDF:', {
      error: error.message,
      stack: error.stack,
      fileName: file.name,
      fileSize: file.size
    });
    
    // Provide more specific error messages
    if (error.name === 'InvalidPDFException') {
      throw new Error('The file appears to be corrupted or is not a valid PDF');
    } else if (error.message.includes('worker')) {
      throw new Error('PDF worker failed to load. Please check your internet connection');
    } else {
      throw new Error(`Failed to process PDF file: ${error.message}`);
    }
  }
} 