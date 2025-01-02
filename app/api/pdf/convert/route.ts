import { NextRequest, NextResponse } from 'next/server';
import { pdfjs } from '@/lib/pdf-worker';
import { renderPageToCanvas } from '@/lib/canvas-utils';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const format = formData.get('format') as 'docx' | 'image' | 'text';

    if (!file) {
      return NextResponse.json(
        { error: 'No PDF file provided' },
        { status: 400 }
      );
    }

    const pdfBytes = await file.arrayBuffer();
    const pdfDoc = await pdfjs.getDocument({
      data: new Uint8Array(pdfBytes),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    }).promise;

    switch (format) {
      case 'text': {
        let text = '';
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item: any) => item.str)
            .join(' ');
          text += `Page ${i}\n${pageText}\n\n`;
        }

        return new NextResponse(text, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '.txt')}"`,
          },
        });
      }

      case 'image': {
        const page = await pdfDoc.getPage(1);
        const canvas = await renderPageToCanvas({ 
          page, 
          scale: 2.0 
        });

        const sharp = (await import('sharp')).default;
        const pngBuffer = await sharp(canvas.toBuffer('image/png'))
          .png({ quality: 100 })
          .toBuffer();

        return new NextResponse(pngBuffer, {
          headers: {
            'Content-Type': 'image/png',
            'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '.png')}"`,
          },
        });
      }

      case 'docx': {
        let text = '';
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const content = await page.getTextContent();
          const items = content.items as Array<{ str: string; transform: number[] }>;
          
          let lastY: number | null = null;
          let lineText = '';

          for (const item of items) {
            const [, , , y] = item.transform;
            
            if (lastY !== null && Math.abs(y - lastY) > 5) {
              text += lineText.trim() + '\n';
              lineText = '';
            }
            
            lineText += item.str + ' ';
            lastY = y;
          }
          
          if (lineText.trim()) {
            text += lineText.trim() + '\n';
          }
          text += '\n';
        }

        return new NextResponse(text, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '.txt')}"`,
          },
        });
      }

      default:
        return NextResponse.json(
          { error: 'Unsupported format' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error converting PDF:', error);
    return NextResponse.json(
      { error: 'Failed to convert PDF. Please try again.' },
      { status: 500 }
    );
  }
} 