'use client';

import { useState } from 'react';
import { PDFUpload, PDFFile } from './pdf-upload';
import { Button } from './button';
import { Trash2, FileText } from 'lucide-react';
import { Card, CardContent } from './card';
import { ScrollArea } from './scroll-area';

interface PDFManagerProps {
  onFilesSelected?: (files: PDFFile[]) => void;
  multiple?: boolean;
}

export function PDFManager({ onFilesSelected, multiple = false }: PDFManagerProps) {
  const [files, setFiles] = useState<PDFFile[]>([]);

  const handleUpload = (newFiles: PDFFile[]) => {
    if (multiple) {
      setFiles(prev => [...prev, ...newFiles]);
    } else {
      setFiles(newFiles);
    }
    onFilesSelected?.(newFiles);
  };

  const handleRemove = (fileToRemove: PDFFile) => {
    setFiles(prev => prev.filter(file => file !== fileToRemove));
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
  };

  const handleRemoveAll = () => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
  };

  return (
    <div className="space-y-4">
      <PDFUpload onUpload={handleUpload} multiple={multiple} />

      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Selected PDF{files.length > 1 ? 's' : ''}
              </h3>
              {files.length > 1 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveAll}
                >
                  Remove All
                </Button>
              )}
            </div>

            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(file)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 