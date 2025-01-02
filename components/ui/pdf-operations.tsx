'use client';

import { useState } from 'react';
import { PDFFile } from './pdf-upload';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Input } from './input';
import { Label } from './label';
import { PDFManager } from './pdf-manager';
import { 
  FileText, 
  MergeIcon, 
  Scissors, 
  FileOutput, 
  Minimize2,
  Download,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from './alert';

interface PageRange {
  start: number;
  end: number;
}

interface ConversionFormat {
  value: 'docx' | 'image' | 'text';
  label: string;
}

const CONVERSION_FORMATS: ConversionFormat[] = [
  { value: 'docx', label: 'Word Document (.docx)' },
  { value: 'image', label: 'Image (.png)' },
  { value: 'text', label: 'Text (.txt)' },
];

export function PDFOperations() {
  const [selectedFormat, setSelectedFormat] = useState<ConversionFormat['value']>('docx');
  const [pageRanges, setPageRanges] = useState<PageRange[]>([{ start: 1, end: 1 }]);
  const [compressionLevel, setCompressionLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedFiles, setSelectedFiles] = useState<PDFFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFile, setProcessedFile] = useState<{ url: string; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle file selection for merge
  const handleMergeFileSelect = (files: PDFFile[]) => {
    setSelectedFiles(files);
    setProcessedFile(null);
  };

  // Handle merge operation
  const handleMerge = async () => {
    if (selectedFiles.length < 2) {
      console.error('At least two PDFs are required for merging');
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('files', file));

      const response = await fetch('/api/pdf/merge', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to merge PDFs');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setProcessedFile({ url, filename: 'merged.pdf' });
    } catch (error) {
      console.error('Error merging PDFs:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle file selection for split
  const handleSplitFileSelect = (files: PDFFile[]) => {
    if (files[0]) {
      setSelectedFiles([files[0]]);
      setProcessedFile(null);
    }
  };

  // Handle split operation
  const handleSplit = async () => {
    if (!selectedFiles[0]) {
      console.error('No PDF selected for splitting');
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFiles[0]);
      formData.append('ranges', JSON.stringify(pageRanges));

      const response = await fetch('/api/pdf/split', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to split PDF');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setProcessedFile({ url, filename: 'split.pdf' });
    } catch (error) {
      console.error('Error splitting PDF:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle download
  const handleDownload = () => {
    if (processedFile) {
      const a = document.createElement('a');
      a.href = processedFile.url;
      a.download = processedFile.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Handle convert operation
  const handleConvert = async () => {
    if (!selectedFiles[0]) {
      console.error('No PDF selected for conversion');
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFiles[0]);
      formData.append('format', selectedFormat);

      const response = await fetch('/api/pdf/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to convert PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const extension = selectedFormat === 'image' ? 'png' : selectedFormat === 'docx' ? 'docx' : 'txt';
      setProcessedFile({ url, filename: `converted.${extension}` });
    } catch (error) {
      console.error('Error converting PDF:', error);
      setError(error instanceof Error ? error.message : 'Failed to convert PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle compress operation
  const handleCompress = async () => {
    if (!selectedFiles[0]) {
      console.error('No PDF selected for compression');
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFiles[0]);
      formData.append('quality', compressionLevel);

      const response = await fetch('/api/pdf/compress', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to compress PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setProcessedFile({ url, filename: 'compressed.pdf' });
    } catch (error) {
      console.error('Error compressing PDF:', error);
      setError(error instanceof Error ? error.message : 'Failed to compress PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>PDF Operations</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="merge" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="merge" className="flex items-center gap-2">
              <MergeIcon className="h-4 w-4" />
              Merge
            </TabsTrigger>
            <TabsTrigger value="split" className="flex items-center gap-2">
              <Scissors className="h-4 w-4" />
              Split
            </TabsTrigger>
            <TabsTrigger value="convert" className="flex items-center gap-2">
              <FileOutput className="h-4 w-4" />
              Convert
            </TabsTrigger>
            <TabsTrigger value="compress" className="flex items-center gap-2">
              <Minimize2 className="h-4 w-4" />
              Compress
            </TabsTrigger>
          </TabsList>

          <TabsContent value="merge">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select multiple PDFs to merge them into a single document.
              </p>
              <PDFManager
                multiple
                onFilesSelected={handleMergeFileSelect}
              />
              <div className="flex justify-end gap-4">
                <Button
                  onClick={handleMerge}
                  disabled={selectedFiles.length < 2 || isProcessing}
                >
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Merge PDFs
                </Button>
                {processedFile && (
                  <Button
                    variant="outline"
                    onClick={handleDownload}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="split">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Split a PDF into multiple documents by specifying page ranges.
              </p>
              <div className="space-y-4">
                <PDFManager
                  onFilesSelected={handleSplitFileSelect}
                />
                <div className="space-y-2">
                  {pageRanges.map((range, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label>Start Page</Label>
                          <Input
                            type="number"
                            min={1}
                            value={range.start}
                            onChange={(e) => {
                              const newRanges = [...pageRanges];
                              newRanges[index].start = parseInt(e.target.value);
                              setPageRanges(newRanges);
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Page</Label>
                          <Input
                            type="number"
                            min={1}
                            value={range.end}
                            onChange={(e) => {
                              const newRanges = [...pageRanges];
                              newRanges[index].end = parseInt(e.target.value);
                              setPageRanges(newRanges);
                            }}
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="self-end"
                        onClick={() => {
                          if (pageRanges.length > 1) {
                            setPageRanges(pageRanges.filter((_, i) => i !== index));
                          }
                        }}
                      >
                        <Minimize2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setPageRanges([...pageRanges, { start: 1, end: 1 }])}
                    >
                      Add Range
                    </Button>
                    <div className="flex gap-4">
                      <Button
                        onClick={handleSplit}
                        disabled={!selectedFiles[0] || isProcessing}
                      >
                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Split PDF
                      </Button>
                      {processedFile && (
                        <Button
                          variant="outline"
                          onClick={handleDownload}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="convert">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Convert your PDF to other formats.
              </p>
              <div className="space-y-4">
                <PDFManager
                  onFilesSelected={handleSplitFileSelect}
                />
                <div className="space-y-2">
                  <Label>Output Format</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {CONVERSION_FORMATS.map((format) => (
                      <Button
                        key={format.value}
                        variant={selectedFormat === format.value ? 'default' : 'outline'}
                        onClick={() => setSelectedFormat(format.value)}
                        disabled={isProcessing}
                      >
                        {format.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-4">
                  <Button
                    onClick={handleConvert}
                    disabled={!selectedFiles[0] || isProcessing}
                  >
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Convert PDF
                  </Button>
                  {processedFile && (
                    <Button
                      variant="outline"
                      onClick={handleDownload}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  )}
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="compress">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Compress your PDF to reduce file size.
              </p>
              <div className="space-y-4">
                <PDFManager
                  onFilesSelected={handleSplitFileSelect}
                />
                <div className="space-y-2">
                  <Label>Compression Level</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <Button
                        key={level}
                        variant={compressionLevel === level ? 'default' : 'outline'}
                        onClick={() => setCompressionLevel(level)}
                        disabled={isProcessing}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-4">
                  <Button
                    onClick={handleCompress}
                    disabled={!selectedFiles[0] || isProcessing}
                  >
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Compress PDF
                  </Button>
                  {processedFile && (
                    <Button
                      variant="outline"
                      onClick={handleDownload}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  )}
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 