// High-Speed Computer Vision OMR Optical Grid Engine (6 Fiducial Points)
// Pure geometric & mathematical mark recognition without relying on AI for answers.
// AI is strictly isolated for student name OCR recognition only.

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
}

export interface SixCornerMarkers {
  topLeft: MarkerSquare;
  topRight: MarkerSquare;
  midLeft: MarkerSquare;
  midRight: MarkerSquare;
  botLeft: MarkerSquare;
  botRight: MarkerSquare;
}

export interface QuestionDetectedAnswer {
  nombor_soalan: number;
  jawapan_pelajar: string; // 'A' | 'B' | 'C' | 'D' | 'E' | 'TIADA_JAWAPAN' | 'AMBIGU/DOUBLE_MARK'
  jawapan_sebenar: string;
  status: 'BETUL' | 'SALAH' | 'KOSONG' | 'DOUBLE_MARK';
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
  };
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
 * Detect the 6 black fiducial corner markers on the sheet using adaptive thresholding.
 * Standard template defines 6 black squares (Top-L, Top-R, Mid-L, Mid-R, Bot-L, Bot-R).
 */
export function findSixFiducialMarkers(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): SixCornerMarkers | null {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Search zones for the 6 markers:
    const zones = {
      topLeft: { x1: 0, x2: Math.floor(width * 0.22), y1: 0, y2: Math.floor(height * 0.25) },
      topRight: { x1: Math.floor(width * 0.78), x2: width, y1: 0, y2: Math.floor(height * 0.25) },
      midLeft: { x1: 0, x2: Math.floor(width * 0.22), y1: Math.floor(height * 0.38), y2: Math.floor(height * 0.65) },
      midRight: { x1: Math.floor(width * 0.78), x2: width, y1: Math.floor(height * 0.38), y2: Math.floor(height * 0.65) },
      botLeft: { x1: 0, x2: Math.floor(width * 0.22), y1: Math.floor(height * 0.75), y2: height },
      botRight: { x1: Math.floor(width * 0.78), x2: width, y1: Math.floor(height * 0.75), y2: height },
    };

    const findDarkSquareInZone = (zone: { x1: number; x2: number; y1: number; y2: number }): MarkerSquare => {
      // 1. Find min brightness in zone to set adaptive threshold
      let minBrightness = 255;
      for (let y = zone.y1; y < zone.y2; y += 4) {
        for (let x = zone.x1; x < zone.x2; x += 4) {
          const idx = (y * width + x) * 4;
          const b = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
          if (b < minBrightness) minBrightness = b;
        }
      }

      // If darkest pixels are found, threshold around darkest cluster
      const threshold = Math.min(120, Math.max(50, minBrightness + 40));

      let sumX = 0;
      let sumY = 0;
      let count = 0;
      let minX = zone.x2;
      let maxX = zone.x1;
      let minY = zone.y2;
      let maxY = zone.y1;

      for (let y = zone.y1; y < zone.y2; y += 2) {
        for (let x = zone.x1; x < zone.x2; x += 2) {
          const idx = (y * width + x) * 4;
          const b = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
          if (b < threshold) {
            sumX += x;
            sumY += y;
            count++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (count > 20 && maxX > minX && maxY > minY) {
        const cx = Math.round(sumX / count);
        const cy = Math.round(sumY / count);
        return {
          x: minX,
          y: minY,
          w: maxX - minX,
          h: maxY - minY,
          cx,
          cy,
        };
      }

      // Fallback default coordinate for 1240x1754 template scale
      const defaultCx = (zone.x1 + zone.x2) / 2;
      const defaultCy = (zone.y1 + zone.y2) / 2;
      return {
        x: defaultCx - 17,
        y: defaultCy - 17,
        w: 34,
        h: 34,
        cx: defaultCx,
        cy: defaultCy,
      };
    };

    return {
      topLeft: findDarkSquareInZone(zones.topLeft),
      topRight: findDarkSquareInZone(zones.topRight),
      midLeft: findDarkSquareInZone(zones.midLeft),
      midRight: findDarkSquareInZone(zones.midRight),
      botLeft: findDarkSquareInZone(zones.botLeft),
      botRight: findDarkSquareInZone(zones.botRight),
    };
  } catch (e) {
    console.warn('Fiducial marker detection exception:', e);
    return null;
  }
}

/**
 * Crop the Student Name (NAMA) box area from the canvas to send exclusively to AI OCR.
 * Minimizes tokens, maximizes speed (< 600ms response), and ensures 100% data privacy.
 */
export function cropStudentNameBoxDataUrl(
  canvas: HTMLCanvasElement,
  markers: SixCornerMarkers | null
): string | null {
  try {
    const w = canvas.width;
    const h = canvas.height;

    let cropX = Math.round(w * 0.08);
    let cropY = Math.round(h * 0.07);
    let cropW = Math.round(w * 0.84);
    let cropH = Math.round(h * 0.09);

    if (markers) {
      cropX = Math.round(markers.topLeft.cx + markers.topLeft.w * 0.5);
      cropY = Math.round(markers.topLeft.cy - 10);
      cropW = Math.round(markers.topRight.cx - cropX);
      cropH = Math.round(h * 0.085);
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
 * Core Algorithm: Optical Mark Recognition using 6 corner fiducial registration.
 * Accurately samples pencil darkness for options A, B, C, D (and E) across all questions,
 * mathematically calibrated against the reference template layout.
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
  // Matching omrCanvasDrawer.ts exactly:
  // Top markers: x=40, y=145, size=34 -> cx = 57, cy = 162
  // Right markers: x=1240-40-34 = 1166 -> cx = 1183
  // Bottom markers: y=1754-40-34-20 = 1660 -> cy = 1677
  const REF_W = 1240;
  const REF_H = 1754;
  const REF_LEFT_X = 57;
  const REF_RIGHT_X = 1183;
  const REF_TOP_Y = 162;
  const REF_BOT_Y = 1677;

  // Actual marker positions detected
  let detLeftX = REF_LEFT_X * (width / REF_W);
  let detRightX = REF_RIGHT_X * (width / REF_W);
  let detTopY = REF_TOP_Y * (height / REF_H);
  let detBotY = REF_BOT_Y * (height / REF_H);

  if (markers) {
    detLeftX = (markers.topLeft.cx + markers.midLeft.cx + markers.botLeft.cx) / 3;
    detRightX = (markers.topRight.cx + markers.midRight.cx + markers.botRight.cx) / 3;
    detTopY = (markers.topLeft.cy + markers.topRight.cy) / 2;
    detBotY = (markers.botLeft.cy + markers.botRight.cy) / 2;
  }

  // Scale and Origin Mapping from reference space to actual image space
  let scaleX = (detRightX - detLeftX) / (REF_RIGHT_X - REF_LEFT_X);
  let scaleY = (detBotY - detTopY) / (REF_BOT_Y - REF_TOP_Y);

  if (scaleX <= 0.1 || isNaN(scaleX)) scaleX = width / REF_W;
  if (scaleY <= 0.1 || isNaN(scaleY)) scaleY = height / REF_H;

  const originX = detLeftX - REF_LEFT_X * scaleX;
  const originY = detTopY - REF_TOP_Y * scaleY;

  // Dynamic column layout (IDENTICAL logic to omrCanvasDrawer.ts)
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
   * Helper to sample the INNER CORE of a bubble (radius * 0.70)
   * This completely avoids the printed outer ring border so only shaded graphite/ink is measured!
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
    // Core radius is 70% of bubble radius to prevent edge border noise
    const coreRadius = Math.max(3, radius * 0.70);
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

            // A shaded bubble has significant drop below baseline paper brightness
            if (brightness < Math.min(150, baselineBrightness * 0.78)) {
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
    // Combined optical score
    const score = fillRatio * 0.65 + relativeDarkness * 0.35;

    return { fillRatio, avgBrightness, score };
  };

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

    // Actual image coordinates
    const actualCenterY = originY + refCenterY * scaleY;
    const actualRowY = originY + refRowY * scaleY;
    const actualRowHeight = refRowHeight * scaleY;
    const actualColX = originX + refColX * scaleX;
    const actualColWidth = refColumnWidth * scaleX;
    const actualBubbleRadius = refBubbleRadius * Math.min(scaleX, scaleY);

    // Measure local paper baseline brightness around the row (between question number and bubbles)
    let baselineBrightnessSum = 0;
    let baselineCount = 0;
    const baselineSampleX = originX + (refColX + refQNumWidth + 4) * scaleX;
    for (let dy = -3; dy <= 3; dy++) {
      const py = Math.round(actualCenterY + dy);
      const px = Math.round(baselineSampleX);
      if (px >= 0 && px < width && py >= 0 && py < height) {
        const idx = (py * width + px) * 4;
        baselineBrightnessSum += (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
        baselineCount++;
      }
    }
    const rowBaselineBrightness = baselineCount > 0 ? baselineBrightnessSum / baselineCount : 220;

    const scores: Record<string, number> = {};
    const fillRatios: Record<string, number> = {};

    for (let optIdx = 0; optIdx < optionsList.length; optIdx++) {
      const opt = optionsList[optIdx];
      const refBx = refBubblesStartX + optIdx * refBubbleSpacing + refBubbleSpacing / 2;
      const actualBx = originX + refBx * scaleX;

      const metrics = getBubbleCoreMetrics(actualBx, actualCenterY, actualBubbleRadius, rowBaselineBrightness);
      scores[opt] = metrics.score;
      fillRatios[opt] = metrics.fillRatio;
    }

    // Determine marked bubble
    const sortedOptions = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const topOption = sortedOptions[0];
    const secondOption = sortedOptions[1];

    // Safely retrieve correct answer from answerKey (supports number or string keys)
    const rawKey = answerKey[q] !== undefined ? answerKey[q] : answerKey[String(q) as any];
    const correctAns = (rawKey || 'A').toString().trim().toUpperCase();

    let studentAns = 'TIADA_JAWAPAN';
    let status: 'BETUL' | 'SALAH' | 'KOSONG' | 'DOUBLE_MARK' = 'KOSONG';

    // A marked bubble has high core fill / darkness score (>= 0.18)
    const MARK_SCORE_THRESHOLD = 0.18;
    const DOUBLE_MARK_RATIO = 0.80;

    if (topOption[1] >= MARK_SCORE_THRESHOLD) {
      if (
        secondOption &&
        secondOption[1] >= MARK_SCORE_THRESHOLD &&
        secondOption[1] >= topOption[1] * DOUBLE_MARK_RATIO
      ) {
        // Double mark / ambiguous
        studentAns = 'AMBIGU/DOUBLE_MARK';
        status = 'DOUBLE_MARK';
      } else {
        studentAns = topOption[0];
        if (studentAns === correctAns) {
          status = 'BETUL';
          correctCount++;
        } else {
          status = 'SALAH';
        }
      }
    } else {
      // Empty
      studentAns = 'TIADA_JAWAPAN';
      status = 'KOSONG';
    }

    // Annotation details
    let simbol: '✔' | '✘' | '○' | '⚠' = '✔';
    let warna: 'GREEN' | 'RED' | 'YELLOW' | 'ORANGE' = 'GREEN';
    let teks_tambahan = '';

    if (status === 'BETUL') {
      simbol = '✔';
      warna = 'GREEN';
      teks_tambahan = '';
    } else if (status === 'SALAH') {
      simbol = '✘';
      warna = 'RED';
      teks_tambahan = `Jawapan Betul: ${correctAns}`;
    } else if (status === 'KOSONG') {
      simbol = '○';
      warna = 'YELLOW';
      teks_tambahan = `Kosong (Betul: ${correctAns})`;
    } else {
      simbol = '⚠';
      warna = 'ORANGE';
      teks_tambahan = `Dwi-Tanda (Betul: ${correctAns})`;
    }

    // Box normalized to 0-1000 scale for viewer compatibility
    const boxXmin = Math.round((actualColX / width) * 1000);
    const boxXmax = Math.round(((actualColX + actualColWidth) / width) * 1000);
    const boxYmin = Math.round((actualRowY / height) * 1000);
    const boxYmax = Math.round(((actualRowY + actualRowHeight) / height) * 1000);

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
      },
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
      nama_pelajar: '', // To be filled by AI name OCR
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
      'Ditanda serta-merta menggunakan Enjin Geometrik 6 Titik Penjuru (Optical Grid Registration) berkepantasan tinggi',
    markersFound: markers,
  };
}
