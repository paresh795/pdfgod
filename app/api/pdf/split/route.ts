import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

interface PageRange {
  start: number;
  end: number;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const ranges = JSON.parse(formData.get('ranges') as string) as PageRange[];

    if (!file) {
      return NextResponse.json(
        { error: 'No PDF file provided' },
        { status: 400 }
      );
    }

    // Load the source PDF
    const pdfBytes = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(pdfBytes);
    const pageCount = sourcePdf.getPageCount();

    // Validate page ranges
    for (const range of ranges) {
      if (range.start < 1 || range.end > pageCount || range.start > range.end) {
        return NextResponse.json(
          { error: `Invalid page range: ${range.start}-${range.end}. Document has ${pageCount} pages.` },
          { status: 400 }
        );
      }
    }

    // Create a new PDF with the specified pages
    const newPdf = await PDFDocument.create();
    
    for (const range of ranges) {
      const pages = await newPdf.copyPages(
        sourcePdf,
        Array.from(
          { length: range.end - range.start + 1 },
          (_, i) => range.start + i - 1
        )
      );
      pages.forEach((page) => newPdf.addPage(page));
    }

    // Save the split PDF
    const newPdfBytes = await newPdf.save();

    return new NextResponse(newPdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="split.pdf"',
      },
    });
  } catch (error) {
    console.error('Error splitting PDF:', error);
    return NextResponse.json(
      { error: 'Failed to split PDF' },
      { status: 500 }
    );
  }
} 