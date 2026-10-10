// Canvas generator for standard Malaysian A4 OMR Examination Answer Sheets
// Based on exact template layout with A4 single page guarantee and dedicated side correction area.

export interface DrawOMROptions {
  studentName?: string;
  studentClass?: string;
  subject?: string;
  sectionTitle?: string;
  totalQuestions?: number;
  optionsCount?: 4 | 5; // 4 (A-D) or 5 (A-E as shown in uploaded template)
  filledAnswers?: Record<number, string>; // e.g. { 1: 'A', 2: 'C' }
  correctAnswers?: Record<number, string>; // if provided, renders marks & corrections in the side space
  showCorrectionColumn?: boolean; // dedicated side space for marks and correct answers
  simulatePencilTexture?: boolean;
  scoreText?: string; // e.g. "MARKAH: 18/20 (90%)"
}

export function drawOMRSheetToCanvas(canvas: HTMLCanvasElement, drawOptions: DrawOMROptions) {
  const {
    studentName = '',
    studentClass = '',
    subject = 'SAINS',
    sectionTitle = 'Bahagian A',
    totalQuestions = 20,
    optionsCount = 5,
    filledAnswers = {},
    correctAnswers = {},
    showCorrectionColumn = true,
    simulatePencilTexture = true,
    scoreText = '',
  } = drawOptions;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Exact A4 portrait aspect ratio (1:1.414), 1240 x 1754 px @ 150 DPI
  const width = 1240;
  const height = 1754;
  canvas.width = width;
  canvas.height = height;

  // Background - clean crisp white paper
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 1. Black Fiducial Optical Alignment Markers (6 squares as in user template image)
  const markerSize = 34;
  const markerMargin = 40;
  ctx.fillStyle = '#000000';

  // Top-Left & Top-Right
  const topMarkerY = 145;
  ctx.fillRect(markerMargin, topMarkerY, markerSize, markerSize);
  ctx.fillRect(width - markerMargin - markerSize, topMarkerY, markerSize, markerSize);

  // Middle-Left & Middle-Right
  const midMarkerY = Math.round(height * 0.52);
  ctx.fillRect(markerMargin, midMarkerY, markerSize, markerSize);
  ctx.fillRect(width - markerMargin - markerSize, midMarkerY, markerSize, markerSize);

  // Bottom-Left & Bottom-Right
  const botMarkerY = height - markerMargin - markerSize - 20;
  ctx.fillRect(markerMargin, botMarkerY, markerSize, markerSize);
  ctx.fillRect(width - markerMargin - markerSize, botMarkerY, markerSize, markerSize);

  // 2. Header Instructions (Bilingual Malay & English matching the uploaded image)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#111827';
  ctx.font = '500 23px "Plus Jakarta Sans", "Times New Roman", serif';
  ctx.fillText(`Isikan Jawapan anda bagi ${sectionTitle} pada ruang di bawah`, 110, 68);

  ctx.font = 'italic 500 20px "Plus Jakarta Sans", "Times New Roman", serif';
  ctx.fillStyle = '#374151';
  ctx.fillText(`Fill in your answer for Section A in the space below`, 110, 102);

  // 3. Student Information Box (Exact layout matching template image)
  // Rounded rectangular box with 2 rows: NAMA on top row, KELAS and SUBJEK on bottom row
  const infoBoxX = 110;
  const infoBoxY = 145;
  const infoBoxW = width - 220;
  const infoBoxH = 125;
  const radius = 24;

  ctx.save();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#000000';

  // Outer rounded container
  ctx.beginPath();
  ctx.roundRect(infoBoxX, infoBoxY, infoBoxW, infoBoxH, radius);
  ctx.stroke();

  // Horizontal divider between row 1 (NAMA) and row 2 (KELAS/SUBJEK)
  const rowDividerY = infoBoxY + infoBoxH * 0.5;
  ctx.beginPath();
  ctx.moveTo(infoBoxX, rowDividerY);
  ctx.lineTo(infoBoxX + infoBoxW, rowDividerY);
  ctx.stroke();

  // Row 1: NAMA label compartment (grey background with rounded top-left)
  const labelNamaW = 160;
  ctx.fillStyle = '#d1d5db'; // solid grey tone as in image
  ctx.beginPath();
  ctx.roundRect(infoBoxX, infoBoxY, labelNamaW, infoBoxH * 0.5, [radius, 0, 0, 0]);
  ctx.fill();
  ctx.stroke();

  // Vertical line after NAMA label
  ctx.beginPath();
  ctx.moveTo(infoBoxX + labelNamaW, infoBoxY);
  ctx.lineTo(infoBoxX + labelNamaW, rowDividerY);
  ctx.stroke();

  // NAMA Text Label
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NAMA', infoBoxX + labelNamaW / 2, infoBoxY + (infoBoxH * 0.25));

  // Student name value (if provided)
  if (studentName) {
    ctx.textAlign = 'left';
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillText(studentName.toUpperCase(), infoBoxX + labelNamaW + 20, infoBoxY + (infoBoxH * 0.25));
  }

  // Row 2: KELAS label compartment (grey background with rounded bottom-left)
  const labelKelasW = 160;
  const valueKelasW = 260;

  ctx.fillStyle = '#d1d5db';
  ctx.beginPath();
  ctx.roundRect(infoBoxX, rowDividerY, labelKelasW, infoBoxH * 0.5, [0, 0, 0, radius]);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(infoBoxX + labelKelasW, rowDividerY);
  ctx.lineTo(infoBoxX + labelKelasW, infoBoxY + infoBoxH);
  ctx.stroke();

  // KELAS Text Label
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('KELAS', infoBoxX + labelKelasW / 2, rowDividerY + (infoBoxH * 0.25));

  // Student class value (if provided)
  if (studentClass) {
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.fillText(studentClass.toUpperCase(), infoBoxX + labelKelasW + 20, rowDividerY + (infoBoxH * 0.25));
  }

  // Row 2: Vertical separator before SUBJEK
  const subjekStartX = infoBoxX + labelNamaW + valueKelasW;
  const labelSubjekW = 160;

  ctx.beginPath();
  ctx.moveTo(subjekStartX, rowDividerY);
  ctx.lineTo(subjekStartX, infoBoxY + infoBoxH);
  ctx.stroke();

  // SUBJEK label compartment (grey background)
  ctx.fillStyle = '#d1d5db';
  ctx.fillRect(subjekStartX, rowDividerY, labelSubjekW, infoBoxH * 0.5);
  ctx.strokeRect(subjekStartX, rowDividerY, labelSubjekW, infoBoxH * 0.5);

  // SUBJEK Text Label
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SUBJEK', subjekStartX + labelSubjekW / 2, rowDividerY + (infoBoxH * 0.25));

  // SUBJEK Value compartment
  const subjekValueX = subjekStartX + labelSubjekW;
  ctx.textAlign = 'center';
  ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subject.toUpperCase(), subjekValueX + (infoBoxX + infoBoxW - subjekValueX) / 2, rowDividerY + (infoBoxH * 0.25));

  ctx.restore();

  // 4. Dynamic Column Calculation to guarantee fit on single A4 sheet
  // If <= 20 questions -> 2 columns (e.g. 1-10, 11-20, exactly as in sample image!)
  // If 21-40 questions -> 2 columns of 15-20 or 3 columns
  // If 41-60 questions -> 3 columns
  // If > 60 questions -> 4 columns
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

  // Grid Dimensions
  const gridStartY = 330;
  // Leave bottom space for Error Summary Box if there are wrong answers
  const availableGridHeight = height - gridStartY - 240;
  const rowHeight = Math.min(52, Math.max(26, Math.floor(availableGridHeight / questionsPerColumn)));
  const bubbleRadius = Math.min(15, Math.max(9, Math.round(rowHeight * 0.30)));

  const contentWidth = width - 200; // side margins
  const columnGap = numColumns === 2 ? 60 : (numColumns === 3 ? 35 : 20);
  const columnWidth = Math.floor((contentWidth - (numColumns - 1) * columnGap) / numColumns);
  const startX = 100;

  // Tracking mistakes for bottom summary box
  const wrongQuestionsList: Array<{ q: number; student: string; correct: string }> = [];

  // Draw each column
  for (let col = 0; col < numColumns; col++) {
    const colX = startX + col * (columnWidth + columnGap);

    const startQ = col * questionsPerColumn + 1;
    const endQ = Math.min((col + 1) * questionsPerColumn, totalQuestions);

    if (startQ > totalQuestions) continue;

    // Column Question Numbers width
    const qNumWidth = 44;
    const bubblesAreaWidth = optionsList.length * (bubbleRadius * 2 + 16);
    const bubbleSpacing = Math.floor(bubblesAreaWidth / optionsList.length);
    const bubblesStartX = colX + qNumWidth + 12;

    // Side Correction Space (Ruang di sebelah bagi menunjukkan soalan yang salah)
    const sideSpaceStartX = bubblesStartX + bubblesAreaWidth + 10;
    const sideSpaceWidth = (colX + columnWidth) - sideSpaceStartX;

    // Column Header Letters: A B C D E with KOTAK HITAM PENJALURAN X (Column Optical Timing Marks)
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const headerY = gridStartY - 24;

    // Kotak Hitam Jalur X di atas nombor soalan
    ctx.fillRect(colX - 18, headerY - 24, 16, 10);

    for (let optIdx = 0; optIdx < optionsList.length; optIdx++) {
      const bx = bubblesStartX + optIdx * bubbleSpacing + bubbleSpacing / 2;
      
      // Kotak Hitam Penjajaran Jalur X (Column Timing Mark) di atas setiap pilihan A, B, C, D, E
      ctx.fillStyle = '#000000';
      ctx.fillRect(bx - 9, headerY - 24, 18, 10);

      // Huruf Pilihan A B C D E
      ctx.fillStyle = '#000000';
      ctx.fillText(optionsList[optIdx], bx, headerY);
    }

    // Side column header: "CATATAN / BETUL"
    if (showCorrectionColumn && sideSpaceWidth > 50) {
      ctx.fillStyle = '#6b7280';
      ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('CATATAN / SEMAKAN', sideSpaceStartX + 6, headerY);

      // Subtle vertical divider line before side correction column
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sideSpaceStartX, headerY - 14);
      ctx.lineTo(sideSpaceStartX, gridStartY + (endQ - startQ + 1) * rowHeight);
      ctx.stroke();
    }

    // Draw Questions in this column
    for (let q = startQ; q <= endQ; q++) {
      const rowIdx = q - startQ;
      const rowY = gridStartY + rowIdx * rowHeight;
      const centerY = rowY + rowHeight / 2;

      // 1. KOTAK HITAM PENJALURAN Y (Row Optical Timing Track Mark)
      // Diletakkan tepat sejajar dengan paksi Y setiap baris soalan
      ctx.fillStyle = '#000000';
      // Kotak Hitam Jalur Y di sebelah nombor soalan
      ctx.fillRect(colX - 24, centerY - 6, 16, 12);

      // Kotak Hitam Jalur Y di margin luar kertas untuk rujukan kamera
      ctx.fillRect(markerMargin + 6, centerY - 5, 22, 10);
      ctx.fillRect(width - markerMargin - 28, centerY - 5, 22, 10);

      // Question Number (Bold, high contrast as in template)
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.min(24, Math.round(rowHeight * 0.52))}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${q}`, colX, centerY);

      // Student answer & Correct answer
      const studentAns = filledAnswers[q];
      const correctAns = correctAnswers[q];
      const hasEvaluation = correctAns !== undefined;
      const isUnclear = !studentAns || studentAns === 'TIADA_JAWAPAN' || studentAns === 'AMBIGU/DOUBLE_MARK' || studentAns === 'TIDAK_JELAS';
      const isCorrect = hasEvaluation && !isUnclear && studentAns === correctAns;
      const isWrong = hasEvaluation && !isUnclear && !isCorrect;

      if (isWrong || isUnclear) {
        wrongQuestionsList.push({
          q,
          student: studentAns || 'KOSONG',
          correct: correctAns || '-',
        });
      }

      // Bubbles A, B, C, D (E)
      for (let optIdx = 0; optIdx < optionsList.length; optIdx++) {
        const opt = optionsList[optIdx];
        const bubbleCenterX = bubblesStartX + optIdx * bubbleSpacing + bubbleSpacing / 2;
        const bubbleCenterY = centerY;

        const isFilled = studentAns === opt;
        const isDoubleMark = (studentAns === 'AMBIGU/DOUBLE_MARK' || studentAns === 'TIDAK_JELAS') && (opt === 'A' || opt === 'B');

        ctx.beginPath();
        ctx.arc(bubbleCenterX, bubbleCenterY, bubbleRadius, 0, Math.PI * 2);

        if (isFilled || isDoubleMark) {
          // Shaded pencil mark
          ctx.fillStyle = '#1e293b';
          ctx.fill();

          if (simulatePencilTexture) {
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.arc(bubbleCenterX - 2, bubbleCenterY - 2, bubbleRadius - 4, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          // Clean hollow circle outline as in template
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#4b5563';
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
      }

      // RUANG DI SEBELAH: PENANDAAN WARNA HIJAU (BETUL), MERAH (SALAH), KUNING (TIDAK JELAS)
      if (showCorrectionColumn) {
        if (hasEvaluation) {
          if (isCorrect) {
            // JAWAPAN BETUL: TANDA HIJAU (Green)
            ctx.save();
            ctx.fillStyle = '#16a34a';
            ctx.font = `bold ${Math.round(rowHeight * 0.54)}px "Plus Jakarta Sans", sans-serif`;
            ctx.textAlign = 'left';
            ctx.fillText('✔ Betul', sideSpaceStartX + 8, centerY);
            ctx.restore();
          } else if (isUnclear) {
            // JAWAPAN TIDAK JELAS / KOSONG / SAMAR: TANDA KUNING (Yellow / Amber)
            ctx.save();
            const badgeH = Math.min(28, rowHeight - 6);
            const badgeY = centerY - badgeH / 2;

            // Yellow highlight pill
            ctx.fillStyle = '#fef9c3';
            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(sideSpaceStartX + 4, badgeY, Math.max(90, sideSpaceWidth - 8), badgeH, 6);
            ctx.fill();
            ctx.stroke();

            // Amber text & warning symbol
            ctx.fillStyle = '#854d0e';
            ctx.font = `bold ${Math.min(13, Math.round(rowHeight * 0.36))}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'left';
            const labelText = studentAns === 'AMBIGU/DOUBLE_MARK' ? `⚠ Dwi (${correctAns})` : `○ Kosong (${correctAns})`;
            ctx.fillText(labelText, sideSpaceStartX + 8, centerY);
            ctx.restore();
          } else {
            // JAWAPAN SALAH: TANDA MERAH (Red)
            ctx.save();
            const badgeH = Math.min(28, rowHeight - 6);
            const badgeY = centerY - badgeH / 2;

            // Red highlight pill
            ctx.fillStyle = '#fee2e2';
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(sideSpaceStartX + 4, badgeY, Math.max(90, sideSpaceWidth - 8), badgeH, 6);
            ctx.fill();
            ctx.stroke();

            // Bold Red cross & correct answer text
            ctx.fillStyle = '#b91c1c';
            ctx.font = `bold ${Math.min(14, Math.round(rowHeight * 0.38))}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'left';
            ctx.fillText(`✘ Betul: ${correctAns}`, sideSpaceStartX + 10, centerY);
            ctx.restore();
          }
        } else {
          // In blank mode: draw light dotted line for teacher marking
          ctx.save();
          ctx.strokeStyle = '#e5e7eb';
          ctx.setLineDash([3, 4]);
          ctx.beginPath();
          ctx.moveTo(sideSpaceStartX + 10, centerY);
          ctx.lineTo(sideSpaceStartX + Math.max(70, sideSpaceWidth - 10), centerY);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  // 5. Ruang Kosong Bawah Bahagian Tanda Jawapan Pelajar:
  // Meletakkan anotasi markah, bilangan betul dan data jawapan pelajar dikurangkan ke 50% skala dari asal
  ctx.save();
  const gridBottomY = gridStartY + questionsPerColumn * rowHeight;

  if (scoreText || Object.keys(filledAnswers).length > 0) {
    const isFullMarks = wrongQuestionsList.length === 0;
    const strokeColor = isFullMarks ? '#059669' : '#dc2626';
    const bgColor = isFullMarks ? 'rgba(236, 253, 245, 0.98)' : 'rgba(254, 242, 242, 0.98)';

    const betulCount = totalQuestions - wrongQuestionsList.length;
    const salahCount = wrongQuestionsList.length;
    const markahText = scoreText || `MARKAH: ${betulCount}/${totalQuestions}`;
    const statusText = isFullMarks ? 'CEMERLANG' : betulCount >= totalQuestions * 0.4 ? 'LULUS' : 'PERLU BIMBINGAN';

    // 50% skala dari asal (saiz ketinggian asal 56px kini dikurangkan ke skala 50%, font asal 14px/12px kini 7px/6px)
    const stampW = Math.min(580, width - 240);
    const stampH = 50; // Keseluruhan kad diringkaskan ke skala 50% merangkumi markah, bilangan betul & data jawapan
    const stampX = (width - stampW) / 2;
    // Terletak terus di ruangan kosong di bawah bahagian tanda jawapan pelajar
    const stampY = Math.min(height - 110, gridBottomY + 16);

    // Kad Anotasi 50% Skala
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(stampX, stampY, stampW, stampH, 4);
    ctx.fill();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Garisan 1 (Skala 50%): Anotasi Markah & Status & Bilangan Betul
    ctx.textAlign = 'center';
    ctx.fillStyle = strokeColor;
    ctx.font = 'bold 7.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `★ SEMAKAN OMR RASMI ★  |  ${markahText}  |  STATUS: ${statusText}  |  [✔ ${betulCount} BETUL  •  ✘ ${salahCount} SALAH]`,
      stampX + stampW / 2,
      stampY + 14
    );

    // Garisan pembahagi halus
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(stampX + 12, stampY + 22);
    ctx.lineTo(stampX + stampW - 12, stampY + 22);
    ctx.stroke();

    // Garisan 2 & 3 (Skala 50%): Data Jawapan Pelajar (Senarai jawapan bagi setiap nombor soalan)
    const studentAnswerSummary = Array.from({ length: totalQuestions }, (_, i) => {
      const qNum = i + 1;
      const ans = filledAnswers[qNum] || '-';
      const isAnsCorrect = correctAnswers[qNum] !== undefined ? filledAnswers[qNum] === correctAnswers[qNum] : true;
      return `${qNum}:${ans}${correctAnswers[qNum] !== undefined ? (isAnsCorrect ? '✔' : '✘') : ''}`;
    });

    ctx.font = '6px "JetBrains Mono", monospace';
    ctx.fillStyle = isFullMarks ? '#065f46' : '#991b1b';
    ctx.textAlign = 'center';

    if (totalQuestions <= 20) {
      // 1 baris ringkas data jawapan pelajar
      const textRow = `DATA JAWAPAN PELAJAR: ${studentAnswerSummary.join('  ')}`;
      ctx.fillText(textRow, stampX + stampW / 2, stampY + 36);
    } else {
      // 2 baris data jawapan jika > 20 soalan
      const half = Math.ceil(totalQuestions / 2);
      const row1 = `DATA JWP (S1-${half}): ${studentAnswerSummary.slice(0, half).join(' ')}`;
      const row2 = `DATA JWP (S${half + 1}-${totalQuestions}): ${studentAnswerSummary.slice(half).join(' ')}`;
      ctx.fillText(row1, stampX + stampW / 2, stampY + 33);
      ctx.fillText(row2, stampX + stampW / 2, stampY + 43);
    }
  } else {
    // Blank sheet mode: Minimal, neat examiner verification line in footer
    ctx.fillStyle = '#6b7280';
    ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Ruang Pengesahan Pemeriksa: ______________________________     Tarikh: _______________', width / 2, height - 90);
  }
  ctx.restore();

  // Footer tracking
  ctx.fillStyle = '#6b7280';
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`TEMPLAT OMR RASMI A4 | ${totalQuestions} SOALAN (${optionsList.length} PILIHAN) | ${subject.toUpperCase()} | KEMENTERIAN PENDIDIKAN MALAYSIA`, width / 2, height - 30);
}
