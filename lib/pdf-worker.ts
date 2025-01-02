import * as pdfjs from 'pdfjs-dist';

if (typeof window === 'undefined') {
  // Server-side setup
  const { join } = require('path');
  const workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.js');
  
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
} else {
  // Client-side setup
  const workerUrl = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url
  );
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.href;
}

export { pdfjs }; 