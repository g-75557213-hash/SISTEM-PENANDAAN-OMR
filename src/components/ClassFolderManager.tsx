import React, { useState } from 'react';
import { ClassFolder, StudentGradedRecord } from '../types';
import { downloadStudentPDF, downloadClassReportPDF } from '../utils/pdfExporter';
import {
  Folder,
  FolderPlus,
  FileText,
  Download,
  Printer,
  Users,
  Award,
  Calendar,
  Plus,
  Trash2,
  Eye,
  BookOpen,
  Filter,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';

interface ClassFolderManagerProps {
  classFolders: ClassFolder[];
  activeClassId: string;
  onSelectClass: (id: string) => void;
  onCreateClass: (className: string, subject: string, totalQuestions?: number) => void;
  onDeleteClass?: (id: string) => void;
  onDeleteStudentRecord?: (classId: string, recordId: string) => void;
  onViewStudentRecord: (record: StudentGradedRecord) => void;
  onScanNextForClass: (classFolder: ClassFolder) => void;
}

const COMMON_SUBJECTS = ['SAINS', 'MATEMATIK', 'SEJARAH', 'BAHASA MELAYU', 'BAHASA INGGERIS', 'GEOGRAFI', 'FIZIK', 'KIMIA', 'BIOLOGI'];

export const ClassFolderManager: React.FC<ClassFolderManagerProps> = ({
  classFolders,
  activeClassId,
  onSelectClass,
  onCreateClass,
  onDeleteClass,
  onDeleteStudentRecord,
  onViewStudentRecord,
  onScanNextForClass,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('SAINS');
  const [newTotalQuestions, setNewTotalQuestions] = useState<string>('20');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');

  // Extract all distinct subjects across teacher's folders
  const allSubjects = Array.from(
    new Set(classFolders.map((f) => f.subject.toUpperCase()))
  ).filter(Boolean);

  // Filter folders by subject
  const filteredFolders = classFolders.filter((f) => {
    if (selectedSubjectFilter === 'ALL') return true;
    return f.subject.toUpperCase() === selectedSubjectFilter;
  });

  const currentFolder = classFolders.find((f) => f.id === activeClassId) || filteredFolders[0] || null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const parsedQ = parseInt(newTotalQuestions, 10);
    const qCount = !isNaN(parsedQ) && parsedQ > 0 ? parsedQ : 20;
    onCreateClass(newClassName.trim(), newSubjectName.trim().toUpperCase(), qCount);
    setNewClassName('');
    setNewTotalQuestions('20');
    setShowCreateModal(false);
  };

  // Compute folder metrics
  const records = currentFolder?.records || [];
  const totalStudents = records.length;
  let totalScorePct = 0;
  let passedCount = 0;

  records.forEach((r) => {
    const pct = parseFloat(r.gradingResult.ringkasan_keputusan.peratusan.replace('%', '')) || 0;
    totalScorePct += pct;
    if (
      r.gradingResult.cetakan_header_markah.status_kelulusan === 'LULUS' ||
      r.gradingResult.cetakan_header_markah.status_kelulusan === 'CEMERLANG'
    ) {
      passedCount++;
    }
  });

  const avgScore = totalStudents > 0 ? (totalScorePct / totalStudents).toFixed(1) : '0';
  const passRate = totalStudents > 0 ? ((passedCount / totalStudents) * 100).toFixed(1) : '0';

  return (
    <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl overflow-hidden shadow-xl shadow-indigo-950/40 flex flex-col">
      {/* Top Header & Subject Filter Bar */}
      <div className="p-3 sm:p-4 bg-slate-950/90 border-b border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Subject Filter Pills - Smooth Horizontal Scroll on Mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full sm:w-auto">
          <span className="text-[11px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-purple-400" /> Subjek:
          </span>
          <button
            type="button"
            onClick={() => setSelectedSubjectFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 ${
              selectedSubjectFilter === 'ALL'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-indigo-950'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Semua ({classFolders.length})
          </button>
          {allSubjects.map((sub) => {
            const count = classFolders.filter((f) => f.subject.toUpperCase() === sub).length;
            return (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubjectFilter(sub)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 ${
                  selectedSubjectFilter === sub
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-indigo-950'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {sub} ({count})
              </button>
            );
          })}
        </div>

        {/* Action: Add new class & PDF Class report */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex-1 sm:flex-initial px-3.5 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            + Cipta Kelas
          </button>

          {currentFolder && records.length > 0 && (
            <button
              type="button"
              onClick={() => downloadClassReportPDF(currentFolder)}
              className="flex-1 sm:flex-initial px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-indigo-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              title="Muat turun PDF laporan kelas"
            >
              <Download className="w-3.5 h-3.5 text-purple-400" />
              Laporan PDF
            </button>
          )}
        </div>
      </div>

      {/* Class Selector Tabs (if classes exist) */}
      {filteredFolders.length > 0 && (
        <div className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-slate-950/70 border-b border-indigo-500/20 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Kelas:
          </span>
          {filteredFolders.map((folder) => {
            const isActive = currentFolder?.id === folder.id;
            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => onSelectClass(folder.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 border ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-purple-900/40 text-white border-purple-500 shadow-md shadow-indigo-950'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <FolderOpen className={`w-3.5 h-3.5 ${isActive ? 'text-purple-400' : 'text-slate-500'}`} />
                <span>{folder.className}</span>
                <span className="text-[10px] text-purple-300/80 font-mono font-normal">
                  ({folder.subject})
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {folder.records.length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Zero State if no classes exist yet */}
      {classFolders.length === 0 ? (
        <div className="text-center py-16 px-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-3 text-purple-400">
            <Folder className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            Tiada Kelas
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">
            Sila cipta kelas untuk mula menyimpan dan mengasingkan kertas murid mengikut subjek.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-2 shadow-lg shadow-indigo-950"
          >
            <FolderPlus className="w-4 h-4" />
            + Cipta Kelas Baru
          </button>
        </div>
      ) : currentFolder ? (
        <>
          {/* Active Class Info & Stats Bar - Mobile Responsive */}
          <div className="p-3.5 sm:p-5 border-b border-indigo-500/20 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {currentFolder.className}
                </h3>
                <span className="text-[10px] font-mono bg-purple-500/15 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 font-bold uppercase">
                  Subjek: {currentFolder.subject}
                </span>
                {currentFolder.totalQuestions && (
                  <span className="text-[10px] font-mono bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 font-bold">
                    {currentFolder.totalQuestions} Soalan
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 font-mono">
                {currentFolder.examTitle} &bull; Tarikh: {currentFolder.createdAt}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
              {/* 3 Metrics in Neat Grid on Mobile */}
              <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                <div className="bg-slate-950 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-indigo-500/20 text-center">
                  <span className="block text-[9px] sm:text-[10px] text-slate-400 font-semibold uppercase">Murid</span>
                  <span className="text-sm sm:text-base font-bold font-mono text-white">{totalStudents}</span>
                </div>
                <div className="bg-slate-950 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-indigo-500/20 text-center">
                  <span className="block text-[9px] sm:text-[10px] text-slate-400 font-semibold uppercase">Purata</span>
                  <span className="text-sm sm:text-base font-bold font-mono text-purple-400">{avgScore}%</span>
                </div>
                <div className="bg-slate-950 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-indigo-500/20 text-center">
                  <span className="block text-[9px] sm:text-[10px] text-slate-400 font-semibold uppercase">Lulus</span>
                  <span className="text-sm sm:text-base font-bold font-mono text-cyan-400">{passRate}%</span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => onScanNextForClass(currentFolder)}
                  className="flex-1 sm:flex-initial py-2 px-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Imbas Murid Baharu</span>
                </button>

                {onDeleteClass && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Adakah anda pasti mahu memadam folder kelas "${currentFolder.className}"?`)) {
                        onDeleteClass(currentFolder.id);
                      }
                    }}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition shrink-0"
                    title="Padam Kelas Ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Student Submissions List - Responsive Cards on Mobile, Table on Desktop */}
          <div className="p-3 sm:p-5">
            {records.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-300">Belum ada murid diimbas dalam kelas ini.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Klik butang 'Imbas Murid Baharu' untuk mengimbas dan mengumpulkan kertas murid.
                </p>
                <button
                  type="button"
                  onClick={() => onScanNextForClass(currentFolder)}
                  className="mt-3 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-md shadow-indigo-950"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Mula Imbas Murid
                </button>
              </div>
            ) : (
              <>
                {/* 1. Mobile-First Card View (< sm screens) */}
                <div className="sm:hidden flex flex-col gap-2.5">
                  {records.map((rec, idx) => {
                    const summary = rec.gradingResult.ringkasan_keputusan;
                    const header = rec.gradingResult.cetakan_header_markah;
                    const isPass = header.status_kelulusan === 'LULUS' || header.status_kelulusan === 'CEMERLANG';

                    return (
                      <div
                        key={rec.id}
                        className="bg-slate-950/80 border border-indigo-500/20 rounded-xl p-3 flex flex-col gap-2.5 shadow-sm"
                      >
                        {/* Student Name & Status Banner */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-purple-300 text-[10px] font-mono flex items-center justify-center shrink-0 border border-indigo-500/30">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-white truncate font-sans">
                              {rec.studentName}
                            </span>
                          </div>
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-bold ${
                              isPass
                                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {header.status_kelulusan}
                          </span>
                        </div>

                        {/* Scores & Time Grid */}
                        <div className="grid grid-cols-3 gap-1.5 bg-slate-900/60 p-2 rounded-lg border border-indigo-500/20 text-center font-mono">
                          <div>
                            <span className="block text-[8px] uppercase text-slate-500 font-sans">Markah</span>
                            <span className="text-xs font-bold text-purple-400">{summary.jumlah_markah}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] uppercase text-slate-500 font-sans">Peratus</span>
                            <span className="text-xs font-bold text-cyan-300">{summary.peratusan}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] uppercase text-slate-500 font-sans">Masa</span>
                            <span className="text-[10px] text-slate-400">{rec.timestamp}</span>
                          </div>
                        </div>

                        {/* Mobile Actions Toolbar */}
                        <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-850">
                          <button
                            type="button"
                            onClick={() => onViewStudentRecord(rec)}
                            className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 border border-slate-700"
                          >
                            <Eye className="w-3 h-3 text-blue-400" />
                            <span>Lihat</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => downloadStudentPDF(rec.imageSrc, rec.gradingResult, 'overlay_only')}
                            className="flex-1 py-1.5 px-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1"
                            title="Hanya cetak tanda semak ✔ & pangkah ✘ di atas kertas murid"
                          >
                            <Printer className="w-3 h-3 text-amber-400" />
                            <span>Anotasi</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => downloadStudentPDF(rec.imageSrc, rec.gradingResult, 'full')}
                            className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-indigo-500/30 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1"
                            title="Muat turun PDF Kertas Penuh"
                          >
                            <Download className="w-3 h-3 text-purple-400" />
                            <span>Penuh</span>
                          </button>

                          {onDeleteStudentRecord && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Padam rekod ${rec.studentName}?`)) {
                                  onDeleteStudentRecord(currentFolder.id, rec.id);
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition"
                              title="Padam rekod murid"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. Desktop Table View (>= sm screens) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold text-[11px] border-b border-indigo-500/20">
                      <tr>
                        <th className="py-2.5 px-3">No</th>
                        <th className="py-2.5 px-3">Nama Calon</th>
                        <th className="py-2.5 px-3">Markah</th>
                        <th className="py-2.5 px-3">Peratus</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Masa</th>
                        <th className="py-2.5 px-3 text-right">Tindakan PDF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {records.map((rec, idx) => {
                        const summary = rec.gradingResult.ringkasan_keputusan;
                        const header = rec.gradingResult.cetakan_header_markah;
                        const isPass = header.status_kelulusan === 'LULUS' || header.status_kelulusan === 'CEMERLANG';

                        return (
                          <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-100 font-sans">
                              {rec.studentName}
                            </td>
                            <td className="py-2.5 px-3 text-purple-400 font-bold">
                              {summary.jumlah_markah}
                            </td>
                            <td className="py-2.5 px-3 text-cyan-300 font-bold">
                              {summary.peratusan}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isPass
                                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {header.status_kelulusan}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 text-[11px] font-sans">
                              {rec.timestamp}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5 font-sans">
                                {/* View Marked Canvas */}
                                <button
                                  type="button"
                                  onClick={() => onViewStudentRecord(rec)}
                                  className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                                  title="Lihat Lembaran Penandaan Calon"
                                >
                                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                                </button>

                                {/* PDF Anotasi Sahaja */}
                                <button
                                  type="button"
                                  onClick={() => downloadStudentPDF(rec.imageSrc, rec.gradingResult, 'overlay_only')}
                                  className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                                  title="Hanya cetak tanda semak ✔ & pangkah ✘ di atas kertas asal tanpa bertindih templat"
                                >
                                  <Printer className="w-3 h-3 text-amber-400" />
                                  Anotasi Sahaja (PDF)
                                </button>

                                {/* Full PDF */}
                                <button
                                  type="button"
                                  onClick={() => downloadStudentPDF(rec.imageSrc, rec.gradingResult, 'full')}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                                  title="Muat turun PDF Kertas Penuh"
                                >
                                  <Download className="w-3 h-3 text-emerald-400" />
                                  Kertas Penuh
                                </button>

                                {/* Delete Student Record */}
                                {onDeleteStudentRecord && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Padam rekod ${rec.studentName}?`)) {
                                        onDeleteStudentRecord(currentFolder.id, rec.id);
                                      }
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition"
                                    title="Padam rekod murid"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      ) : null}

      {/* Modal Cipta Kelas Baharu */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl w-full max-w-md p-5 shadow-2xl shadow-indigo-950">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
              <FolderPlus className="w-5 h-5 text-purple-400" />
              Cipta Folder Kelas Baru
            </h3>
            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Nama Kelas:</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="cth: 5 Dedikasi / 4 Sains 1"
                  className="w-full px-3 py-2 bg-slate-950 border border-indigo-500/30 rounded-lg text-slate-200 uppercase font-bold focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Mata Pelajaran (Subjek):</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {COMMON_SUBJECTS.slice(0, 5).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNewSubjectName(s)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                        newSubjectName === s
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-purple-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="cth: SAINS / MATEMATIK"
                  className="w-full px-3 py-2 bg-slate-950 border border-indigo-500/30 rounded-lg text-slate-200 uppercase font-bold focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Jumlah Soalan Ujian:</label>
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  {[10, 20, 30, 40, 50, 60, 80].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNewTotalQuestions(String(n))}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                        newTotalQuestions === String(n)
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-purple-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
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
                  value={newTotalQuestions}
                  onChange={(e) => setNewTotalQuestions(e.target.value)}
                  onBlur={() => {
                    if (!newTotalQuestions || parseInt(newTotalQuestions, 10) < 1) {
                      setNewTotalQuestions('20');
                    }
                  }}
                  placeholder="Masukkan jumlah soalan, cth: 20, 40, 50"
                  className="w-full px-3 py-2 bg-slate-950 border border-indigo-500/30 rounded-lg text-purple-400 font-mono font-bold focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white rounded-lg font-bold shadow-md shadow-indigo-950"
                >
                  Cipta Folder Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
