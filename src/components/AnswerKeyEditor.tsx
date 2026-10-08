import React, { useState } from 'react';
import { AnswerKeyMap } from '../types';
import { KeyRound, Sparkles, Copy, Check, UploadCloud } from 'lucide-react';

interface AnswerKeyEditorProps {
  answerKey: AnswerKeyMap;
  onChangeAnswerKey: (newKey: AnswerKeyMap) => void;
  totalQuestions: number;
  onChangeTotalQuestions: (count: number) => void;
  passingPercentage: number;
  onChangePassingPercentage: (pct: number) => void;
  examTitle: string;
  onChangeExamTitle: (title: string) => void;
  optionsCount?: 4 | 5;
  onChangeOptionsCount?: (count: 4 | 5) => void;
}

export const AnswerKeyEditor: React.FC<AnswerKeyEditorProps> = ({
  answerKey,
  onChangeAnswerKey,
  totalQuestions,
  onChangeTotalQuestions,
  passingPercentage,
  onChangePassingPercentage,
  examTitle,
  onChangeExamTitle,
  optionsCount = 5,
  onChangeOptionsCount,
}) => {
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const options: Array<'A' | 'B' | 'C' | 'D' | 'E'> =
    optionsCount === 4 ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E'];

  const setQuestionAnswer = (qNum: number, ans: 'A' | 'B' | 'C' | 'D' | 'E') => {
    onChangeAnswerKey({
      ...answerKey,
      [qNum]: ans,
    });
  };

  // Quick patterns
  const applyPattern = (type: 'random' | 'sequence' | 'all-a') => {
    const newKey: AnswerKeyMap = {};
    for (let i = 1; i <= totalQuestions; i++) {
      if (type === 'random') {
        newKey[i] = options[Math.floor(Math.random() * options.length)];
      } else if (type === 'sequence') {
        newKey[i] = options[(i - 1) % options.length];
      } else if (type === 'all-a') {
        newKey[i] = 'A';
      }
    }
    onChangeAnswerKey(newKey);
  };

  // Import from text e.g. "1:A, 2:C, 3:E" or "A B C D E"
  const handleImportText = () => {
    if (!textInput.trim()) return;
    const newKey: AnswerKeyMap = { ...answerKey };

    const pairs = textInput.match(/(\d+)[:\s=-]+([A-Ea-e])/g);
    if (pairs && pairs.length > 0) {
      pairs.forEach((p) => {
        const match = p.match(/(\d+)[:\s=-]+([A-Ea-e])/);
        if (match) {
          const q = parseInt(match[1], 10);
          const ans = match[2].toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E';
          if (q >= 1 && q <= totalQuestions) {
            newKey[q] = ans;
          }
        }
      });
    } else {
      const letters = textInput.match(/[A-Ea-e]/g);
      if (letters) {
        letters.slice(0, totalQuestions).forEach((l, idx) => {
          newKey[idx + 1] = l.toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E';
        });
      }
    }

    onChangeAnswerKey(newKey);
    setShowTextInput(false);
    setTextInput('');
  };

  const handleCopyText = () => {
    const formatted = Object.entries(answerKey)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([q, ans]) => `${q}:${ans}`)
      .join(', ');
    navigator.clipboard.writeText(formatted);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="bg-slate-900/90 border border-indigo-500/30 rounded-xl p-5 shadow-lg shadow-indigo-950/40 flex flex-col gap-4 text-slate-200">
      {/* Title & Top Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-indigo-500/20">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-purple-400" />
            Skema Jawapan
          </h2>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          {onChangeOptionsCount && (
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-indigo-500/30 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => onChangeOptionsCount(5)}
                className={`px-2 py-1 rounded transition ${
                  optionsCount === 5 ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="5 Pilihan (A-E)"
              >
                A-E
              </button>
              <button
                type="button"
                onClick={() => onChangeOptionsCount(4)}
                className={`px-2 py-1 rounded transition ${
                  optionsCount === 4 ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="4 Pilihan (A-D)"
              >
                A-D
              </button>
            </div>
          )}

          <button
            onClick={() => setShowTextInput(!showTextInput)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium border border-indigo-500/30 transition flex items-center gap-1"
          >
            <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tampal</span>
          </button>
          <button
            onClick={handleCopyText}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium border border-indigo-500/30 transition flex items-center gap-1"
          >
            {copySuccess ? <Check className="w-3.5 h-3.5 text-purple-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copySuccess ? 'Disalin' : 'Salin'}</span>
          </button>
        </div>
      </div>

      {/* Test Parameters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/70 p-3 rounded-lg border border-indigo-500/20">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Tajuk Ujian / Subjek:
          </label>
          <input
            type="text"
            value={examTitle}
            onChange={(e) => onChangeExamTitle(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 font-bold focus:outline-none focus:border-purple-500"
            placeholder="cth: Sains"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Jumlah Soalan:
          </label>
          <input
            type="number"
            min={1}
            max={80}
            value={totalQuestions}
            onChange={(e) => {
              const val = Math.max(1, Math.min(80, Number(e.target.value) || 1));
              onChangeTotalQuestions(val);
              const updated: AnswerKeyMap = { ...answerKey };
              for (let i = 1; i <= val; i++) {
                if (!updated[i]) updated[i] = options[(i - 1) % options.length];
              }
              onChangeAnswerKey(updated);
            }}
            className="w-full px-2.5 py-1.5 bg-slate-900 border border-indigo-500/30 rounded text-xs text-purple-400 font-mono font-bold focus:outline-none focus:border-purple-500"
            placeholder="cth: 20"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Kelulusan: {passingPercentage}%
          </label>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="range"
              min={20}
              max={80}
              step={5}
              value={passingPercentage}
              onChange={(e) => onChangePassingPercentage(Number(e.target.value))}
              className="flex-1 accent-purple-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Text Import Dropdown Panel */}
      {showTextInput && (
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-700 flex flex-col gap-2">
          <label className="text-xs text-slate-300 font-medium">
            Tampal skema jawapan teks (cth: <span className="font-mono text-emerald-400">1:A, 2:C, 3:E</span> atau <span className="font-mono text-emerald-400">A B C D E</span>):
          </label>
          <textarea
            rows={2}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="1:A, 2:C, 3:B, 4:D, 5:E ..."
            className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowTextInput(false)}
              className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
            >
              Batal
            </button>
            <button
              onClick={handleImportText}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium"
            >
              Guna Skema Ini
            </button>
          </div>
        </div>
      )}

      {/* Quick Pattern Buttons */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Corak Pantas:
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => applyPattern('sequence')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs border border-slate-700 transition"
          >
            {optionsCount === 5 ? 'A-B-C-D-E Berurutan' : 'A-B-C-D Selang Seli'}
          </button>
          <button
            onClick={() => applyPattern('random')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs border border-slate-700 transition"
          >
            Rawak Realistik
          </button>
          <button
            onClick={() => applyPattern('all-a')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs border border-slate-700 transition"
          >
            Set Semua A
          </button>
        </div>
      </div>

      {/* Grid of Questions - 2 columns on mobile, up to 5 on large */}
      <div className="max-h-72 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-2">
          {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((qNum) => {
            const currentAns = answerKey[qNum] || 'A';
            return (
              <div
                key={qNum}
                className="bg-slate-950/80 p-2 sm:p-2 rounded-xl sm:rounded border border-indigo-500/20 flex items-center justify-between shadow-sm"
              >
                <span className="font-mono text-[11px] sm:text-xs font-bold text-purple-300 w-6 sm:w-7">
                  #{qNum < 10 ? `0${qNum}` : qNum}
                </span>
                <div className="flex items-center gap-0.5">
                  {options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setQuestionAnswer(qNum, opt)}
                      className={`w-5.5 h-5.5 sm:w-5 sm:h-5 rounded-full text-[11px] sm:text-[10px] font-bold transition flex items-center justify-center active:scale-90 ${
                        currentAns === opt
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black shadow-md shadow-indigo-950 scale-105'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
