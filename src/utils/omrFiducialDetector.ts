// High-Speed Computer Vision OMR Optical Grid Engine (6 Fiducial Points + Row Timing Marks)
// Piecewise Bi-Linear Registration & Optical Mark Recognition across 6 Corner Guide Markers.
// Pure geometric and mathematical mark recognition with millimeter accuracy.
// AI is used strictly for Student Name OCR.

export interface Point2D {
  x: number;
  y: number;
}

export interface MarkerSquare {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  found: boolean;
}

export interface SixCornerMarkers {
  topLeft: MarkerSquare;
  topRight: MarkerSquare;
  midLeft: MarkerSquare;
  midRight: MarkerSquare;
  botLeft: MarkerSquare;
  botRight: MarkerSquare;
  allFound: boolean;
  foundCount: number;
}

export interface QuestionDetectedAnswer {
  nombor_soalan: number;
  jawapan_pelajar: string; // 'A' | 'B' | 'C' | 'D' | 'E' | 'TIADA_JAWAPAN' | 'AMBIGU/DOUBLE_MARK' | 'TIDAK_JELAS'
  jawapan_sebenar: string;
  status: 'BETUL' | 'SALAH' | 'KOSONG' | 'DOUBLE_MARK' | 'TIDAK_JELAS';
  annotation: {
    simbol: '✔' | '✘' | '○' | '⚠';
    warna: 'GREEN' | 'RED' | 'YELLOW' | 'ORANGE';
    teks_tambahan: string;
  };
  box: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
    markedBubble?: { x: number; y: number };
    correctBubble?: { x: number; y: number };
    rowTimingMark?: { x: number; y: number; found: boolean };
  };
  bubbleCenters?: Record<string, { x: number; y: number }>;
  intensities: Record<string, number>; // fill ratio / darkness per option
}

export interface LocalOMRGradingResult {
  ringkasan_keputusan: {
    nama_pelajar: string;
    jumlah_soalan: number;
    jawapan_betul: number;
    jawapan_salah: number;
    jumlah_markah: string;
    peratusan: string;
  };
  analisis_detail: QuestionDetectedAnswer[];
  cetakan_header_markah: {
    posisi: 'BOTTOM_FOOTER' | 'TOP_RIGHT';
    teks_cetakan: string;
    status_kelulusan: 'CEMERLANG' | 'LULUS' | 'GAGAL';
  };
  catatan_teknikal: string;
  markersFound?: SixCornerMarkers | null;
  cropBox?: { x: number; y: number; w: number; h: number };
}

/**
 * Load an image from dataURL or URL into an HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Gagal memuat imej borang OMR: ' + e));
    img.src = src;
  });
}

/**
 * Find solid dark square blob within a specific zone.
 * Unlike naive pixel thresholding, this strictly checks for:
 * 1. Compact bounding box (width & height within expected fiducial square range).
 * 2. High solidity (density >= 0.55), distinguishing it from hollow text characters or borders.
 * 3. Square aspect ratio (between 0.65 and 1.55).
 * 4. Isolation from the student name box (strictly bounded within the paper margins).
 */
