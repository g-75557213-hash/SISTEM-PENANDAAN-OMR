// Standard Braille Pattern System for Malaysian OMR Sheet Recognition
// Provides 6-dot Braille standard mappings for question numbers (1 to 100) and column letters (A, B, C, D, E)
// Includes unicode Braille characters, standard dot-matrix representations, and canvas drawing functions
// for both visual verification and high-precision computer vision optical row/column locking.

// Standard Grade 1 Braille Letters
// A: dot 1 (⠁)
// B: dot 1,2 (⠃)
// C: dot 1,4 (⠉)
// D: dot 1,4,5 (⠙)
// E: dot 1,5 (⠑)
export const BRAILLE_LETTERS: Record<'A' | 'B' | 'C' | 'D' | 'E', { unicode: string; dots: number[]; pattern: boolean[][] }> = {
  A: {
    unicode: '⠁',
    dots: [1],
    // 2x3 grid: [col0: [dot1, dot2, dot3], col1: [dot4, dot5, dot6]]
    // row 0: dot 1, dot 4
    // row 1: dot 2, dot 5
    // row 2: dot 3, dot 6
    pattern: [
      [true, false],  // row 0 (dot 1, dot 4)
      [false, false], // row 1 (dot 2, dot 5)
      [false, false], // row 2 (dot 3, dot 6)
    ],
  },
  B: {
    unicode: '⠃',
    dots: [1, 2],
    pattern: [
      [true, false],
      [true, false],
      [false, false],
    ],
  },
  C: {
    unicode: '⠉',
    dots: [1, 4],
    pattern: [
      [true, true],
      [false, false],
      [false, false],
    ],
  },
  D: {
    unicode: '⠙',
    dots: [1, 4, 5],
    pattern: [
      [true, true],
      [false, true],
      [false, false],
    ],
  },
  E: {
    unicode: '⠑',
    dots: [1, 5],
    pattern: [
      [true, false],
      [false, true],
      [false, false],
    ],
  },
};

// Standard Braille Numbers (using standard Braille number digits where 1=a, 2=b, 3=c, 4=d, 5=e, 6=f, 7=g, 8=h, 9=i, 0=j)
export const BRAILLE_DIGITS: Record<string, { unicode: string; dots: number[]; pattern: boolean[][] }> = {
  '1': {
    unicode: '⠁', // same as 'a'
    dots: [1],
    pattern: [
      [true, false],
      [false, false],
      [false, false],
    ],
  },
  '2': {
    unicode: '⠃', // same as 'b'
    dots: [1, 2],
    pattern: [
      [true, false],
      [true, false],
      [false, false],
    ],
  },
  '3': {
    unicode: '⠉', // same as 'c'
    dots: [1, 4],
    pattern: [
      [true, true],
      [false, false],
      [false, false],
    ],
  },
  '4': {
    unicode: '⠙', // same as 'd'
    dots: [1, 4, 5],
    pattern: [
      [true, true],
      [false, true],
      [false, false],
    ],
  },
  '5': {
    unicode: '⠑', // same as 'e'
    dots: [1, 5],
    pattern: [
      [true, false],
      [false, true],
      [false, false],
    ],
  },
  '6': {
    unicode: '⠋', // same as 'f'
    dots: [1, 2, 4],
    pattern: [
      [true, true],
      [true, false],
      [false, false],
    ],
  },
  '7': {
    unicode: '⠛', // same as 'g'
    dots: [1, 2, 4, 5],
    pattern: [
      [true, true],
      [true, true],
      [false, false],
    ],
  },
  '8': {
    unicode: '⠓', // same as 'h'
    dots: [1, 2, 5],
    pattern: [
      [true, false],
      [true, true],
      [false, false],
    ],
  },
  '9': {
    unicode: '⠊', // same as 'i'
    dots: [2, 4],
    pattern: [
      [false, true],
      [true, false],
      [false, false],
    ],
  },
  '0': {
    unicode: '⠚', // same as 'j'
    dots: [2, 4, 5],
    pattern: [
      [false, true],
      [true, true],
      [false, false],
    ],
  },
};

// Braille Number Sign prefix (dots 3, 4, 5, 6: ⠼)
export const BRAILLE_NUMBER_PREFIX = {
  unicode: '⠼',
  dots: [3, 4, 5, 6],
  pattern: [
    [false, true],
    [false, true],
    [true, true],
  ],
};

/**
 * Returns the Braille unicode string representation for any question number (1..100)
 * e.g. 1 -> "⠼⠁", 12 -> "⠼⠁⠃"
 */
