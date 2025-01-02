'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Progress } from './progress';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './alert';

export interface PDFFile extends File {
  preview?: string;
}

interface PDFUploadProps {
  onUpload: (files: PDFFile[]) => void;
  multiple?: boolean;
  maxSize?: number;
}

export function PDFUpload({
  onUpload,
  multiple = false,
  maxSize = 100 * 1024 * 1024, // 100MB default
}: PDFUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError(null);
      setUploading(true);
      setProgress(0);

      try {
        // Validate file sizes
        const oversizedFiles = acceptedFiles.filter(file => file.size > maxSize);
        if (oversizedFiles.length > 0) {
          throw new Error(`File${oversizedFiles.length > 1 ? 's' : ''} too large. Maximum size is ${Math.floor(maxSize / 1024 / 1024)}MB`);
        }

        // Convert to PDFFile type and add preview URLs
        const pdfFiles = acceptedFiles.map(file => 
          Object.assign(file, {
            preview: URL.createObjectURL(file)
          })
        ) as PDFFile[];

        // Simulate progress
        const interval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 95) {
              clearInterval(interval);
              return prev;
            }
            return prev + 5;
          });
        }, 100);

        await onUpload(pdfFiles);
        setProgress(100);
        setTimeout(() => clearInterval(interval), 100);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload PDF');
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [maxSize, onUpload]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple,
    maxSize
  });

  return (
    <div className="w-full space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/10" : "hover:border-primary",
          isDragReject && "border-destructive bg-destructive/10"
        )}
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

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
} 