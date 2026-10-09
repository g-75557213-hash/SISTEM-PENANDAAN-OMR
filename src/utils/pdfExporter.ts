import { jsPDF } from 'jspdf';
import { OMRGradingResponse, ClassFolder } from '../types';

/**
 * Generates an A4 canvas containing ONLY the teacher's grading marks,
 * checkmarks (✔), crosses (✘), side correction text ("Betul: X"),
 * examiner stamp, and error summary box.
 * 
 * Crucial for teachers who want to put the student's physical paper back into the printer
 * and print ONLY the ink marks without re-printing template lines or bubbles.
 */
export function generateMarksOnlyCanvas(
  result: OMRGradingResponse,
  options?: {
    transparent?: boolean;
    optionsCount?: number;
    baseImageWidth?: number;
    baseImageHeight?: number;
  }
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const width = options?.baseImageWidth || 1240;
  const height = options?.baseImageHeight || 1754;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  if (options?.transparent) {
    ctx.clearRect(0, 0, width, height);
  } else {
    // Pure white background for printing on physical paper
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  const { ringkasan_keputusan, analisis_detail, cetakan_header_markah } = result;
  const totalQ = analisis_detail.length;
  const numColumns = totalQ <= 20 ? 2 : totalQ <= 40 ? (totalQ > 30 ? 3 : 2) : 3;
  const questionsPerCol = Math.ceil(totalQ / numColumns);

  const gridStartY = 330;
  const availableGridHeight = height - gridStartY - 240;
  const rowHeight = Math.min(52, Math.max(34, Math.floor(availableGridHeight / questionsPerCol)));

  const contentWidth = width - 200;
  const columnGap = numColumns === 2 ? 60 : 35;
  const columnWidth = Math.floor((contentWidth - (numColumns - 1) * columnGap) / numColumns);
  const startX = 100;
  const optionsList = ['A', 'B', 'C', 'D', 'E'];

  const wrongQuestionsList: Array<{ q: number; student: string; correct: string }> = [];

  // Draw ONLY Marks & Corrections for each question
  analisis_detail.forEach((item) => {
    const qNum = item.nombor_soalan;
    const col = Math.floor((qNum - 1) / questionsPerCol);
    const rowInCol = (qNum - 1) % questionsPerCol;

    const colX = startX + col * (columnWidth + columnGap);
    const centerY = gridStartY + rowInCol * rowHeight + rowHeight / 2;

    const qNumWidth = 44;
    const bubbleRadius = Math.min(15, Math.max(11, Math.round(rowHeight * 0.30)));
    const bubblesAreaWidth = optionsList.length * (bubbleRadius * 2 + 16);
    const bubbleSpacing = Math.floor(bubblesAreaWidth / optionsList.length);
    const bubblesStartX = colX + qNumWidth + 12;

    const sideSpaceStartX = bubblesStartX + bubblesAreaWidth + 10;
    const sideSpaceWidth = (colX + columnWidth) - sideSpaceStartX;

    const studentOpt = item.jawapan_pelajar;
    const correctOpt = item.jawapan_sebenar;
    const optIdx = optionsList.indexOf(studentOpt);

    // Target bubble X coordinate
    const markX = optIdx >= 0 ? bubblesStartX + optIdx * bubbleSpacing + bubbleSpacing / 2 : bubblesStartX + bubbleSpacing;

    if (item.status === 'BETUL') {
      // Crisp Green Checkmark over bubble
      ctx.save();
      ctx.fillStyle = '#16a34a';
      ctx.font = `bold ${Math.max(18, Math.round(rowHeight * 0.95))}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✔', markX, centerY);

      // Also small green tick in side column
      ctx.font = `bold ${Math.round(rowHeight * 0.44)}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('✔ Betul', sideSpaceStartX + 8, centerY);
      ctx.restore();
    } else {
      // Track for error summary
      wrongQuestionsList.push({
        q: qNum,
        student: studentOpt,
        correct: correctOpt,
      });

      // Bold Red Cross over student's wrong bubble
      ctx.save();
      ctx.fillStyle = '#dc2626';
      ctx.font = `bold ${Math.max(18, Math.round(rowHeight * 0.95))}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✘', markX, centerY);

      // Ruang di sebelah: Jawapan Betul Callout badge
      const badgeH = Math.min(28, rowHeight - 6);
      const badgeY = centerY - badgeH / 2;

      ctx.fillStyle = '#fee2e2';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(sideSpaceStartX + 4, badgeY, Math.max(90, sideSpaceWidth - 8), badgeH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#b91c1c';
      ctx.font = `bold ${Math.min(14, Math.round(rowHeight * 0.38))}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(`✘ Betul: ${correctOpt}`, sideSpaceStartX + 12, centerY);
      ctx.restore();
    }
  });

  // Semakan OMR Rasmi - Diletakkan di ruangan kosong bawah bahagian tanda jawapan pelajar (Skala 50%)
  ctx.save();
  const isLulus = cetakan_header_markah.status_kelulusan === 'LULUS' || cetakan_header_markah.status_kelulusan === 'CEMERLANG';
  const strokeColor = isLulus ? '#059669' : '#dc2626';
  const bgColor = isLulus ? 'rgba(236, 253, 245, 0.98)' : 'rgba(254, 242, 242, 0.98)';

  const gridBottomY = gridStartY + questionsPerCol * rowHeight;
  const stampW = Math.min(580, width - 240);
  const stampH = 50; // Skala 50% dari saiz asal
  const stampX = (width - stampW) / 2;
  const stampY = Math.min(height - 110, gridBottomY + 16);

  // Background card 50% skala
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(stampX, stampY, stampW, stampH, 4);
  ctx.fill();

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Line 1 (Skala 50%): Anotasi Markah & Status & Bilangan Betul
  ctx.textAlign = 'center';
  ctx.fillStyle = strokeColor;
  ctx.font = 'bold 7.5px "Plus Jakarta Sans", sans-serif';
  const summaryScoreText = cetakan_header_markah.teks_cetakan || `MARKAH: ${ringkasan_keputusan.jumlah_markah} (${ringkasan_keputusan.peratusan})`;
  const countsText = `[✔ ${ringkasan_keputusan.jawapan_betul} BETUL  •  ✘ ${ringkasan_keputusan.jawapan_salah} SALAH]`;
  ctx.fillText(
    `★ SEMAKAN OMR RASMI ★  |  ${summaryScoreText}  |  STATUS: ${cetakan_header_markah.status_kelulusan}  |  ${countsText}`,
    stampX + stampW / 2,
    stampY + 14
  );

  // Divider
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(stampX + 12, stampY + 22);
  ctx.lineTo(stampX + stampW - 12, stampY + 22);
  ctx.stroke();

  // Line 2 (Skala 50%): Data Jawapan Pelajar
  const studentAnswerSummary = analisis_detail.map((item) => {
    const ans = item.jawapan_pelajar === 'TIADA_JAWAPAN' ? '-' : item.jawapan_pelajar;
    const mark = item.status === 'BETUL' ? '✔' : item.status === 'SALAH' ? '✘' : '○';
    return `${item.nombor_soalan}:${ans}${mark}`;
  });

  ctx.font = '6px "JetBrains Mono", monospace';
  ctx.fillStyle = isLulus ? '#065f46' : '#991b1b';

  if (totalQ <= 20) {
    const rowText = `DATA JAWAPAN PELAJAR: ${studentAnswerSummary.join('  ')}`;
    ctx.fillText(rowText, stampX + stampW / 2, stampY + 36);
  } else {
    const half = Math.ceil(totalQ / 2);
    const row1 = `DATA JWP (S1-${half}): ${studentAnswerSummary.slice(0, half).join(' ')}`;
    const row2 = `DATA JWP (S${half + 1}-${totalQ}): ${studentAnswerSummary.slice(half).join(' ')}`;
    ctx.fillText(row1, stampX + stampW / 2, stampY + 33);
    ctx.fillText(row2, stampX + stampW / 2, stampY + 43);
  }

  ctx.restore();

  return canvas;
}

/**
 * Downloads a single student's marked paper as an A4 PDF document.
 * - 'overlay_only': Only marks, crosses & corrections (for feeding back into printer on existing paper)
 * - 'full': Full marked paper image
 */
export async function downloadStudentPDF(
  imageSrc: string,
  result: OMRGradingResponse,
  mode: 'full' | 'overlay_only' = 'full'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let dataUrlToEmbed = '';

  if (mode === 'overlay_only') {
    const marksCanvas = generateMarksOnlyCanvas(result, { transparent: false });
    dataUrlToEmbed = marksCanvas.toDataURL('image/jpeg', 0.95);
  } else {
    // Combine base image + annotations on canvas
    const baseImg = new Image();
    baseImg.crossOrigin = 'anonymous';
    baseImg.src = imageSrc;

    await new Promise((resolve) => {
      baseImg.onload = resolve;
    });

    const combinedCanvas = document.createElement('canvas');
    combinedCanvas.width = baseImg.width || 1240;
    combinedCanvas.height = baseImg.height || 1754;
    const ctx = combinedCanvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(baseImg, 0, 0, combinedCanvas.width, combinedCanvas.height);
      const marksCanvas = generateMarksOnlyCanvas(result, {
        transparent: true,
        baseImageWidth: combinedCanvas.width,
        baseImageHeight: combinedCanvas.height,
      });
      ctx.drawImage(marksCanvas, 0, 0);
      dataUrlToEmbed = combinedCanvas.toDataURL('image/jpeg', 0.95);
    }
  }

  if (dataUrlToEmbed) {
    // Exactly 210mm x 297mm (A4)
    doc.addImage(dataUrlToEmbed, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  }

  const cleanName = result.ringkasan_keputusan.nama_pelajar.replace(/\s+/g, '_');
  const filePrefix = mode === 'overlay_only' ? 'Anotasi_Sahaja_Cetak_Kertas' : 'Kertas_Penuh_OMR';
  doc.save(`${filePrefix}_${cleanName}.pdf`);
}

/**
 * Downloads a complete compiled class report & booklet in PDF format.
 * Includes summary report cover page + each student's marked paper.
 */
export async function downloadClassReportPDF(classFolder: ClassFolder) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { className, subject, examTitle, records } = classFolder;

  // Page 1: Class Summary Report
  doc.setFillColor(15, 23, 42); // slate-900 header
  doc.rect(0, 0, 210, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(`LAPORAN KEPUTUSAN KELAS: ${className.toUpperCase()}`, 105, 16, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${subject.toUpperCase()} - ${examTitle} | Tarikh: ${new Date().toLocaleDateString('ms-MY')}`, 105, 25, { align: 'center' });

  // Class Overview Stats
  const totalStudents = records.length;
  let totalScorePct = 0;
  let passedCount = 0;

  records.forEach((r) => {
    const pct = parseFloat(r.gradingResult.ringkasan_keputusan.peratusan.replace('%', '')) || 0;
    totalScorePct += pct;
    if (r.gradingResult.cetakan_header_markah.status_kelulusan === 'LULUS' || r.gradingResult.cetakan_header_markah.status_kelulusan === 'CEMERLANG') {
      passedCount++;
    }
  });

  const avgPct = totalStudents > 0 ? (totalScorePct / totalStudents).toFixed(1) : '0';
  const passRate = totalStudents > 0 ? ((passedCount / totalStudents) * 100).toFixed(1) : '0';

  // Stats boxes
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);

  // Box 1
  doc.roundedRect(15, 45, 55, 25, 3, 3, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text('JUMLAH MURID', 42.5, 53, { align: 'center' });
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${totalStudents} Orang`, 42.5, 63, { align: 'center' });

  // Box 2
  doc.roundedRect(77.5, 45, 55, 25, 3, 3, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('PURATA MARKAH', 105, 53, { align: 'center' });
  doc.setTextColor(16, 185, 129);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${avgPct}%`, 105, 63, { align: 'center' });

  // Box 3
  doc.roundedRect(140, 45, 55, 25, 3, 3, 'FD');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('KADAR KELULUSAN', 167.5, 53, { align: 'center' });
  doc.setTextColor(2, 132, 199);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${passRate}%`, 167.5, 63, { align: 'center' });

  // Table of Students
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Senarai Keputusan Calon:', 15, 82);

  // Table header
  doc.setFillColor(226, 232, 240);
  doc.rect(15, 87, 180, 8, 'F');
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.text('NO', 18, 92.5);
  doc.text('NAMA CALON', 32, 92.5);
  doc.text('BETUL/JUMLAH', 115, 92.5);
  doc.text('PERATUS', 150, 92.5);
  doc.text('STATUS', 175, 92.5);

  let currentY = 99;
  records.forEach((rec, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, currentY - 4, 180, 8, 'F');
    }

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.text(`${idx + 1}`, 18, currentY);
    doc.text(rec.studentName.substring(0, 38), 32, currentY);
    doc.text(rec.gradingResult.ringkasan_keputusan.jumlah_markah, 115, currentY);
    doc.text(rec.gradingResult.ringkasan_keputusan.peratusan, 150, currentY);

    const isPass = rec.gradingResult.cetakan_header_markah.status_kelulusan === 'LULUS';
    doc.setTextColor(isPass ? 22 : 220, isPass ? 163 : 38, isPass ? 74 : 38);
    doc.setFont('helvetica', 'bold');
    doc.text(rec.gradingResult.cetakan_header_markah.status_kelulusan, 175, currentY);

    currentY += 8;
  });

  // Pages 2..N: Add each student's marked paper
  for (const rec of records) {
    doc.addPage('a4', 'portrait');

    const marksCanvas = generateMarksOnlyCanvas(rec.gradingResult, { transparent: false });
    const dataUrl = marksCanvas.toDataURL('image/jpeg', 0.95);
    doc.addImage(dataUrl, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  }

  doc.save(`Laporan_Penuh_Kelas_${className.replace(/\s+/g, '_')}.pdf`);
}
