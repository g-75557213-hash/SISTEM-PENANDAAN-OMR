// Canvas generator for standard Malaysian A4 OMR Examination Answer Sheets
// Based on exact template layout with A4 single page guarantee, Braille identifiers, and dedicated side correction area.
import {
  getBrailleForNumber,
  getBrailleForOption,
  drawBrailleNumberPattern,
  drawBrailleOptionPattern,
} from './brailleUtils';

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

  // 2. Header Arahan (Menggantikan Tajuk Lama Sesuai Permintaan Pengguna)
  // Menepati arahan: "BUANGKAN JUGA BAHAGIAN 'BORANG JAWAPAN OMR A4- PEPERIKSAAN OBJEKTIF' DAN LETAKKAN ARAHAN DI BAHAGIAN TERSEBUT. PASTIKAN TEMPLATE DALAM BENTUK HITAM DAN PUTIH."
  ctx.textAlign = 'center';
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('ARAHAN: Sila hitamkan jawapan anda di Bahagian A dalam ruang jawapan yang disediakan.', width / 2, 52);

  ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#000000';
  ctx.fillText(`MATA PELAJARAN: ${subject.toUpperCase()}   |   ${sectionTitle.toUpperCase()} (${totalQuestions} SOALAN)   |   GUNA PENSEL 2B SAHAJA`, width / 2, 78);

  // 3. RUANG MASUKKAN NAMA DAN KELAS (HITAM & PUTIH - KEMAS & TERSUSUN)
  // Menepati arahan: "KEMUDIAN LETAK BAHAGIAN UNTUK MASUKKAN NAMA DAN KELAS SEPERTI SEBELUM INI."
  const nameBoxX = 100;
  const nameBoxY = 98;
  const nameBoxW = width - 200;
  const nameBoxH = 84;

  ctx.save();
  // Kotak berbingkai hitam dan putih
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(nameBoxX, nameBoxY, nameBoxW, nameBoxH);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(nameBoxX, nameBoxY, nameBoxW, nameBoxH);

  // Garisan pembahagi mendatar antara Baris Nama dan Baris Kelas
  const midLineY = nameBoxY + 42;
  ctx.beginPath();
  ctx.moveTo(nameBoxX, midLineY);
  ctx.lineTo(nameBoxX + nameBoxW, midLineY);
  ctx.stroke();

  // Garisan pembahagi menegak baris bawah (Kelas di kiri, Tarikh/No. Kad di kanan)
  const splitColX = nameBoxX + Math.round(nameBoxW * 0.60);
  ctx.beginPath();
  ctx.moveTo(splitColX, midLineY);
  ctx.lineTo(splitColX, nameBoxY + nameBoxH);
  ctx.stroke();

  // Baris 1: Ruang Nama Calon
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('NAMA CALON / PELAJAR:', nameBoxX + 16, nameBoxY + 21);

  if (studentName) {
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.fillText(studentName.toUpperCase(), nameBoxX + 200, nameBoxY + 21);
  } else {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(nameBoxX + 200, nameBoxY + 28);
    ctx.lineTo(nameBoxX + nameBoxW - 16, nameBoxY + 28);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Baris 2 Kiri: Ruang Kelas
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('KELAS / TINGKATAN:', nameBoxX + 16, midLineY + 21);

  if (studentClass) {
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.fillText(studentClass.toUpperCase(), nameBoxX + 175, midLineY + 21);
  } else {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(nameBoxX + 175, midLineY + 28);
    ctx.lineTo(splitColX - 16, midLineY + 28);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Baris 2 Kanan: Ruang Tarikh / No. Kad Pengenalan
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('TARIKH / NO. PENGENALAN:', splitColX + 16, midLineY + 21);

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(splitColX + 225, midLineY + 28);
  ctx.lineTo(nameBoxX + nameBoxW - 16, midLineY + 28);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // 4. PANDUAN MENGHITAMKAN JAWAPAN (HITAM & PUTIH, TIADA HURUF DALAM KAWASAN PENGHITAMAN)
  // Menepati arahan: "PANDUAN MENGHITANKAN JAWAPAN YANG BETUL TIDAK PERLU ADA HURUF DALAM KAWASAN PENGHITAMAN. PASTIKAN TEMPLATE DALAM BENTUK HITAM DAN PUTIH."
  const guideBoxY = 194;
  const guideBoxH = 70;
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(nameBoxX, guideBoxY, nameBoxW, guideBoxH);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(nameBoxX, guideBoxY, nameBoxW, guideBoxH);

  // Label panduan
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('PANDUAN MENGHITAMKAN JAWAPAN:', nameBoxX + 18, guideBoxY + 20);

  // Contoh 1: Bulatan Hitam Betul (PADAT HITAM TULEN, TIADA HURUF DALAM KAWASAN PENGHITAMAN)
  const sY = guideBoxY + 46;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(nameBoxX + 28, sY, 11, 0, Math.PI * 2);
  ctx.fill();
  // TIDAK MELUKIS HURUF DI DALAM BULATAN PENGHITAMAN mengikut arahan eksplisit pengguna

  ctx.textAlign = 'left';
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('✔ Betul', nameBoxX + 46, sY);

  // Contoh 2: Tanda Pangkah (Salah)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(nameBoxX + 120, sY, 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✘', nameBoxX + 120, sY);
  ctx.textAlign = 'left';
  ctx.fillText('Salah', nameBoxX + 138, sY);

  // Contoh 3: Tanda Semak (Salah)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(nameBoxX + 200, sY, 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✔', nameBoxX + 200, sY);
  ctx.textAlign = 'left';
  ctx.fillText('Salah', nameBoxX + 218, sY);

  // Contoh 4: Bulatan Tidak Penuh / Titik (Salah)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(nameBoxX + 280, sY, 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(nameBoxX + 280, sY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.fillText('Salah', nameBoxX + 298, sY);

  // Teks panduan sebelah kanan (Monokrom / Hitam Putih)
  ctx.textAlign = 'right';
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('• Gunakan pensel 2B sahaja. Hitamkan bulatan jawapan dengan penuh & gelap.', nameBoxX + nameBoxW - 18, guideBoxY + 22);
  ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('• Jangan tanda palang atau tanda semak. Padam bersih jika menukar jawapan.', nameBoxX + nameBoxW - 18, guideBoxY + 46);
  ctx.restore();

  // 5. Dynamic Column Calculation to guarantee fit on single A4 sheet
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

    // Column Question Numbers width (Accommodates question number + Braille code)
    const qNumWidth = 62;
    const bubblesAreaWidth = optionsList.length * (bubbleRadius * 2 + 16);
    const bubbleSpacing = Math.floor(bubblesAreaWidth / optionsList.length);
    const bubblesStartX = colX + qNumWidth + 8;

    // Side Correction Space (Ruang di sebelah bagi menunjukkan soalan yang salah)
    const sideSpaceStartX = bubblesStartX + bubblesAreaWidth + 10;
    const sideSpaceWidth = (colX + columnWidth) - sideSpaceStartX;

    // Column Header Coordinate
    const headerY = gridStartY - 24;

    // Menepati arahan pengguna: Bahagian "LURUSAN SOALAN 1 HINGGA 10" dan "LURUSAN SOALAN 11 HINGGA 20" telah DIBUANG SEPENUHNYA.
    // Templat terus memulakan baris penjajaran X, kod Braille ABCD, dan huruf lajur dalam warna Hitam & Putih.

    // Column Header Letters: A B C D E with KOTAK HITAM PENJALURAN X & KOD BRAILLE LAJUR
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Kotak Hitam Jalur X di atas nombor soalan
    ctx.fillRect(colX - 18, headerY - 32, 16, 10);

    for (let optIdx = 0; optIdx < optionsList.length; optIdx++) {
      const optLetter = optionsList[optIdx];
      const bx = bubblesStartX + optIdx * bubbleSpacing + bubbleSpacing / 2;
      
      // Kotak Hitam Penjajaran Jalur X (Column Timing Mark) di atas setiap pilihan A, B, C, D, E
      ctx.fillStyle = '#000000';
      ctx.fillRect(bx - 9, headerY - 32, 18, 10);

      // KOD BRAILLE LAJUR A, B, C, D (E):
      // Dilukis di atas huruf pilihan untuk memudahkan sistem mengecam lajur jawapan ABCD
      drawBrailleOptionPattern(ctx, bx, headerY - 14, optLetter, {
        dotRadius: 1.6,
        spacingX: 3.8,
        spacingY: 3.8,
        fillColor: '#000000',
      });

      // Huruf Pilihan A B C D E
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(optLetter, bx, headerY + 4);

      // Teks Unicode Braille kecil di bawah huruf sebagai rujukan visual dwibahasa (Hitam & Putih)
      const brailleChar = getBrailleForOption(optLetter);
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = '#000000';
      ctx.fillText(brailleChar, bx, headerY + 18);
    }

    // Side column header: "CATATAN / SEMAKAN" (Hitam & Putih)
    if (showCorrectionColumn && sideSpaceWidth > 50) {
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('CATATAN / SEMAKAN', sideSpaceStartX + 6, headerY);

      // Garisan pembahagi menegak sebelum ruang semakan
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sideSpaceStartX, headerY - 22);
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

      // Question Number (Bold, high contrast)
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.min(22, Math.round(rowHeight * 0.48))}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${q}`, colX, centerY);

      // KOD BRAILLE BAGI NOMBOR SOALAN (1 HINGGA NOMBOR TERAKHIR)
      // Membantu pengecaman baris jawapan nombor soalan secara automatik & aksesibiliti
      const brailleNumText = getBrailleForNumber(q);
      const brailleX = colX + (q >= 10 ? 28 : 22);

      // Lukis titik sel Braille piawai
      drawBrailleNumberPattern(ctx, brailleX, centerY - 6, q, {
        dotRadius: 1.4,
        spacingX: 3.2,
        spacingY: 3.2,
        cellGap: 2.5,
        fillColor: '#000000',
      });

      // Teks Unicode Braille lembut di bawah/sisi
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'left';
      ctx.fillText(brailleNumText, brailleX, centerY + 8);

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
          // Clean hollow circle outline in pure Black & White
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#000000';
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

    // KOTAK HITAM PENJALURAN X BAWAH (Bottom Column Timing Marks)
    // Membantu pengecaman tepat jalur X pada bahagian bawah setiap lajur
    const bottomTrackY = gridStartY + (endQ - startQ + 1) * rowHeight + 8;
    ctx.fillStyle = '#000000';
    ctx.fillRect(colX - 18, bottomTrackY, 16, 10);
    for (let optIdx = 0; optIdx < optionsList.length; optIdx++) {
      const bx = bubblesStartX + optIdx * bubbleSpacing + bubbleSpacing / 2;
      ctx.fillRect(bx - 9, bottomTrackY, 18, 10);
    }
  }

  // 5. Ruang Bawah: Kotak Hijau Penyata Rasmi Markah (Jumlah Jawapan Betul per Jawapan Salah)
  // Menepati arahan: "jumlah jawapan betul per jawapan salah akan diletakkan di bahagian bawah dalam kotak dalam warna hijau"
  ctx.save();
  const gridBottomY = gridStartY + questionsPerColumn * rowHeight;

  if (scoreText || Object.keys(filledAnswers).length > 0) {
    const betulCount = totalQuestions - wrongQuestionsList.length;
    const salahCount = wrongQuestionsList.length;
    const pct = ((betulCount / totalQuestions) * 100).toFixed(1);
    const statusText = salahCount === 0 ? 'CEMERLANG' : betulCount >= totalQuestions * 0.4 ? 'LULUS' : 'PERLU BIMBINGAN';

    // Kotak dalam warna hijau rasmi (Emerald Green container)
    const boxW = Math.min(620, width - 220);
    const boxH = 56;
    const boxX = (width - boxW) / 2;
    const boxY = Math.min(height - 115, gridBottomY + 16);

    // Latar belakang kotak warna hijau lembut / emerald
    ctx.fillStyle = '#ecfdf5'; // emerald-50
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.fill();

    // Bingkai hijau pekat berkilat
    ctx.strokeStyle = '#059669'; // emerald-600
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner subtle glow border
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(boxX + 2, boxY + 2, boxW - 4, boxH - 4);

    // Garisan 1: PENEGASAN JUMLAH JAWAPAN BETUL PER JAWAPAN SALAH (KOTAK HIJAU)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#065f46'; // emerald-900
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `KEPUTUSAN SEMAKAN RASMI: ${betulCount} BETUL / ${salahCount} SALAH (${betulCount}/${totalQuestions} SOALAN • ${pct}%) — STATUS: ${statusText}`,
      boxX + boxW / 2,
      boxY + 18
    );

    // Garisan pembahagi hijau
    ctx.strokeStyle = '#a7f3d0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(boxX + 16, boxY + 27);
    ctx.lineTo(boxX + boxW - 16, boxY + 27);
    ctx.stroke();

    // Garisan 2: Catatan terperinci mengikut kod warna (Hijau = Betul, Merah = Salah, Kuning = Ralat/Kosong)
    const studentAnswerSummary = Array.from({ length: totalQuestions }, (_, i) => {
      const qNum = i + 1;
      const ans = filledAnswers[qNum] || '-';
      const isAnsCorrect = correctAnswers[qNum] !== undefined ? filledAnswers[qNum] === correctAnswers[qNum] : true;
      return `${qNum}:${ans}${correctAnswers[qNum] !== undefined ? (isAnsCorrect ? '✔' : '✘') : ''}`;
    });

    ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#047857'; // emerald-700
    ctx.textAlign = 'center';

    if (totalQuestions <= 20) {
      const textRow = `RINGKASAN JAWAPAN: ${studentAnswerSummary.join('  ')}`;
      ctx.fillText(textRow, boxX + boxW / 2, boxY + 43);
    } else {
      const half = Math.ceil(totalQuestions / 2);
      const row1 = `S1-${half}: ${studentAnswerSummary.slice(0, half).join(' ')}`;
      const row2 = `S${half + 1}-${totalQuestions}: ${studentAnswerSummary.slice(half).join(' ')}`;
      ctx.fillText(`${row1}  |  ${row2}`, boxX + boxW / 2, boxY + 43);
    }
  } else {
    // Blank sheet mode: Minimal, neat examiner verification line in footer (Hitam & Putih)
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Ruang Pengesahan Pemeriksa: ______________________________     Tarikh: _______________', width / 2, height - 90);
  }
  ctx.restore();

  // Footer tracking (Hitam & Putih)
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`TEMPLAT OMR RASMI A4 | ${totalQuestions} SOALAN (${optionsList.length} PILIHAN) | ${subject.toUpperCase()} | KEMENTERIAN PENDIDIKAN MALAYSIA`, width / 2, height - 30);
}