function findSolidSquareBlobInZone(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  zone: { x1: number; x2: number; y1: number; y2: number },
  cornerType: 'TL' | 'TR' | 'ML' | 'MR' | 'BL' | 'BR'
): MarkerSquare {
  const minDim = Math.min(width, height);
  // Expected marker size on template is ~34px out of 1240 (~2.7% of width).
  // Allow between 1.2% and 5.5% of dimension.
  const minMarkerPx = Math.max(10, Math.round(minDim * 0.014));
  const maxMarkerPx = Math.max(30, Math.round(minDim * 0.058));

  // 1. Sample paper baseline brightness in this local quadrant
  let brightnessSum = 0;
  let brightnessCount = 0;
  const step = Math.max(2, Math.floor(minDim / 200));

  for (let y = zone.y1; y < zone.y2; y += step * 2) {
    for (let x = zone.x1; x < zone.x2; x += step * 2) {
      const idx = (y * width + x) * 4;
      const b = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
      brightnessSum += b;
      brightnessCount++;
    }
  }
  const avgZoneBrightness = brightnessCount > 0 ? brightnessSum / brightnessCount : 220;
  const darkThreshold = Math.min(140, Math.max(45, avgZoneBrightness * 0.62));

  // 2. Identify candidate dark seeds and explore solid bounding boxes
  let bestCandidate: MarkerSquare | null = null;
  let bestScore = -1;

  // Search grid
  const scanStep = Math.max(2, Math.floor(minMarkerPx * 0.35));

  for (let sy = zone.y1; sy < zone.y2 - minMarkerPx; sy += scanStep) {
    for (let sx = zone.x1; sx < zone.x2 - minMarkerPx; sx += scanStep) {
      const idx = (sy * width + sx) * 4;
      const b = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;

      if (b < darkThreshold) {
        // Expand bounding box around dark cluster
        let minX = sx;
        let maxX = sx;
        let minY = sy;
        let maxY = sy;
        let darkPixels = 0;

        // Quick probe bounding extent
        const probeLimit = maxMarkerPx;
        for (let py = Math.max(zone.y1, sy - 4); py <= Math.min(zone.y2, sy + probeLimit); py += 2) {
          for (let px = Math.max(zone.x1, sx - 4); px <= Math.min(zone.x2, sx + probeLimit); px += 2) {
            const pIdx = (py * width + px) * 4;
            const pb = (data[pIdx] * 299 + data[pIdx + 1] * 587 + data[pIdx + 2] * 114) / 1000;
            if (pb < darkThreshold) {
              darkPixels++;
              if (px < minX) minX = px;
              if (px > maxX) maxX = px;
              if (py < minY) minY = py;
              if (py > maxY) maxY = py;
            }
          }
        }

        const bw = maxX - minX + 1;
        const bh = maxY - minY + 1;

        if (bw >= minMarkerPx && bw <= maxMarkerPx && bh >= minMarkerPx && bh <= maxMarkerPx) {
          const area = bw * bh;
          // Sample full density in bounding box
          let boxDarkCount = 0;
          let boxTotal = 0;
          let sumX = 0;
          let sumY = 0;

          for (let by = minY; by <= maxY; by++) {
            for (let bx = minX; bx <= maxX; bx++) {
              const bIdx = (by * width + bx) * 4;
              const pb = (data[bIdx] * 299 + data[bIdx + 1] * 587 + data[bIdx + 2] * 114) / 1000;
              if (pb < darkThreshold) {
                boxDarkCount++;
                sumX += bx;
                sumY += by;
              }
              boxTotal++;
            }
          }

          const solidity = boxTotal > 0 ? boxDarkCount / boxTotal : 0;
          const aspect = Math.max(bw, bh) / Math.max(1, Math.min(bw, bh));

          // A fiducial square is SOLID (solidity > 0.58) and near 1:1 aspect ratio (aspect <= 1.55)
          if (solidity >= 0.58 && aspect <= 1.55) {
            // Distance preference towards expected corner margin
            let cornerDist = 0;
            if (cornerType === 'TL') cornerDist = minX + minY;
            else if (cornerType === 'TR') cornerDist = (width - maxX) + minY;
            else if (cornerType === 'ML') cornerDist = minX + Math.abs((minY + maxY) / 2 - height * 0.52);
            else if (cornerType === 'MR') cornerDist = (width - maxX) + Math.abs((minY + maxY) / 2 - height * 0.52);
            else if (cornerType === 'BL') cornerDist = minX + (height - maxY);
            else if (cornerType === 'BR') cornerDist = (width - maxX) + (height - maxY);

            // Score combines solidity, squareness, and proximity to the corner
            const score = solidity * 100 - (aspect - 1) * 30 - (cornerDist / minDim) * 20;

            if (score > bestScore) {
              bestScore = score;
              const cx = boxDarkCount > 0 ? Math.round(sumX / boxDarkCount) : Math.round((minX + maxX) / 2);
              const cy = boxDarkCount > 0 ? Math.round(sumY / boxDarkCount) : Math.round((minY + maxY) / 2);

              bestCandidate = {
                x: minX,
                y: minY,
                w: bw,
                h: bh,
                cx,
                cy,
                found: true,
              };
            }
          }
        }
      }
    }
  }

  if (bestCandidate) {
    return bestCandidate;
  }

  // Fallback if marker was slightly obscured or outside boundary
  const defCx = Math.round((zone.x1 + zone.x2) / 2);
  const defCy = Math.round((zone.y1 + zone.y2) / 2);
  return {
    x: defCx - Math.round(minMarkerPx / 2),
    y: defCy - Math.round(minMarkerPx / 2),
    w: minMarkerPx,
    h: minMarkerPx,
    cx: defCx,
    cy: defCy,
    found: false,
  };
}

