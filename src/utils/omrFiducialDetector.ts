// High-Speed Computer Vision OMR Optical Grid Engine (6 Fiducial Points)
// Piecewise Bi-Linear Registration & Optical Mark Recognition across 6 Corner Guide Markers.
// Pure geometric and mathematical mark recognition with millimeter accuracy.
// AI is used for Student Name OCR and intelligent secondary verification when needed.

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
      topLeft: { x1: 0, x2: Math.floor(width * 0.25), y1: 0, y2: Math.floor(height * 0.28) },
      topRight: { x1: Math.floor(width * 0.75), x2: width, y1: 0, y2: Math.floor(height * 0.28) },
      midLeft: { x1: 0, x2: Math.floor(width * 0.25), y1: Math.floor(height * 0.35), y2: Math.floor(height * 0.65) },
      midRight: { x1: Math.floor(width * 0.75), x2: width, y1: Math.floor(height * 0.35), y2: Math.floor(height * 0.65) },
      botLeft: { x1: 0, x2: Math.floor(width * 0.25), y1: Math.floor(height * 0.72), y2: height },
      botRight: { x1: Math.floor(width * 0.75), x2: width, y1: Math.floor(height * 0.72), y2: height },
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

      // Adaptive threshold: must be significantly darker than background paper
      const threshold = Math.min(130, Math.max(50, minBrightness + 45));

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

      const w = maxX > minX ? maxX - minX : 34;
      const h = maxY > minY ? maxY - minY : 34;
      const aspect = Math.max(w, h) / Math.max(1, Math.min(w, h));
      const isDetected = count >= 16 && aspect <= 3.2 && minBrightness < 140;

      if (count > 16 && maxX > minX && maxY > minY) {
        const cx = Math.round(sumX / count);
        const cy = Math.round(sumY / count);
        return {
          x: minX,
          y: minY,
          w,
          h,
          cx,
          cy,
          found: isDetected,
        };
      }

      // Fallback coordinate for 1240x1754 template scale
      const defaultCx = (zone.x1 + zone.x2) / 2;
      const defaultCy = (zone.y1 + zone.y2) / 2;
      return {
        x: defaultCx - 17,
        y: defaultCy - 17,
        w: 34,
        h: 34,
        cx: defaultCx,
        cy: defaultCy,
        found: false,
      };
    };

    const tl = findDarkSquareInZone(zones.topLeft);
    const tr = findDarkSquareInZone(zones.topRight);
    const ml = findDarkSquareInZone(zones.midLeft);
    const mr = findDarkSquareInZone(zones.midRight);
    const bl = findDarkSquareInZone(zones.botLeft);
    const br = findDarkSquareInZone(zones.botRight);

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
      cropY = Math.max(0, Math.round(markers.topLeft.cy - 12));
      cropW = Math.round(markers.topRight.cx - cropX);
      cropH = Math.round(h * 0.088);
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
 * Core Algorithm: Optical Mark Recognition using Piecewise Bi-Linear 6-Point Registration.
 * Accurately tracks every target row and bubble by warping coordinate space across the 6 fiducial points.
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
    if (!markers) {
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

    // Piecewise mapped row center
    const mappedRowCenter = mapPoint(refColX + refColumnWidth / 2, refCenterY);
    const mappedColStart = mapPoint(refColX, refRowY);
    const mappedColEnd = mapPoint(refColX + refColumnWidth, refRowY + refRowHeight);

    // 1. DETEKSI KOTAK HITAM JALUR Y (Optical Row Timing Track Mark)
    // Mencari pusat kotak hitam penjajaran di tepi baris soalan (refColX - 24, refCenterY)
    const expectedTimingPt = mapPoint(refColX - 16, refCenterY);
    let timingSumY = 0;
    let timingDarkPixels = 0;
    const searchSpanY = Math.max(8, Math.round(refRowHeight * 0.42));
    const searchSpanX = 14;

    for (let dy = -searchSpanY; dy <= searchSpanY; dy++) {
      for (let dx = -searchSpanX; dx <= searchSpanX; dx++) {
        const tx = Math.round(expectedTimingPt.x + dx);
        const ty = Math.round(expectedTimingPt.y + dy);
        if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
          const idx = (ty * width + tx) * 4;
          const brightness = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
          if (brightness < 125) {
            timingSumY += ty;
            timingDarkPixels++;
          }
        }
      }
    }

    let timingY = mappedRowCenter.y;
    if (timingDarkPixels >= 8) {
      timingY = timingSumY / timingDarkPixels;
    }

    // Row Center Fine-Tuning: gabungkan pengesanan Kotak Hitam Jalur Y dengan analisis kontras
    let bestDy = 0;
    let maxContrast = -1;
    for (let dy = -4; dy <= 4; dy += 2) {
      const checkY = Math.round(timingY + dy);
      if (checkY >= 0 && checkY < height) {
        let rowSum = 0;
        let rowSqSum = 0;
        let rowSamples = 0;
        for (let step = 0; step < 10; step++) {
          const sampleX = Math.round(mappedColStart.x + (step / 9) * (mappedColEnd.x - mappedColStart.x));
          if (sampleX >= 0 && sampleX < width) {
            const idx = (checkY * width + sampleX) * 4;
            const b = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
            rowSum += b;
            rowSqSum += b * b;
            rowSamples++;
          }
        }
        if (rowSamples > 0) {
          const mean = rowSum / rowSamples;
          const variance = rowSqSum / rowSamples - mean * mean;
          if (variance > maxContrast) {
            maxContrast = variance;
            bestDy = dy;
          }
        }
      }
    }

    const fineTunedCenterY = timingY + bestDy;

    // Local paper baseline measurement
    const baselinePoint = mapPoint(refColX + refQNumWidth + 4, refCenterY);
    let baselineSum = 0;
    let baselineCount = 0;
    for (let dy = -3; dy <= 3; dy++) {
      const py = Math.round(baselinePoint.y + dy);
      const px = Math.round(baselinePoint.x);
      if (px >= 0 && px < width && py >= 0 && py < height) {
        const idx = (py * width + px) * 4;
        baselineSum += (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
        baselineCount++;
      }
    }
    const rowBaselineBrightness = baselineCount > 0 ? baselineSum / baselineCount : 220;

    const scaleFactor = Math.abs(mappedColEnd.x - mappedColStart.x) / refColumnWidth;
    const actualBubbleRadius = Math.max(6, refBubbleRadius * scaleFactor);

    const scores: Record<string, number> = {};
    const fillRatios: Record<string, number> = {};

    for (let optIdx = 0; optIdx < optionsList.length; optIdx++) {
      const opt = optionsList[optIdx];
      const refBx = refBubblesStartX + optIdx * refBubbleSpacing + refBubbleSpacing / 2;
      const mappedBubble = mapPoint(refBx, refCenterY);

      const metrics = getBubbleCoreMetrics(
        mappedBubble.x,
        fineTunedCenterY,
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
      'Ditanda menggunakan Enjin Optik Piecewise 6 Titik Penjuru (Bi-Linear Registration) berketepatan tinggi',
    markersFound: markers,
  };
}