export function getBrailleForNumber(num: number): string {
  const digits = num.toString().split('');
  return (
    BRAILLE_NUMBER_PREFIX.unicode +
    digits.map((d) => BRAILLE_DIGITS[d]?.unicode || '').join('')
  );
}

/**
 * Returns the Braille unicode for options 'A' | 'B' | 'C' | 'D' | 'E'
 */
export function getBrailleForOption(option: 'A' | 'B' | 'C' | 'D' | 'E'): string {
  return BRAILLE_LETTERS[option]?.unicode || '';
}

/**
 * Draws a crisp 2x3 Braille dot cell onto a canvas context at (x, y)
 * @param ctx 2D rendering context
 * @param x Left coordinate of the Braille cell
 * @param y Top coordinate of the Braille cell
 * @param pattern 2x3 boolean array [ [row0col0, row0col1], [row1col0, row1col1], [row2col0, row2col1] ]
 * @param options Styling options (dot radius, spacing, filled color, empty dot style)
 */
export function drawBrailleCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pattern: boolean[][],
  options?: {
    dotRadius?: number;
    spacingX?: number;
    spacingY?: number;
    fillColor?: string;
    emptyColor?: string;
    showEmptyGuides?: boolean;
  }
) {
  const dotRadius = options?.dotRadius ?? 1.8;
  const spacingX = options?.spacingX ?? 4.5;
  const spacingY = options?.spacingY ?? 4.5;
  const fillColor = options?.fillColor ?? '#000000';
  const emptyColor = options?.emptyColor ?? '#e2e8f0';
  const showEmptyGuides = options?.showEmptyGuides ?? true;

  ctx.save();
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 2; c++) {
      const dotX = x + c * spacingX;
      const dotY = y + r * spacingY;
      const isFilled = pattern[r] && pattern[r][c];

      ctx.beginPath();
      ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);

      if (isFilled) {
        ctx.fillStyle = fillColor;
        ctx.fill();
      } else if (showEmptyGuides) {
        ctx.fillStyle = emptyColor;
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/**
 * Draws the complete Braille pattern for a question number (number sign + digits)
 * Width of total drawing is returned so subsequent elements can be spaced.
 */
export function drawBrailleNumberPattern(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  num: number,
  options?: {
    dotRadius?: number;
    spacingX?: number;
    spacingY?: number;
    cellGap?: number;
    fillColor?: string;
  }
): number {
  const dotRadius = options?.dotRadius ?? 1.6;
  const spacingX = options?.spacingX ?? 3.8;
  const spacingY = options?.spacingY ?? 3.8;
  const cellGap = options?.cellGap ?? 3.5;
  const cellWidth = spacingX + dotRadius * 2;
  const fillColor = options?.fillColor ?? '#000000';

  let currentX = startX;

  // 1. Draw Braille number sign ⠼
  drawBrailleCell(ctx, currentX, startY, BRAILLE_NUMBER_PREFIX.pattern, {
    dotRadius,
    spacingX,
    spacingY,
    fillColor,
    showEmptyGuides: false,
  });
  currentX += cellWidth + cellGap;

  // 2. Draw each digit
  const digits = num.toString().split('');
  for (const digit of digits) {
    const digitData = BRAILLE_DIGITS[digit];
    if (digitData) {
      drawBrailleCell(ctx, currentX, startY, digitData.pattern, {
        dotRadius,
        spacingX,
        spacingY,
        fillColor,
        showEmptyGuides: false,
      });
      currentX += cellWidth + cellGap;
    }
  }

  return currentX - startX;
}

/**
 * Draws Braille cell for option letter (A, B, C, D, E)
 */
export function drawBrailleOptionPattern(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  option: 'A' | 'B' | 'C' | 'D' | 'E',
  options?: {
    dotRadius?: number;
    spacingX?: number;
    spacingY?: number;
    fillColor?: string;
  }
) {
  const letterData = BRAILLE_LETTERS[option];
  if (!letterData) return;

  const dotRadius = options?.dotRadius ?? 1.8;
  const spacingX = options?.spacingX ?? 4.2;
  const spacingY = options?.spacingY ?? 4.2;
  const fillColor = options?.fillColor ?? '#000000';

  // Center the 2x3 cell around (centerX, centerY)
  const cellW = spacingX;
  const cellH = spacingY * 2;
  const startX = centerX - cellW / 2;
  const startY = centerY - cellH / 2;

  drawBrailleCell(ctx, startX, startY, letterData.pattern, {
    dotRadius,
    spacingX,
    spacingY,
    fillColor,
    showEmptyGuides: true,
  });
}
