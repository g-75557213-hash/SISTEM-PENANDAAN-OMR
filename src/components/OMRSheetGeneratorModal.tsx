import React, { useRef, useState, useEffect } from 'react';
import { drawOMRSheetToCanvas, DrawOMROptions } from '../utils/omrCanvasDrawer';
import { Printer, Download, X, FileText, CheckCircle2, Sparkles, Layers, Sliders } from 'lucide-react';
import { AnswerKeyMap } from '../types';

interface OMRSheetGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadAsTestSheet?: (dataUrl: string, sampleTitle: string, qCount: number) => void;
  defaultAnswerKey?: AnswerKeyMap;
}

export const OMRSheetGeneratorModal: React.FC<OMRSheetGeneratorModalProps> = ({
  isOpen,
  onClose,
  onLoadAsTestSheet,
  defaultAnswerKey = {},
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Template settings based on user uploaded template
  const [subject, setSubject] = useState('SAINS');
  const [totalQuestions, setTotalQuestions] = useState<number>(20);
  const [questionsInput, setQuestionsInput] = useState<string>('20');
  const [optionsCount, setOptionsCount] = useState<4 | 5>(5);
  const [mode, setMode] = useState<'blank' | 'filled'>('blank');
  const [showCorrectionColumn, setShowCorrectionColumn] = useState(true);

  const handleQuestionsChange = (val: string) => {
    setQuestionsInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setTotalQuestions(parsed);
    }
  };

  const handleQuestionsBlur = () => {
    if (!questionsInput || parseInt(questionsInput, 10) < 1) {
      setQuestionsInput('20');
      setTotalQuestions(20);
    }
  };

  // Redraw whenever parameters change
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    let filledAnswers: Record<number, string> = {};
    let correctAnswers: Record<number, string> = {};
    let scoreText = '';

    const opts: Array<'A' | 'B' | 'C' | 'D' | 'E'> = optionsCount === 4 ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E'];

    if (mode === 'filled') {
      let correctCount = 0;
      for (let i = 1; i <= totalQuestions; i++) {
        const correctOpt = defaultAnswerKey[i] || opts[(i - 1) % opts.length];
        correctAnswers[i] = correctOpt;

        // Realistic student mistake simulation (approx 75% correct, 25% mistakes/blanks)
        const roll = Math.random();
        if (roll < 0.75) {
          filledAnswers[i] = correctOpt;
          correctCount++;
        } else if (roll < 0.90) {
          const wrongOpts = opts.filter((o) => o !== correctOpt);
          filledAnswers[i] = wrongOpts[Math.floor(Math.random() * wrongOpts.length)];
        } else {
          filledAnswers[i] = 'TIADA_JAWAPAN';
        }
      }

      const pct = ((correctCount / totalQuestions) * 100).toFixed(0);
      scoreText = `MARKAH: ${correctCount}/${totalQuestions} (${pct}%)`;
    }

    const drawOpts: DrawOMROptions = {
      studentName: mode === 'filled' ? 'AHMAD DANIAL BIN RAZAK' : '',
      studentClass: mode === 'filled' ? '5 CEMERLANG' : '',
      subject,
      sectionTitle: 'Bahagian A',
      totalQuestions,
      optionsCount,
      filledAnswers: mode === 'filled' ? filledAnswers : {},
      correctAnswers: mode === 'filled' ? correctAnswers : {},
      showCorrectionColumn,
      scoreText,
    };

    drawOMRSheetToCanvas(canvasRef.current, drawOpts);
  }, [
    isOpen,
    subject,
    totalQuestions,
    optionsCount,
    mode,
    showCorrectionColumn,
    defaultAnswerKey,
  ]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `Templat_OMR_A4_${subject}_${totalQuestions}Soalan.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handlePrint = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Templat OMR A4 - ${subject} (${totalQuestions} Soalan)</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
              background: #ffffff;
            }
            img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              display: block;
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleUseInApp = () => {
    if (!canvasRef.current || !onLoadAsTestSheet) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onLoadAsTestSheet(dataUrl, `Borang OMR ${subject}`, totalQuestions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden shadow-2xl shadow-indigo-950/60">
        {/* Header - Simple & Clean */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-indigo-500/20 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl shadow-md">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Jana Templat Kertas OMR A4
              </h2>
              <p className="text-[11px] text-slate-400">
                Format standard A4 berserta ruang semakan di sebelah
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Controls Form - Simple inputs without headache */}
          <div className="lg:col-span-5 flex flex-col gap-3.5 text-xs">
            {/* Input 1: Jumlah Soalan */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-indigo-500/20 flex flex-col gap-2">
              <label className="text-slate-200 font-bold flex items-center justify-between">
                <span>Jumlah Soalan:</span>
                <span className="text-purple-400 font-mono">
                  {questionsInput && parseInt(questionsInput, 10) > 0 ? `${questionsInput} Soalan` : 'Masukkan jumlah...'}
                </span>
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {[10, 20, 30, 40, 50, 60, 80].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setQuestionsInput(String(n));
                      setTotalQuestions(n);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                      totalQuestions === n
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-purple-500'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                max={100}
                value={questionsInput}
                onChange={(e) => handleQuestionsChange(e.target.value)}
                onBlur={handleQuestionsBlur}
                className="w-full px-3 py-2 bg-slate-900 border border-indigo-500/30 rounded-lg text-sm font-mono font-bold text-purple-400 focus:outline-none focus:border-purple-500"
                placeholder="Masukkan jumlah soalan, cth: 20 atau 40"
              />
              <p className="text-[10px] text-slate-500">
                Boleh dikosongkan untuk masukkan apa-apa jumlah soalan yang diingini. Susun atur lajur A4 diselaraskan secara automatik.
              </p>
            </div>

            {/* Input 2: Subjek */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-indigo-500/20 flex flex-col gap-1.5">
              <label className="text-slate-200 font-bold">Mata Pelajaran (Subjek):</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="cth: SAINS / MATEMATIK"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-slate-100 uppercase focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Input 3: Pilihan Huruf A-D vs A-E */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-indigo-500/20 flex flex-col gap-2">
              <label className="text-slate-200 font-bold">Pilihan Jawapan:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOptionsCount(5)}
                  className={`py-2 px-3 rounded-lg font-bold border transition text-center ${
                    optionsCount === 5
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-purple-500 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  5 Pilihan (A - E)
                </button>
                <button
                  type="button"
                  onClick={() => setOptionsCount(4)}
                  className={`py-2 px-3 rounded-lg font-bold border transition text-center ${
                    optionsCount === 4
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-purple-500 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  4 Pilihan (A - D)
                </button>
              </div>
            </div>

            {/* Input 4: Ruang Soalan Salah */}
            <div className="flex items-center justify-between p-3 bg-slate-950/80 rounded-xl border border-indigo-500/20">
              <span className="font-semibold text-slate-200">
                Ruang Semakan Soalan Salah di Sebelah
              </span>
              <input
                type="checkbox"
                checked={showCorrectionColumn}
                onChange={(e) => setShowCorrectionColumn(e.target.checked)}
                className="w-4 h-4 accent-purple-500 cursor-pointer"
              />
            </div>

            {/* Input 5: Mod Paparan */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('blank')}
                className={`py-2 px-3 rounded-xl font-bold border transition text-center ${
                  mode === 'blank'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-purple-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                Borang Kosong
              </button>
              <button
                type="button"
                onClick={() => setMode('filled')}
                className={`py-2 px-3 rounded-xl font-bold border transition text-center ${
                  mode === 'filled'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-purple-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                Contoh Disemak
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 mt-auto pt-2">
              {mode === 'filled' && onLoadAsTestSheet && (
                <button
                  type="button"
                  onClick={handleUseInApp}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-950 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Uji Lembaran Ini Terus
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white border border-indigo-500/30 rounded-xl font-bold flex items-center justify-center gap-2 transition"
                >
                  <Printer className="w-4 h-4 text-purple-400" />
                  Cetak A4
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white border border-indigo-500/30 rounded-xl font-bold flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4 text-indigo-400" />
                  Muat Turun PNG
                </button>
              </div>
            </div>
          </div>

          {/* Canvas A4 Live Preview */}
          <div className="lg:col-span-7 bg-slate-950 p-4 rounded-xl border border-indigo-500/20 flex flex-col items-center justify-center overflow-auto max-h-[640px]">
            <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center gap-2">
              <span>Nisbah Kertas A4</span>
              <span>&bull;</span>
              <span className="text-purple-400 font-bold">{totalQuestions} Soalan ({optionsCount} Pilihan)</span>
            </div>
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[580px] shadow-2xl border-2 border-slate-700 rounded bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
