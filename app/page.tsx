import { PDFOperations } from '@/components/ui/pdf-operations';
import PDFChat from '@/components/ui/pdf-chat';

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-2">PDFGod</h1>
      <p className="text-gray-600 mb-8">Your local PDF manipulation toolkit. Choose an operation to get started.</p>
      
      <div className="space-y-8">
        <PDFOperations />
        
        <div className="border-t pt-8">
          <h2 className="text-2xl font-semibold mb-4">Chat with PDF</h2>
          <p className="text-gray-600 mb-4">Upload a PDF and ask questions about its content.</p>
          <PDFChat />
        </div>
      </div>
    </main>
  );
}
