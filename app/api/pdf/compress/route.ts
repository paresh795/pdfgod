import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { pdfjs } from '@/lib/pdf-worker';
import { renderPageToCanvas, compressImage } from '@/lib/canvas-utils';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const quality = formData.get('quality') as 'low' | 'medium' | 'high';

    if (!file) {
      return NextResponse.json(
        { error: 'No PDF file provided' },
        { status: 400 }
      );
    }

    // Quality settings
    const qualitySettings = {
      low: { scale: 0.5, quality: 30 },
      medium: { scale: 0.75, quality: 50 },
      high: { scale: 1.0, quality: 70 },
    };

    const settings = qualitySettings[quality] || qualitySettings.medium;
    const pdfBytes = await file.arrayBuffer();

    // Load the PDF using pdf.js
    const pdfDoc = await pdfjs.getDocument({
      data: new Uint8Array(pdfBytes),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    }).promise;

    // Create a new PDF document
    const newPdf = await PDFDocument.create();

    // Process each page
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      
      // Render page to canvas
      const canvas = await renderPageToCanvas({
        page,
        scale: settings.scale,
      });

      // Compress the page image
      const compressedImage = await compressImage(canvas, settings.quality);

      // Add compressed image to new PDF
      const image = await newPdf.embedJpg(compressedImage);
      const { width, height } = page.getViewport({ scale: 1.0 });
      const newPage = newPdf.addPage([width, height]);
      
      newPage.drawImage(image, {
        x: 0,
        y: 0,
        width: width * settings.scale,
        height: height * settings.scale,
      });
    }

    // Save the compressed PDF
    const compressedPdfBytes = await newPdf.save({
      useObjectStreams: false,
      addDefaultPage: false,
    });

    return new NextResponse(compressedPdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="compressed-${file.name}"`,
      },
    });
  } catch (error) {
    console.error('Error compressing PDF:', error);
    return NextResponse.json(
      { error: 'Failed to compress PDF. Please try again.' },
      { status: 500 }
    );
  }
} 