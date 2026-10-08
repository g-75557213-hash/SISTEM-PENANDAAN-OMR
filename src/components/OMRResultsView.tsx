import React, { useState } from 'react';
import { OMRGradingResponse } from '../types';
import { OMRCanvasViewer } from './OMRCanvasViewer';
import { downloadStudentPDF } from '../utils/pdfExporter';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Code2,
  ListFilter,
  BarChart3,
  Copy,
  Check,
  Download,
  Award,
  Sparkles,
  Printer,
  FileText,
} from 'lucide-react';

interface OMRResultsViewProps {
  imageSrc: string;
  result: OMRGradingResponse;
}

export const OMRResultsView: React.FC<OMRResultsViewProps> = ({
  imageSrc,
  result,
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'table' | 'json' | 'analysis'>('visual');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'BETUL' | 'SALAH' | 'KOSONG' | 'DOUBLE_MARK'>('ALL');
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const { ringkasan_keputusan, analisis_detail, cetakan_header_markah, catatan_teknikal } = result;

  // Filtered detail list
  const filteredQuestions = analisis_detail.filter((item) => {
    if (filterStatus === 'ALL') return true;
    return item.status === filterStatus;
  });

  // Calculate statistics
  const countBetul = ringkasan_keputusan.jawapan_betul;
  const countSalah = analisis_detail.filter((i) => i.status === 'SALAH').length;
  const countKosong = analisis_detail.filter((i) => i.status === 'KOSONG').length;
  const countDouble = analisis_detail.filter((i) => i.status === 'DOUBLE_MARK').length;

  const isLulus = cetakan_header_markah.status_kelulusan === 'LULUS' || cetakan_header_markah.status_kelulusan === 'CEMERLANG';

  // Strict JSON payload requested by user
  const jsonOutput = JSON.stringify(
    {
      ringkasan_keputusan: {
        nama_pelajar: ringkasan_keputusan.nama_pelajar,
        jumlah_soalan: ringkasan_keputusan.jumlah_soalan,
        jawapan_betul: ringkasan_keputusan.jawapan_betul,
        jawapan_salah: ringkasan_keputusan.jawapan_salah,
        jumlah_markah: ringkasan_keputusan.jumlah_markah,
        peratusan: ringkasan_keputusan.peratusan,
      },
      analisis_detail: analisis_detail.map((q) => ({
        nombor_soalan: q.nombor_soalan,
        jawapan_pelajar: q.jawapan_pelajar,
        jawapan_sebenar: q.jawapan_sebenar,
        status: q.status,
        annotation: {
          simbol: q.annotation.simbol,
          warna: q.annotation.warna,
          teks_tambahan: q.annotation.teks_tambahan,
        },
      })),
      cetakan_header_markah: {
        posisi: cetakan_header_markah.posisi,
        teks_cetakan: cetakan_header_markah.teks_cetakan,
        status_kelulusan: cetakan_header_markah.status_kelulusan,
      },
    },
    null,
    2
  );

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonOutput);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OMR_Result_${ringkasan_keputusan.nama_pelajar.replace(/\s+/g, '_')}.json`;
    link.click();
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Summary Banner */}
      <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-6 shadow-xl shadow-indigo-950/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg border ${
                isLulus
                  ? 'bg-gradient-to-br from-blue-600/20 via-indigo-600/20 to-purple-600/20 text-purple-300 border-purple-500/40'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {isLulus ? <Award className="w-8 h-8 text-purple-400" /> : <AlertTriangle className="w-8 h-8" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                  Keputusan Pengecaman OMR Pintar
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isLulus
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-purple-300 border-purple-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {cetakan_header_markah.status_kelulusan}
                </span>
                {catatan_teknikal && (
                  <span className="text-[10px] bg-slate-800 text-purple-300 px-2 py-0.5 rounded border border-indigo-500/30">
                    {catatan_teknikal}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-white mt-1">
                {ringkasan_keputusan.nama_pelajar}
              </h1>
              <p className="text-xs text-purple-300/80 mt-0.5 font-mono">
                {cetakan_header_markah.teks_cetakan}
              </p>
            </div>
          </div>

          {/* Stat Badges - Responsive Grid on Mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:flex items-center gap-2 sm:gap-3 w-full md:w-auto">
            <div className="bg-slate-950/80 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-indigo-500/20 text-center">
              <span className="block text-[10px] font-semibold text-slate-400 uppercase">
                Markah
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-purple-400">
                {ringkasan_keputusan.jumlah_markah}
              </span>
            </div>

            <div className="bg-slate-950/80 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-indigo-500/20 text-center">
              <span className="block text-[10px] font-semibold text-slate-400 uppercase">
                Peratusan
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-cyan-400">
                {ringkasan_keputusan.peratusan}
              </span>
            </div>

            <div className="bg-slate-950/80 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-indigo-500/20 text-center">
              <span className="block text-[10px] font-semibold text-purple-400 uppercase flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Betul
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-purple-300">
                {countBetul}
              </span>
            </div>

            <div className="bg-slate-950/80 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-indigo-500/20 text-center">
              <span className="block text-[10px] font-semibold text-rose-400 uppercase flex items-center justify-center gap-1">
                <XCircle className="w-3 h-3" /> Salah
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-rose-300">
                {countSalah}
              </span>
            </div>

            {countKosong > 0 && (
              <div className="bg-slate-950/80 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-indigo-500/20 text-center">
                <span className="block text-[10px] font-semibold text-amber-400 uppercase flex items-center justify-center gap-1">
                  <HelpCircle className="w-3 h-3" /> Kosong
                </span>
                <span className="text-base sm:text-lg font-bold font-mono text-amber-300">
                  {countKosong}
                </span>
              </div>
            )}

            {countDouble > 0 && (
              <div className="bg-slate-950/80 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-indigo-500/20 text-center">
                <span className="block text-[10px] font-semibold text-orange-400 uppercase flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Dwi-Tanda
                </span>
                <span className="text-base sm:text-lg font-bold font-mono text-orange-300">
                  {countDouble}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation & PDF Actions - Mobile Organized */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-indigo-500/20 pb-2.5">
        {/* Scrollable Tab bar on Mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setActiveTab('visual')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'visual'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-950'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Penandaan Visual
          </button>

          <button
            onClick={() => setActiveTab('table')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'table'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-950'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            Jadual Soalan ({analisis_detail.length})
          </button>

          <button
            onClick={() => setActiveTab('json')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'json'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-950'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Format JSON
          </button>

          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'analysis'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-950'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Analisis Item
          </button>
        </div>

        {/* PDF Download Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => downloadStudentPDF(imageSrc, result, 'overlay_only')}
            className="flex-1 sm:flex-initial px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
            title="Hanya cetak tanda semak ✔ dan pangkah ✘ di atas kertas murid sedia ada tanpa bertindih garisan templat"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            PDF: Anotasi Sahaja
          </button>

          <button
            type="button"
            onClick={() => downloadStudentPDF(imageSrc, result, 'full')}
            className="flex-1 sm:flex-initial px-3.5 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950"
            title="Muat turun PDF kertas penuh bersama semua tandaan"
          >
            <Download className="w-3.5 h-3.5" />
            PDF: Kertas Penuh
          </button>
        </div>
      </div>

      {/* TAB 1: VISUAL MARKING OVERLAY */}
      {activeTab === 'visual' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          <div className="lg:col-span-8 h-[420px] sm:h-[540px] lg:h-[650px]">
            <OMRCanvasViewer
              imageSrc={imageSrc}
              gradingResult={result}
              highlightedQuestion={selectedQuestion}
              onSelectQuestion={(qNum) => setSelectedQuestion(qNum)}
            />
          </div>

          {/* Quick Sidebar for Questions */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col max-h-80 lg:max-h-none lg:h-[650px] shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-white">Senarai Soalan & Penandaan</span>
              <span className="text-[11px] text-slate-400">
                Klik mana-mana nombor untuk sorotan
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 py-2 space-y-1.5">
              {analisis_detail.map((q) => {
                const isSelected = selectedQuestion === q.nombor_soalan;
                return (
                  <button
                    key={q.nombor_soalan}
                    type="button"
                    onClick={() => setSelectedQuestion(q.nombor_soalan)}
                    className={`w-full text-left p-2.5 rounded-lg border transition flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 shadow-md'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-slate-400 w-6">
                        #{q.nombor_soalan < 10 ? `0${q.nombor_soalan}` : q.nombor_soalan}
                      </span>
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          q.status === 'BETUL'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : q.status === 'SALAH'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {q.annotation.simbol}
                      </span>
                      <span className="text-slate-300 font-medium">
                        Jawapan Murid:{' '}
                        <span className="font-mono font-bold text-white">
                          {q.jawapan_pelajar === 'TIADA_JAWAPAN'
                            ? 'KOSONG'
                            : q.jawapan_pelajar === 'AMBIGU/DOUBLE_MARK'
                            ? 'DWI-TANDA'
                            : q.jawapan_pelajar}
                        </span>
                      </span>
                    </div>

                    <div className="text-right">
                      {q.status === 'BETUL' ? (
                        <span className="text-emerald-400 font-semibold text-[11px]">BETUL</span>
                      ) : (
                        <span className="text-rose-400 font-semibold text-[11px] font-mono">
                          {q.annotation.teks_tambahan || `Betul: ${q.jawapan_sebenar}`}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TABLE VIEW */}
      {activeTab === 'table' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          {/* Filter Bar */}
          <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Tapis Status:</span>
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  filterStatus === 'ALL'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Semua ({analisis_detail.length})
              </button>
              <button
                onClick={() => setFilterStatus('BETUL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  filterStatus === 'BETUL'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
                }`}
              >
                Betul ({countBetul})
              </button>
              <button
                onClick={() => setFilterStatus('SALAH')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  filterStatus === 'SALAH'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 text-rose-400 hover:bg-slate-700'
                }`}
              >
                Salah ({countSalah})
              </button>
              {countKosong > 0 && (
                <button
                  onClick={() => setFilterStatus('KOSONG')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    filterStatus === 'KOSONG'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
                  }`}
                >
                  Kosong ({countKosong})
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">No. Soalan</th>
                  <th className="py-3 px-4">Jawapan Pelajar</th>
                  <th className="py-3 px-4">Skema Sebenar</th>
                  <th className="py-3 px-4">Status Semakan</th>
                  <th className="py-3 px-4">Anotasi Visual Cetakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredQuestions.map((q) => (
                  <tr key={q.nombor_soalan} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-slate-200">
                      Soalan {q.nombor_soalan}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold ${
                          q.status === 'BETUL'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {q.jawapan_pelajar}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">
                      {q.jawapan_sebenar}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          q.status === 'BETUL'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : q.status === 'SALAH'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {q.annotation.simbol} {q.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-sans">
                      {q.annotation.teks_tambahan ? (
                        <span className="text-rose-400 font-medium">
                          {q.annotation.teks_tambahan}
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium">✔ Ditanda pada imej</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STRICT MANDATORY JSON OUTPUT */}
      {activeTab === 'json' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Format JSON Respons Mandatori</h3>
                <p className="text-xs text-slate-400">
                  Data berstruktur tepat 100% menepati skema sistem OMR untuk pemprosesan API & cetakan automatik.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyJson}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
              >
                {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedJson ? 'Disalin ke Papan Keratan' : 'Salin JSON'}
              </button>
              <button
                onClick={handleDownloadJson}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition"
              >
                <Download className="w-3.5 h-3.5" />
                Muat Turun .json
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-950/90 overflow-x-auto">
            <pre className="font-mono text-xs text-emerald-300 leading-relaxed max-h-[500px] overflow-y-auto">
              {jsonOutput}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 4: ITEM ANALYSIS & DIAGNOSTICS */}
      {activeTab === 'analysis' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Question Breakdown by Options */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Taburan Pilihan Jawapan Murid (A, B, C, D)
            </h3>
            <div className="space-y-3">
              {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                const count = analisis_detail.filter((q) => q.jawapan_pelajar === opt).length;
                const pct = ((count / analisis_detail.length) * 100).toFixed(1);
                return (
                  <div key={opt}>
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="font-bold text-slate-200">Pilihan {opt}:</span>
                      <span className="text-slate-400">
                        {count} soalan ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hardest / Incorrect Questions */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Soalan Yang Perlu Ulang Kaji / Salah
            </h3>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {analisis_detail
                .filter((q) => q.status !== 'BETUL')
                .map((q) => (
                  <div
                    key={q.nombor_soalan}
                    className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <span className="font-mono font-bold text-slate-300">
                      Soalan #{q.nombor_soalan}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-rose-400 font-mono">
                        Murid: {q.jawapan_pelajar}
                      </span>
                      <span className="text-emerald-400 font-mono font-bold">
                        Skema: {q.jawapan_sebenar}
                      </span>
                    </div>
                  </div>
                ))}
              {analisis_detail.filter((q) => q.status !== 'BETUL').length === 0 && (
                <div className="text-center py-8 text-emerald-400 font-medium text-xs">
                  Tahniah! Tiada sebarang kesalahan dikesan (100% Betul).
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
