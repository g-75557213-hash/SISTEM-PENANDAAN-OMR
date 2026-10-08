import React, { useState } from 'react';
import { AnswerKeyMap } from '../types';
import { KeyRound, Copy, Check, UploadCloud, Save, CheckCircle2 } from 'lucide-react';

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
  onSave?: (savedKey: AnswerKeyMap) => void;
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
  onSave,
}) => {
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(() => {
    return localStorage.getItem('omr_last_saved_skema_time') || null;
  });
  const [questionsInput, setQuestionsInput] = useState<string>(String(totalQuestions));

  React.useEffect(() => {
    setQuestionsInput(String(totalQuestions));
  }, [totalQuestions]);

  const options: Array<'A' | 'B' | 'C' | 'D' | 'E'> =
    optionsCount === 4 ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E'];

  const setQuestionAnswer = (qNum: number, ans: 'A' | 'B' | 'C' | 'D' | 'E') => {
    onChangeAnswerKey({
      ...answerKey,
      [qNum]: ans,
    });
  };

  const handleSave = () => {
    try {
      localStorage.setItem('omr_saved_answer_key', JSON.stringify(answerKey));
      localStorage.setItem('omr_saved_exam_title', examTitle);
      localStorage.setItem('omr_saved_total_questions', String(totalQuestions));
      localStorage.setItem('omr_saved_options_count', String(optionsCount));
      localStorage.setItem('omr_saved_passing_pct', String(passingPercentage));
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      localStorage.setItem('omr_last_saved_skema_time', timeStr);
      setLastSavedTime(timeStr);
    } catch (err) {
      console.warn('Gagal menyimpan skema ke localStorage:', err);
    }

    if (onSave) {
      onSave(answerKey);
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2500);
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
    <div className="bg-slate-900/90 border border-indigo-500/30 rounded-xl p-4 sm:p-5 shadow-lg shadow-indigo-950/40 flex flex-col gap-4 text-slate-200">
      {/* Title & Top Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-indigo-500/20">
        <div className="flex items-center gap-2">
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-purple-400" />
            Skema Jawapan
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-950/70 border border-purple-500/40 text-purple-300">
            {totalQuestions} Soalan ({optionsCount === 5 ? 'A-E' : 'A-D'})
          </span>
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
            title="Tampal teks jawapan"
          >
            <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tampal</span>
          </button>

          <button
            onClick={handleCopyText}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium border border-indigo-500/30 transition flex items-center gap-1"
            title="Salin skema jawapan"
          >
            {copySuccess ? <Check className="w-3.5 h-3.5 text-purple-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copySuccess ? 'Disalin' : 'Salin'}</span>
          </button>

          {/* Top Save Button */}
          <button
            type="button"
            onClick={handleSave}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border shadow-sm active:scale-95 ${
              saveSuccess
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-purple-500/40 shadow-indigo-950/40'
            }`}
            title="Simpan Skema Jawapan"
          >
            {saveSuccess ? <Check className="w-3.5 h-3.5 text-white" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saveSuccess ? 'Disimpan!' : 'Save Skema'}</span>
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
          <div className="flex gap-1 mb-1.5 flex-wrap">
            {[10, 20, 30, 40, 50, 60, 80].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setQuestionsInput(String(n));
                  onChangeTotalQuestions(n);
                  const updated: AnswerKeyMap = { ...answerKey };
                  for (let i = 1; i <= n; i++) {
                    if (!updated[i]) updated[i] = options[(i - 1) % options.length];
                  }
                  onChangeAnswerKey(updated);
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
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
            onChange={(e) => {
              const val = e.target.value;
              setQuestionsInput(val);
              if (val !== '') {
                const parsed = parseInt(val, 10);
                if (!isNaN(parsed) && parsed > 0) {
                  onChangeTotalQuestions(parsed);
                  const updated: AnswerKeyMap = { ...answerKey };
                  for (let i = 1; i <= parsed; i++) {
                    if (!updated[i]) updated[i] = options[(i - 1) % options.length];
                  }
                  onChangeAnswerKey(updated);
                }
              }
            }}
            onBlur={() => {
              if (!questionsInput || parseInt(questionsInput, 10) < 1) {
                setQuestionsInput(String(totalQuestions || 20));
                onChangeTotalQuestions(totalQuestions || 20);
              }
            }}
            className="w-full px-2.5 py-1.5 bg-slate-900 border border-indigo-500/30 rounded text-xs text-purple-400 font-mono font-bold focus:outline-none focus:border-purple-500"
            placeholder="cth: 20 atau 40"
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

      {/* Vertical Answer Key List */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-1 text-xs text-slate-400 font-medium">
          <span>Senarai Skema Jawapan (Vertical)</span>
          <span className="text-[11px] text-slate-500">Pilih jawapan betul untuk setiap soalan</span>
        </div>

        <div className="max-h-[440px] overflow-y-auto pr-1 flex flex-col gap-2 rounded-lg">
          {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((qNum) => {
            const currentAns = answerKey[qNum] || 'A';
            return (
              <div
                key={qNum}
                className="bg-slate-950/80 hover:bg-slate-950/95 border border-indigo-500/20 hover:border-indigo-500/40 p-2.5 sm:p-3 rounded-xl flex items-center justify-between gap-3 shadow-sm transition"
              >
                {/* Question Info */}
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center font-mono text-xs font-bold text-indigo-300 shrink-0">
                    {qNum < 10 ? `0${qNum}` : qNum}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs sm:text-sm font-bold text-white">
                      Soalan {qNum}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Jawapan Betul:{' '}
                      <span className="inline-block px-1.5 py-0.2 rounded font-mono font-black text-xs text-purple-300 bg-purple-950/60 border border-purple-500/30">
                        {currentAns}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Option Buttons (A, B, C, D, E) */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {options.map((opt) => {
                    const isSelected = currentAns === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setQuestionAnswer(qNum, opt)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs font-bold transition flex items-center justify-center active:scale-90 ${
                          isSelected
                            ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-black shadow-md shadow-indigo-950 ring-2 ring-purple-400/90 scale-105'
                            : 'bg-slate-900 border border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                        title={`Pilih jawapan ${opt} untuk soalan ${qNum}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Save Bar */}
      <div className="pt-3 border-t border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          {lastSavedTime ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Tersimpan pada {lastSavedTime}
            </span>
          ) : (
            <span className="text-slate-400">Tekan butang save untuk menyimpan skema jawapan yang betul.</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 ${
            saveSuccess
              ? 'bg-emerald-600 text-white shadow-emerald-950/50'
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-indigo-950/60'
          }`}
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>Skema Berjaya Disimpan!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Skema Jawapan</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