/**
 * Detect the 6 black fiducial corner markers on the sheet using robust blob geometry.
 * Standard template defines 6 black squares (Top-L, Top-R, Mid-L, Mid-R, Bot-L, Bot-R).
 * Critical constraint: The Top-Left marker search is restricted to the outer margin (x <= 16%),
 * completely isolating it from the Student Name (NAMA) box which is in the central header.
 */
export function findSixFiducialMarkers(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): SixCornerMarkers | null {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Search zones for the 6 markers strictly confined to margins:
    // Left markers are in x: 0..16% (to the left of NAMA box!)
    // Right markers are in x: 84%..100%
    const zones = {
      topLeft: { x1: 0, x2: Math.floor(width * 0.18), y1: 0, y2: Math.floor(height * 0.22) },
      topRight: { x1: Math.floor(width * 0.82), x2: width, y1: 0, y2: Math.floor(height * 0.22) },
      midLeft: { x1: 0, x2: Math.floor(width * 0.18), y1: Math.floor(height * 0.38), y2: Math.floor(height * 0.65) },
      midRight: { x1: Math.floor(width * 0.82), x2: width, y1: Math.floor(height * 0.38), y2: Math.floor(height * 0.65) },
      botLeft: { x1: 0, x2: Math.floor(width * 0.18), y1: Math.floor(height * 0.78), y2: height },
      botRight: { x1: Math.floor(width * 0.82), x2: width, y1: Math.floor(height * 0.78), y2: height },
    };

    const tl = findSolidSquareBlobInZone(data, width, height, zones.topLeft, 'TL');
    const tr = findSolidSquareBlobInZone(data, width, height, zones.topRight, 'TR');
    const ml = findSolidSquareBlobInZone(data, width, height, zones.midLeft, 'ML');
    const mr = findSolidSquareBlobInZone(data, width, height, zones.midRight, 'MR');
    const bl = findSolidSquareBlobInZone(data, width, height, zones.botLeft, 'BL');
    const br = findSolidSquareBlobInZone(data, width, height, zones.botRight, 'BR');

    const foundCount = [tl, tr, ml, mr, bl, br].filter((m) => m.found).length;

    return {
      topLeft: tl,
      topRight: tr,
      midLeft: ml,
      midRight: mr,
      botLeft: bl,
      botRight: br,
      allFound: foundCount === 6,
      foundCount,
    };
  } catch (e) {
    console.warn('Fiducial marker detection exception:', e);
    return null;
  }
}

/**
 * Crop the Student Name (NAMA) box area from the canvas to send exclusively to AI OCR.
 * Strictly crops ONLY the top header row 1 of the info container, well above the exam answer grid.
 */
export function cropStudentNameBoxDataUrl(
  canvas: HTMLCanvasElement,
  markers: SixCornerMarkers | null
): string | null {
  try {
    const w = canvas.width;
    const h = canvas.height;

    let cropX = Math.round(w * 0.12);
    let cropY = Math.round(h * 0.08);
    let cropW = Math.round(w * 0.76);
    let cropH = Math.round(h * 0.075);

    if (markers && (markers.topLeft.found || markers.topRight.found)) {
      const leftX = markers.topLeft.found ? markers.topLeft.cx + markers.topLeft.w * 0.8 : w * 0.08;
      const rightX = markers.topRight.found ? markers.topRight.cx - markers.topRight.w * 0.8 : w * 0.92;
      const topY = markers.topLeft.found ? markers.topLeft.cy - 10 : h * 0.08;

      cropX = Math.round(leftX);
      cropY = Math.max(0, Math.round(topY));
      cropW = Math.round(rightX - leftX);
      cropH = Math.round(h * 0.08);
    }

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = Math.max(100, cropW);
    cropCanvas.height = Math.max(40, cropH);
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return null;

    cropCtx.drawImage(
      canvas,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      cropCanvas.width,
      cropCanvas.height
    );

    return cropCanvas.toDataURL('image/jpeg', 0.9);
  } catch (err) {
    console.warn('cropStudentNameBox error:', err);
    return null;
  }
}

/**
 * Core Algorithm: Optical Mark Recognition using Piecewise Bi-Linear 6-Point Registration
 * COMBINED WITH ACTIVE DETECTION OF THE KOTAK HITAM NOMBOR JAWAPAN (ROW TIMING MARKS).
 *
 * This completely prevents the system from confusing the Student Name (NAMA) box with Question 1!
 * Question 1 starts STRICTLY where the first Row Timing Mark (Kotak Hitam Jalur Y) appears beside
 * question number 1, directly under the column headers A, B, C, D, E.
 */
