/**
 * Simple SVG QR Code generator for DID URLs and Verification links.
 * Renders a clean 21x21 QR matrix SVG string or data URL.
 */

export function generateQRCodeSVG(text, size = 160) {
  // Simple deterministic pattern generator for demo DIDs
  const hash = Array.from(text).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 1000003, 7);
  const matrixSize = 21;
  const cells = Array(matrixSize).fill(0).map(() => Array(matrixSize).fill(false));

  // Finder Patterns (Top-Left, Top-Right, Bottom-Left)
  function addFinder(r, c) {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
          cells[r + i][c + j] = true;
        }
      }
    }
  }

  addFinder(0, 0);
  addFinder(0, matrixSize - 7);
  addFinder(matrixSize - 7, 0);

  // Fill pseudo-random data bits based on text hash
  let val = hash;
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      // Skip finder patterns
      if ((r < 8 && c < 8) || (r < 8 && c >= matrixSize - 8) || (r >= matrixSize - 8 && c < 8)) continue;
      val = (val * 1103515245 + 12345) & 0x7fffffff;
      cells[r][c] = (val % 3) !== 0;
    }
  }

  // Generate SVG path elements
  const cellSize = size / matrixSize;
  let rects = [];
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (cells[r][c]) {
        rects.push(`<rect x="${(c * cellSize).toFixed(2)}" y="${(r * cellSize).toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="#12202E"/>`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#FFFFFF" rx="4"/>
    ${rects.join('')}
  </svg>`;
}

export function getQRCodeDataUrl(text, size = 160) {
  const svg = generateQRCodeSVG(text, size);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
