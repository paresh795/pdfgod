import { createCanvas } from 'canvas';
import type { PDFPageProxy } from 'pdfjs-dist';

interface RenderPageOptions {
  page: PDFPageProxy;
  scale?: number;
}

export async function renderPageToCanvas({ page, scale = 1.0 }: RenderPageOptions) {
  try {
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Failed to get canvas context');
    }

    // Prepare canvas for PDF rendering
    const renderContext = {
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport: viewport,
    };

    await page.render(renderContext).promise;
    return canvas;
  } catch (error) {
    console.error('Error rendering PDF page to canvas:', error);
    throw new Error('Failed to render PDF page to canvas');
  }
}

export async function compressImage(canvas: ReturnType<typeof createCanvas>, quality: number) {
  try {
    const sharp = (await import('sharp')).default;
    const buffer = canvas.toBuffer('image/jpeg', { quality: quality / 100 });
    
    return await sharp(buffer)
      .jpeg({ quality })
      .toBuffer();
  } catch (error) {
    console.error('Error compressing image:', error);
    throw new Error('Failed to compress image');
  }
} 