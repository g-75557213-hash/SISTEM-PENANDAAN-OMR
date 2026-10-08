import React, { useEffect, useRef, useState } from 'react';
import { OMRGradingResponse } from '../types';
import { Download, Printer, ZoomIn, ZoomOut, RotateCcw, Eye, Layers, CheckCircle2, XCircle } from 'lucide-react';

interface OMRCanvasViewerProps {
  imageSrc: string;
  gradingResult: OMRGradingResponse;
  highlightedQuestion?: number | null;
  onSelectQuestion?: (qNum: number) => void;
}

export const OMRCanvasViewer: React.FC<OMRCanvasViewerProps> = ({
  imageSrc,
  gradingResult,
  highlightedQuestion = null,
  onSelectQuestion,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Layer toggle states
  const [showCheckmarks, setShowCheckmarks] = useState(true);
  const [showCorrections, setShowCorrections] = useState(true);
  const [showBoxes, setShowBoxes] = useState(false);
  const [showHeaderStamp, setShowHeaderStamp] = useState(true);
  const [showOfficialSeal, setShowOfficialSeal] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Render combined annotated image onto canvas
  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;

      // 1. Draw base student image
      ctx.drawImage(img, 0, 0, img.width, img.height);

      const w = img.width;
      const h = img.height;
      const totalQ = gradingResult.analisis_detail.length;
      const questionsPerCol = Math.ceil(totalQ / (totalQ > 25 ? 2 : 1));
      const numCols = totalQ > 25 ? 2 : 1;

      // 2. Draw Question Annotations (Ticks, Crosses, Correct Answer Labels)
      gradingResult.analisis_detail.forEach((item) => {
        const qNum = item.nombor_soalan;
        const isHighlighted = highlightedQuestion === qNum;

        // Determine coordinates: use box if available or compute from grid geometry
        let boxYmin = 0;
        let boxYmax = 0;
        let boxXmin = 0;
        let boxXmax = 0;

        if (item.box && item.box.ymin) {
          // Normalize if 0-1000 scale
          const isScale1000 = item.box.ymax > 100;
          boxYmin = isScale1000 ? (item.box.ymin / 1000) * h : (item.box.ymin / 100) * h;
          boxYmax = isScale1000 ? (item.box.ymax / 1000) * h : (item.box.ymax / 100) * h;
          boxXmin = isScale1000 ? (item.box.xmin / 1000) * w : (item.box.xmin / 100) * w;
          boxXmax = isScale1000 ? (item.box.xmax / 1000) * w : (item.box.xmax / 100) * w;
        } else {
          // Geometric layout fallback
          const col = qNum <= questionsPerCol ? 0 : 1;
          const rowInCol = col === 0 ? qNum - 1 : qNum - 1 - questionsPerCol;
          const colStartX = numCols === 2 ? (col === 0 ? w * 0.08 : w * 0.54) : w * 0.12;
          const colWidth = numCols === 2 ? w * 0.38 : w * 0.76;
          const gridStartY = h * 0.26;
          const rowHeight = (h * 0.65) / questionsPerCol;

          boxXmin = colStartX;
          boxXmax = colStartX + colWidth;
          boxYmin = gridStartY + rowInCol * rowHeight;
          boxYmax = boxYmin + rowHeight;
        }

        const boxH = boxYmax - boxYmin;
        const centerY = (boxYmin + boxYmax) / 2;
        const optionsStartX = boxXmin + (boxXmax - boxXmin) * 0.16;
        const optionsGap = ((boxXmax - boxXmin) * 0.5) / 4;

        // Map option letters A, B, C, D, E to approximate X center
        const optToIndex: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };
        const studentOpt = item.jawapan_pelajar;
        const correctOpt = item.jawapan_sebenar;

        // Highlight active question selection
        if (isHighlighted) {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.18)';
          ctx.fillRect(boxXmin - 6, boxYmin - 2, (boxXmax - boxXmin) + 120, boxH + 4);
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 2;
          ctx.strokeRect(boxXmin - 6, boxYmin - 2, (boxXmax - boxXmin) + 120, boxH + 4);
        }

        // Draw Bounding Boxes if enabled
        if (showBoxes) {
          ctx.strokeStyle = item.status === 'BETUL' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
          ctx.lineWidth = 1;
          ctx.strokeRect(boxXmin, boxYmin, boxXmax - boxXmin, boxH);
        }

        // Target bubble X coordinate for mark
        let markTargetX = boxXmin + (boxXmax - boxXmin) * 0.28;
        if (studentOpt && optToIndex[studentOpt] !== undefined) {
          markTargetX = optionsStartX + optToIndex[studentOpt] * optionsGap + optionsGap * 0.5;
        }

        // 2a. Draw Checkmark (✔) or Cross (✘)
        if (showCheckmarks) {
          ctx.save();
          if (item.status === 'BETUL') {
            // Bright Green Checkmark ✔
            ctx.fillStyle = '#16a34a';
            ctx.strokeStyle = '#15803d';
            ctx.font = `bold ${Math.max(16, Math.round(boxH * 0.95))}px "Plus Jakarta Sans", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Slight glow
            ctx.shadowColor = 'rgba(34, 197, 94, 0.4)';
            ctx.shadowBlur = 4;
            ctx.fillText('✔', markTargetX, centerY);
          } else if (item.status === 'SALAH') {
            // Bold Red Cross ✘
            ctx.fillStyle = '#dc2626';
            ctx.strokeStyle = '#b91c1c';
            ctx.font = `bold ${Math.max(16, Math.round(boxH * 0.95))}px "Plus Jakarta Sans", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
            ctx.shadowBlur = 4;
            ctx.fillText('✘', markTargetX, centerY);
          } else if (item.status === 'KOSONG') {
            // Yellow / Amber Blank Mark
            ctx.fillStyle = '#d97706';
            ctx.font = `bold ${Math.max(14, Math.round(boxH * 0.8))}px "Plus Jakarta Sans", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('○', markTargetX, centerY);
          } else if (item.status === 'DOUBLE_MARK') {
            // Orange Double Mark Warning
            ctx.fillStyle = '#ea580c';
            ctx.font = `bold ${Math.max(14, Math.round(boxH * 0.8))}px "Plus Jakarta Sans", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚠', markTargetX, centerY);
          }
          ctx.restore();
        }

        // 2b. Draw Correct Answer Text ("Betul: C") on the right side if wrong/blank/ambiguous
        if (showCorrections && item.status !== 'BETUL') {
          ctx.save();
          const labelX = boxXmax + 12;
          const fontSize = Math.max(11, Math.round(boxH * 0.58));
          ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';

          // Background pill for clear legibility on top of paper
          const text = `Betul: ${correctOpt}`;
          const textMetrics = ctx.measureText(text);
          const pillWidth = textMetrics.width + 12;
          const pillHeight = fontSize + 6;

          ctx.fillStyle = item.status === 'SALAH' ? '#fee2e2' : '#fef3c7';
          ctx.strokeStyle = item.status === 'SALAH' ? '#ef4444' : '#f59e0b';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(labelX, centerY - pillHeight / 2, pillWidth, pillHeight, 3);
          ctx.fill();
          ctx.stroke();

          // Text inside pill
          ctx.fillStyle = item.status === 'SALAH' ? '#991b1b' : '#92400e';
          ctx.fillText(text, labelX + 6, centerY);
          ctx.restore();
        }
      });

      // 3. Draw Official Header Score Stamp (TOP_RIGHT)
      if (showHeaderStamp) {
        ctx.save();
        const headerInfo = gradingResult.cetakan_header_markah;
        const summary = gradingResult.ringkasan_keputusan;

        const stampW = w * 0.28;
        const stampH = h * 0.085;
        const stampX = w - stampW - (w * 0.06);
        const stampY = h * 0.115;

        // Stamp background badge
        const isLulus = headerInfo.status_kelulusan === 'LULUS' || headerInfo.status_kelulusan === 'CEMERLANG';
        const strokeColor = isLulus ? '#059669' : '#dc2626';
        const bgColor = isLulus ? 'rgba(236, 253, 245, 0.96)' : 'rgba(254, 242, 242, 0.96)';

        // Examiner Stamp Border (Double border for realistic exam grading stamp)
        ctx.fillStyle = bgColor;
        ctx.fillRect(stampX, stampY, stampW, stampH);

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(stampX, stampY, stampW, stampH);

        ctx.lineWidth = 1;
        ctx.strokeRect(stampX + 4, stampY + 4, stampW - 8, stampH - 8);

        // Header Stamp Content
        ctx.textAlign = 'center';
        ctx.fillStyle = strokeColor;
        ctx.font = `bold ${Math.round(stampH * 0.22)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillText('SEMAKAN OMR AI RASMI', stampX + stampW / 2, stampY + stampH * 0.28);

        // Score text
        ctx.font = `bold ${Math.round(stampH * 0.32)}px "JetBrains Mono", monospace`;
        ctx.fillText(headerInfo.teks_cetakan || `MARKAH: ${summary.jumlah_markah} | ${summary.peratusan}`, stampX + stampW / 2, stampY + stampH * 0.62);

        // Status pill
        ctx.font = `bold ${Math.round(stampH * 0.18)}px "Plus Jakarta Sans", sans-serif`;
        const statusText = `STATUS: ${headerInfo.status_kelulusan} (${summary.jawapan_betul} BETUL / ${summary.jawapan_salah} SALAH)`;
        ctx.fillText(statusText, stampX + stampW / 2, stampY + stampH * 0.88);

        ctx.restore();
      }

      // 4. Draw Official Rubber Stamp / Cop Pemeriksa (Corner angle red ink)
      if (showOfficialSeal) {
        ctx.save();
        const sealX = w - w * 0.14;
        const sealY = h * 0.075;
        ctx.translate(sealX, sealY);
        ctx.rotate((-8 * Math.PI) / 180); // 8 degree realistic stamp tilt

        ctx.strokeStyle = 'rgba(220, 38, 38, 0.75)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-65, -20, 130, 40);

        ctx.fillStyle = 'rgba(220, 38, 38, 0.75)';
        ctx.textAlign = 'center';
        ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('DISEMAK & DISAHKAN', 0, -4);
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(new Date().toLocaleDateString('ms-MY'), 0, 12);
        ctx.restore();
      }
    };
  }, [
    imageSrc,
    gradingResult,
    highlightedQuestion,
    showCheckmarks,
    showCorrections,
    showBoxes,
    showHeaderStamp,
    showOfficialSeal,
  ]);

  // Handle Download Annotated Image
  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `OMR_Marked_${gradingResult.ringkasan_keputusan.nama_pelajar.replace(/\s+/g, '_')}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  // Handle Print
  const handlePrint = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Kertas OMR Bertanda - ${gradingResult.ringkasan_keputusan.nama_pelajar}</title>
          <style>
            @page { size: A4 portrait; margin: 0.5cm; }
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: white; font-family: sans-serif; }
            img { max-width: 100%; height: auto; display: block; }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
      {/* Control Bar - Mobile Responsive */}
      <div className="bg-slate-950/90 backdrop-blur px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-300">
        {/* Layer Toggles - Horizontal scrollable on mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-slate-400 font-medium flex items-center gap-1 mr-1 shrink-0 text-[11px]">
            <Layers className="w-3.5 h-3.5" /> Lapisan:
          </span>
          <button
            onClick={() => setShowCheckmarks(!showCheckmarks)}
            className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 shrink-0 text-[11px] ${
              showCheckmarks ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
            title="Togol Tanda ✔ dan ✘"
          >
            <CheckCircle2 className="w-3 h-3" />
            Tanda ✔ / ✘
          </button>
          <button
            onClick={() => setShowCorrections(!showCorrections)}
            className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 shrink-0 text-[11px] ${
              showCorrections ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
            title="Togol Paparan Jawapan Betul bagi Soalan Salah"
          >
            <XCircle className="w-3 h-3" />
            Jawapan Betul
          </button>
          <button
            onClick={() => setShowHeaderStamp(!showHeaderStamp)}
            className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 shrink-0 text-[11px] ${
              showHeaderStamp ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
            title="Togol Cetakan Header Markah Rasmi"
          >
            Header Markah
          </button>
          <button
            onClick={() => setShowBoxes(!showBoxes)}
            className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 shrink-0 text-[11px] ${
              showBoxes ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
            title="Togol Grid Kotak Soalan"
          >
            Kotak Grid
          </button>
          <button
            onClick={() => setShowOfficialSeal(!showOfficialSeal)}
            className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 shrink-0 text-[11px] ${
              showOfficialSeal ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
            title="Togol Cop Rasmi Pemeriksa"
          >
            Cop Rasmi
          </button>
        </div>

        {/* Zoom & Action Buttons */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <div className="flex items-center bg-slate-800/80 rounded-lg border border-slate-700 p-0.5">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.2))}
              className="p-1.5 hover:bg-slate-700 text-slate-300 rounded"
              title="Zum Keluar"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[10px] font-mono text-slate-300">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
              className="p-1.5 hover:bg-slate-700 text-slate-300 rounded"
              title="Zum Masuk"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 hover:bg-slate-700 text-slate-400 rounded ml-0.5"
              title="Set Semula Zum"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] transition shadow-sm"
              title="Muat Turun Imej Kertas Berserta Anotasi Markah"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Muat Turun</span> PNG
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg font-semibold text-[11px] transition"
              title="Cetak Kertas Jawapan Bertanda"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Viewport - Touch Friendly */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-2 sm:p-4 flex items-center justify-center bg-radial from-slate-900 to-slate-950 relative min-h-[380px] sm:min-h-[500px]"
      >
        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
          }}
          className="shadow-2xl rounded-sm overflow-hidden border border-slate-700/60"
        >
          <canvas
            ref={canvasRef}
            className="max-w-full block bg-white cursor-crosshair"
            onClick={(e) => {
              if (!canvasRef.current || !onSelectQuestion) return;
              const rect = canvasRef.current.getBoundingClientRect();
              const clickYRel = (e.clientY - rect.top) / rect.height;
              // Find closest question based on Y
              const totalQ = gradingResult.analisis_detail.length;
              const questionsPerCol = Math.ceil(totalQ / (totalQ > 25 ? 2 : 1));
              const clickXRel = (e.clientX - rect.left) / rect.width;
              const isCol2 = totalQ > 25 && clickXRel > 0.5;
              const rowFrac = Math.max(0, Math.min(1, (clickYRel - 0.25) / 0.65));
              const rowIdx = Math.floor(rowFrac * questionsPerCol);
              const qNum = (isCol2 ? questionsPerCol : 0) + rowIdx + 1;
              if (qNum >= 1 && qNum <= totalQ) {
                onSelectQuestion(qNum);
              }
            }}
          />
        </div>
      </div>

      {/* Bottom Info Status bar - Mobile Responsive */}
      <div className="bg-slate-950 px-3 sm:px-4 py-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[10px] sm:text-[11px] text-slate-400">
        <div className="truncate">
          Calon:{' '}
          <span className="font-semibold text-slate-200">
            {gradingResult.ringkasan_keputusan.nama_pelajar}
          </span>{' '}
          | Markah:{' '}
          <span className="font-bold text-emerald-400">
            {gradingResult.ringkasan_keputusan.jumlah_markah} ({gradingResult.ringkasan_keputusan.peratusan})
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span> Betul: {gradingResult.ringkasan_keputusan.jawapan_betul}
          </span>
          <span className="flex items-center gap-1 text-rose-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span> Salah: {gradingResult.ringkasan_keputusan.jawapan_salah}
          </span>
          <span className="text-slate-500 hidden md:inline">| Klik soalan untuk sorotan</span>
        </div>
      </div>
    </div>
  );
};