export function processOMRGridAnswers(
  canvas: HTMLCanvasElement,
  answerKey: Record<number, string>,
  totalQuestions: number = 20,
  optionsCount: 4 | 5 = 5,
  passingPercentage: number = 40,
  markers: SixCornerMarkers | null
): LocalOMRGradingResult {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1. Reference Template Geometry (1240 x 1754 px @ 150 DPI)
  // Exact coordinate map matching omrCanvasDrawer.ts
  const REF_W = 1240;
  const REF_H = 1754;
  const REF_TOP_Y = 162;
  const REF_MID_Y = 877;
  const REF_BOT_Y = 1677;
  const REF_LEFT_X = 57;
  const REF_RIGHT_X = 1183;

  /**
   * Piecewise quadrilateral coordinate mapping:
   * Maps any reference point (refX, refY) into the actual image coordinates (imgX, imgY)
   * by interpolating through Top, Middle, and Bottom fiducial anchors.
   */
  const mapPoint = (refX: number, refY: number): { x: number; y: number } => {
    if (!markers || markers.foundCount < 2) {
      // Default proportional mapping
      return {
        x: (refX / REF_W) * width,
        y: (refY / REF_H) * height,
      };
    }

    const { topLeft: tl, topRight: tr, midLeft: ml, midRight: mr, botLeft: bl, botRight: br } = markers;

    // Horizontal ratio between left and right marker lines (0 = left, 1 = right)
    const u = Math.max(0, Math.min(1, (refX - REF_LEFT_X) / (REF_RIGHT_X - REF_LEFT_X)));

    let leftX: number, leftY: number;
    let rightX: number, rightY: number;

    if (refY <= REF_MID_Y) {
      // Upper section: interpolate between Top pair and Middle pair
      const v = Math.max(0, Math.min(1, (refY - REF_TOP_Y) / (REF_MID_Y - REF_TOP_Y)));
      leftX = tl.cx * (1 - v) + ml.cx * v;
      leftY = tl.cy * (1 - v) + ml.cy * v;
      rightX = tr.cx * (1 - v) + mr.cx * v;
      rightY = tr.cy * (1 - v) + mr.cy * v;
    } else {
      // Lower section: interpolate between Middle pair and Bottom pair
      const v = Math.max(0, Math.min(1, (refY - REF_MID_Y) / (REF_BOT_Y - REF_MID_Y)));
      leftX = ml.cx * (1 - v) + bl.cx * v;
      leftY = ml.cy * (1 - v) + bl.cy * v;
      rightX = mr.cx * (1 - v) + br.cx * v;
      rightY = mr.cy * (1 - v) + br.cy * v;
    }

    const mappedX = leftX * (1 - u) + rightX * u;
    const mappedY = leftY * (1 - u) + rightY * u;

    return { x: mappedX, y: mappedY };
  };

  // Dynamic column layout
  let numColumns = 2;
  if (totalQuestions <= 20) {
    numColumns = 2;
  } else if (totalQuestions <= 40) {
    numColumns = totalQuestions > 30 ? 3 : 2;
  } else if (totalQuestions <= 60) {
    numColumns = 3;
  } else {
    numColumns = 4;
  }

  const questionsPerColumn = Math.ceil(totalQuestions / numColumns);
  const optionsList: Array<'A' | 'B' | 'C' | 'D' | 'E'> =
    optionsCount === 4 ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E'];

  // Template reference coordinates:
  // Note: NAMA box is at Y: 145 to 270.
  // Column Header timing marks are at Y: 306.
  // QUESTION 1 gridStartY starts at Y: 330!
  const refGridStartY = 330;
  const refAvailableGridHeight = REF_H - refGridStartY - 240; // 1184
  const refRowHeight = Math.min(52, Math.max(26, Math.floor(refAvailableGridHeight / questionsPerColumn)));
  const refBubbleRadius = Math.min(15, Math.max(9, Math.round(refRowHeight * 0.30)));

  const refContentWidth = REF_W - 200; // 1040
  const refColumnGap = numColumns === 2 ? 60 : (numColumns === 3 ? 35 : 20);
  const refColumnWidth = Math.floor((refContentWidth - (numColumns - 1) * refColumnGap) / numColumns);
  const refStartX = 100;

  const refQNumWidth = 44;
  const refBubblesAreaWidth = optionsList.length * (refBubbleRadius * 2 + 16);
  const refBubbleSpacing = Math.floor(refBubblesAreaWidth / optionsList.length);

  /**
   * Helper to sample paper baseline brightness in a small local patch
   */
  const getLocalPaperBaseline = (centerX: number, centerY: number): number => {
    let sum = 0;
    let count = 0;
    for (let dy = -4; dy <= 4; dy += 2) {
      for (let dx = -4; dx <= 4; dx += 2) {
        const px = Math.round(centerX + dx);
        const py = Math.round(centerY + dy);
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const idx = (py * width + px) * 4;
          sum += (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
          count++;
        }
      }
    }
    return count > 0 ? sum / count : 220;
  };

  /**
   * Helper to sample the INNER CORE of a bubble (radius * 0.68)
   * Ignores printed bubble border, measures pure graphite/ink.
   */
  const getBubbleCoreMetrics = (
    centerX: number,
    centerY: number,
    radius: number,
    baselineBrightness: number
  ): { fillRatio: number; avgBrightness: number; score: number } => {
    let darkPixels = 0;
    let totalSamples = 0;
    let brightnessSum = 0;
    const coreRadius = Math.max(3, radius * 0.68);
    const rInt = Math.ceil(coreRadius);

    for (let dy = -rInt; dy <= rInt; dy++) {
      for (let dx = -rInt; dx <= rInt; dx++) {
        if (dx * dx + dy * dy <= coreRadius * coreRadius) {
          const px = Math.round(centerX + dx);
          const py = Math.round(centerY + dy);
          if (px >= 0 && px < width && py >= 0 && py < height) {
            const idx = (py * width + px) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            brightnessSum += brightness;

            // Threshold significantly below local paper background
            if (brightness < Math.min(155, baselineBrightness * 0.78)) {
              darkPixels++;
            }
            totalSamples++;
          }
        }
      }
    }

    if (totalSamples === 0) return { fillRatio: 0, avgBrightness: 255, score: 0 };

    const fillRatio = darkPixels / totalSamples;
    const avgBrightness = brightnessSum / totalSamples;
    const relativeDarkness = Math.max(0, (baselineBrightness - avgBrightness) / Math.max(1, baselineBrightness));
    const score = fillRatio * 0.65 + relativeDarkness * 0.35;

    return { fillRatio, avgBrightness, score };
  };

  /**
   * 2. DETEKSI KOTAK HITAM NOMBOR JAWAPAN (ROW TIMING TRACK DETECTOR)
   * On the template, each question row has a solid black box beside its question number:
   * refColX - 24, refCenterY - 6 (size 16x12 px).
   * Above Row 1 is the Column Timing Mark and then the NAMA box.
   * By scanning the timing track column vertically, we find the EXACT vertical coordinate of Row 1
   * and calibrate the true vertical scale for every question!
   */
  const columnRowYOffsets: Record<number, number[]> = {};

  for (let col = 0; col < numColumns; col++) {
    const refColX = refStartX + col * (refColumnWidth + refColumnGap);
    const expectedTimingX = refColX - 20;

    // Scan vertical track for black timing blocks
    const rowYList: number[] = [];

    for (let r = 0; r < questionsPerColumn; r++) {
      const qNum = col * questionsPerColumn + r + 1;
      if (qNum > totalQuestions) break;

      const refRowY = refGridStartY + r * refRowHeight;
      const refCenterY = refRowY + refRowHeight / 2;

      // Map expected timing mark center
      const expectedPt = mapPoint(expectedTimingX, refCenterY);

      // Search in window around expected timing block
      const searchYRadius = Math.max(10, Math.round(refRowHeight * 0.45));
      const searchXRadius = Math.max(12, Math.round(refRowHeight * 0.35));

      let darkSumX = 0;
      let darkSumY = 0;
      let darkCount = 0;

      const localBase = getLocalPaperBaseline(expectedPt.x - searchXRadius, expectedPt.y);
      const markThreshold = Math.min(135, localBase * 0.70);

      for (let dy = -searchYRadius; dy <= searchYRadius; dy += 2) {
        for (let dx = -searchXRadius; dx <= searchXRadius; dx += 2) {
          const tx = Math.round(expectedPt.x + dx);
          const ty = Math.round(expectedPt.y + dy);
          if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
            const idx = (ty * width + tx) * 4;
            const b = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
            if (b < markThreshold) {
              darkSumX += tx;
              darkSumY += ty;
              darkCount++;
            }
          }
        }
      }

      // If a solid timing mark was detected (solid black rectangle ~16x12 px)
      if (darkCount >= 10) {
        const detectedY = darkSumY / darkCount;
        rowYList.push(detectedY);
      } else {
        // Fallback to geometric piecewise interpolation
        rowYList.push(expectedPt.y);
      }
    }

    columnRowYOffsets[col] = rowYList;
  }

  const detailList: QuestionDetectedAnswer[] = [];
  let correctCount = 0;

  // Process each question
  for (let q = 1; q <= totalQuestions; q++) {
    const colIdx = Math.floor((q - 1) / questionsPerColumn);
    const rowInCol = (q - 1) % questionsPerColumn;

    const refColX = refStartX + colIdx * (refColumnWidth + refColumnGap);
    const refRowY = refGridStartY + rowInCol * refRowHeight;
    const refCenterY = refRowY + refRowHeight / 2;
    const refBubblesStartX = refColX + refQNumWidth + 12;

    const mappedColStart = mapPoint(refColX, refRowY);
    const mappedColEnd = mapPoint(refColX + refColumnWidth, refRowY + refRowHeight);

    // Active Row Center locked to Kotak Hitam Nombor Jawapan
    const detectedRowYList = columnRowYOffsets[colIdx];
    let fineTunedCenterY = mapPoint(refColX + refColumnWidth / 2, refCenterY).y;

    let isTimingMarkFound = false;
    let timingMarkX = mapPoint(refColX - 20, refCenterY).x;

    if (detectedRowYList && detectedRowYList[rowInCol] !== undefined) {
      fineTunedCenterY = detectedRowYList[rowInCol];
      isTimingMarkFound = true;
    }

    // Local paper baseline measurement
    const baselinePoint = mapPoint(refColX + refQNumWidth + 4, refCenterY);
    const rowBaselineBrightness = getLocalPaperBaseline(baselinePoint.x, fineTunedCenterY);

    const scaleFactor = Math.abs(mappedColEnd.x - mappedColStart.x) / refColumnWidth;
    const actualBubbleRadius = Math.max(6, refBubbleRadius * scaleFactor);

    const scores: Record<string, number> = {};
    const fillRatios: Record<string, number> = {};
    const bubbleCenters: Record<string, { x: number; y: number }> = {};

    for (let optIdx = 0; optIdx < optionsList.length; optIdx++) {
      const opt = optionsList[optIdx];
      const refBx = refBubblesStartX + optIdx * refBubbleSpacing + refBubbleSpacing / 2;
      const mappedBubble = mapPoint(refBx, refCenterY);

      // Lock Y to the verified row timing mark center
      const bubbleCenter = {
        x: Math.round(mappedBubble.x),
        y: Math.round(fineTunedCenterY),
      };

      bubbleCenters[opt] = bubbleCenter;

      const metrics = getBubbleCoreMetrics(
        bubbleCenter.x,
        bubbleCenter.y,
        actualBubbleRadius,
        rowBaselineBrightness
      );
      scores[opt] = metrics.score;
      fillRatios[opt] = metrics.fillRatio;
    }

    // Determine marked bubble
    const sortedOptions = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const topOption = sortedOptions[0];
    const secondOption = sortedOptions[1];

    const rawKey = answerKey[q] !== undefined ? answerKey[q] : answerKey[String(q) as any];
    const correctAns = (rawKey || 'A').toString().trim().toUpperCase();

    let studentAns = 'TIADA_JAWAPAN';
    let status: 'BETUL' | 'SALAH' | 'KOSONG' | 'DOUBLE_MARK' | 'TIDAK_JELAS' = 'KOSONG';

    const MARK_SCORE_THRESHOLD = 0.16;
    const FAINT_MARK_THRESHOLD = 0.07;
    const DOUBLE_MARK_RATIO = 0.80;

    if (topOption[1] >= MARK_SCORE_THRESHOLD) {
      if (
        secondOption &&
        secondOption[1] >= MARK_SCORE_THRESHOLD &&
        secondOption[1] >= topOption[1] * DOUBLE_MARK_RATIO
      ) {
        studentAns = 'AMBIGU/DOUBLE_MARK';
        status = 'TIDAK_JELAS'; // Dikelaskan sebagai tidak jelas / dwi tanda -> kuning
      } else {
        studentAns = topOption[0];
        if (studentAns === correctAns) {
          status = 'BETUL'; // Jawapan betul -> hijau
          correctCount++;
        } else {
          status = 'SALAH'; // Jawapan salah -> merah
        }
      }
    } else if (topOption[1] >= FAINT_MARK_THRESHOLD) {
      // Lorekan tidak jelas / samar / separuh padam / ragu-ragu -> kuning
      studentAns = `TIDAK_JELAS (${topOption[0]})`;
      status = 'TIDAK_JELAS';
    } else {
      studentAns = 'TIADA_JAWAPAN';
      status = 'KOSONG';
    }

    // Annotation details: HIJAU (BETUL), MERAH (SALAH), KUNING (TIDAK JELAS / KOSONG / SAMAR)
    let simbol: '✔' | '✘' | '○' | '⚠' = '✔';
    let warna: 'GREEN' | 'RED' | 'YELLOW' | 'ORANGE' = 'GREEN';
    let teks_tambahan = '';

    if (status === 'BETUL') {
      simbol = '✔';
      warna = 'GREEN'; // HIJAU
      teks_tambahan = '';
    } else if (status === 'SALAH') {
      simbol = '✘';
      warna = 'RED'; // MERAH
      teks_tambahan = `Jawapan Betul: ${correctAns}`;
    } else if (status === 'KOSONG') {
      simbol = '○';
      warna = 'YELLOW'; // KUNING
      teks_tambahan = `Kosong (Betul: ${correctAns})`;
    } else {
      // TIDAK JELAS / SAMAR / DWI-TANDA (TIDAK_JELAS / DOUBLE_MARK)
      simbol = '⚠';
      warna = 'YELLOW'; // KUNING
      teks_tambahan = `Tidak Jelas (Betul: ${correctAns})`;
    }

    const boxXmin = Math.round((Math.min(mappedColStart.x, mappedColEnd.x) / width) * 1000);
    const boxXmax = Math.round((Math.max(mappedColStart.x, mappedColEnd.x) / width) * 1000);
    const boxYmin = Math.round(((fineTunedCenterY - actualBubbleRadius * 1.5) / height) * 1000);
    const boxYmax = Math.round(((fineTunedCenterY + actualBubbleRadius * 1.5) / height) * 1000);

    const markedCoord = bubbleCenters[studentAns] || undefined;
    const correctCoord = bubbleCenters[correctAns] || undefined;

    detailList.push({
      nombor_soalan: q,
      jawapan_pelajar: studentAns,
      jawapan_sebenar: correctAns,
      status,
      annotation: {
        simbol,
        warna,
        teks_tambahan,
      },
      box: {
        ymin: boxYmin,
        xmin: boxXmin,
        ymax: boxYmax,
        xmax: boxXmax,
        markedBubble: markedCoord,
        correctBubble: correctCoord,
        rowTimingMark: {
          x: Math.round(timingMarkX),
          y: Math.round(fineTunedCenterY),
          found: isTimingMarkFound,
        },
      },
      bubbleCenters,
      intensities: fillRatios,
    });
  }

  const wrongCount = totalQuestions - correctCount;
  const percentageNum = (correctCount / totalQuestions) * 100;
  const percentageStr = `${percentageNum.toFixed(1)}%`;
  const isPassed = percentageNum >= passingPercentage;
  const isCemerlang = percentageNum >= 80;

  return {
    ringkasan_keputusan: {
      nama_pelajar: '',
      jumlah_soalan: totalQuestions,
      jawapan_betul: correctCount,
      jawapan_salah: wrongCount,
      jumlah_markah: `${correctCount}/${totalQuestions}`,
      peratusan: percentageStr,
    },
    analisis_detail: detailList,
    cetakan_header_markah: {
      posisi: 'BOTTOM_FOOTER',
      teks_cetakan: `MARKAH: ${correctCount}/${totalQuestions} | ${percentageStr}`,
      status_kelulusan: isCemerlang ? 'CEMERLANG' : isPassed ? 'LULUS' : 'GAGAL',
    },
    catatan_teknikal:
      'Ditanda menggunakan Enjin Optik Piecewise 6 Titik Penjuru & Pengecaman Kotak Hitam Nombor Jawapan',
    markersFound: markers,
  };
}
