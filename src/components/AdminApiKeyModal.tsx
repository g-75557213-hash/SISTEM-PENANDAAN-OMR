import React, { useState, useEffect } from 'react';
import { AdminApiKey, TeacherAccountAdminItem } from '../types';
import {
  Key,
  KeyRound,
  ShieldCheck,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Copy,
  Check,
  Server,
  Layers,
  Sparkles,
  X,
  HelpCircle,
  ExternalLink,
  Users,
  Search,
  Lock,
  Unlock,
  School,
  User,
  AlertCircle,
  Eye,
  EyeOff,
  FolderOpen,
  FileCheck,
} from 'lucide-react';
import { getTeacherAvatarSvg, TEACHER_AVATAR_PRESETS } from '../utils/avatarUtils';

interface AdminApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'teachers' | 'keys';
}

const ADMIN_REQUIRED_PASSWORD = 'KEA8019';

export const AdminApiKeyModal: React.FC<AdminApiKeyModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'teachers',
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('omr_admin_session') === ADMIN_REQUIRED_PASSWORD;
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  // Active Admin Tab: 'teachers' | 'keys'
  const [activeTab, setActiveTab] = useState<'teachers' | 'keys'>(defaultTab);

  // Teachers State
  const [teachersList, setTeachersList] = useState<TeacherAccountAdminItem[]>([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherAccountAdminItem | null>(null);

  // Manual Teacher Creation by Admin
  const [isCreatingTeacher, setIsCreatingTeacher] = useState(false);
  const [newAdminCode, setNewAdminCode] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminSchool, setNewAdminSchool] = useState('SMK JENERI');
  const [createTeacherError, setCreateTeacherError] = useState<string | null>(null);
  const [isSubmittingTeacher, setIsSubmittingTeacher] = useState(false);

  // API Keys State
  const [keysList, setKeysList] = useState<AdminApiKey[]>([]);
  const [rawInput, setRawInput] = useState('');
  const [inputLabel, setInputLabel] = useState('');
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [envKeyCount, setEnvKeyCount] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      const stored = sessionStorage.getItem('omr_admin_session');
      if (stored === ADMIN_REQUIRED_PASSWORD) {
        setIsAuthenticated(true);
        fetchTeachers();
        fetchKeys();
      } else {
        setIsAuthenticated(false);
        setPasswordInput('');
        setPasswordError(null);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      if (activeTab === 'teachers') {
        fetchTeachers();
      } else {
        fetchKeys();
      }
    }
  }, [isOpen, isAuthenticated, activeTab]);

  // Handle password submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    const trimmed = passwordInput.trim();
    if (!trimmed) {
      setPasswordError('Sila masukkan kata laluan pentadbir.');
      return;
    }

    setIsVerifyingPassword(true);
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmed }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        sessionStorage.setItem('omr_admin_session', ADMIN_REQUIRED_PASSWORD);
        setIsAuthenticated(true);
        setPasswordInput('');
        fetchTeachers();
        fetchKeys();
      } else {
        setPasswordError(
          data.error || 'Kata laluan salah! Akses ditolak. Sila masukkan kata laluan "KEA8019".'
        );
      }
    } catch {
      if (trimmed === ADMIN_REQUIRED_PASSWORD) {
        sessionStorage.setItem('omr_admin_session', ADMIN_REQUIRED_PASSWORD);
        setIsAuthenticated(true);
        setPasswordInput('');
        fetchTeachers();
        fetchKeys();
      } else {
        setPasswordError('Kata laluan salah! Sila masukkan kata laluan "KEA8019".');
      }
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  // Lock admin session
  const handleLockAdmin = () => {
    sessionStorage.removeItem('omr_admin_session');
    setIsAuthenticated(false);
    setPasswordInput('');
    setPasswordError(null);
  };

  // Fetch Teachers
  const fetchTeachers = async () => {
    setIsLoadingTeachers(true);
    try {
      const res = await fetch('/api/admin/teachers', {
        headers: { 'x-admin-password': ADMIN_REQUIRED_PASSWORD },
      });
      if (res.ok) {
        const data = await res.json();
        setTeachersList(data.teachers || []);
      }
    } catch (e) {
      console.warn('Gagal memuat senarai guru dari pelayan:', e);
    } finally {
      setIsLoadingTeachers(false);
    }
  };

  // Delete Teacher (Admin Only)
  const handleDeleteTeacherConfirmed = async () => {
    if (!teacherToDelete) return;
    const code = teacherToDelete.accessCode;
    setDeletingCode(code);
    try {
      const res = await fetch(`/api/admin/teachers/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': ADMIN_REQUIRED_PASSWORD },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTeachersList((prev) => prev.filter((t) => t.accessCode.toUpperCase() !== code.toUpperCase()));
        setFeedbackMessage({
          type: 'success',
          text: `Akaun "${teacherToDelete.name}" (Kod: ${code}) berjaya dipadam dari sistem.`,
        });
      } else {
        setFeedbackMessage({
          type: 'error',
          text: data.error || 'Gagal memadam akaun guru.',
        });
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Ralat sambungan semasa memadam akaun.' });
    } finally {
      setDeletingCode(null);
      setTeacherToDelete(null);
    }
  };

  // Create Teacher by Admin
  const handleCreateTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateTeacherError(null);

    const cleanCode = newAdminCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    const cleanName = newAdminName.trim();
    const cleanSchool = newAdminSchool.trim() || 'SMK JENERI';

    if (!cleanCode || cleanCode.length < 3) {
      setCreateTeacherError('Kod Akses mestilah sekurang-kurangnya 3 huruf atau nombor.');
      return;
    }
    if (!cleanName) {
      setCreateTeacherError('Sila masukkan nama guru.');
      return;
    }

    setIsSubmittingTeacher(true);
    try {
      const avatarUrl = getTeacherAvatarSvg(cleanCode, cleanName);
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': ADMIN_REQUIRED_PASSWORD,
        },
        body: JSON.stringify({
          accessCode: cleanCode,
          name: cleanName,
          schoolName: cleanSchool,
          avatarUrl,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setFeedbackMessage({
          type: 'success',
          text: `Akaun "${cleanName}" dengan Kod "${cleanCode}" berjaya didaftarkan!`,
        });
        setNewAdminCode('');
        setNewAdminName('');
        setIsCreatingTeacher(false);
        fetchTeachers();
      } else {
        setCreateTeacherError(data.error || 'Gagal mendaftar akaun guru.');
      }
    } catch {
      setCreateTeacherError('Ralat sambungan ke pelayan.');
    } finally {
      setIsSubmittingTeacher(false);
    }
  };

  // Fetch API Keys
  const fetchKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const res = await fetch('/api/admin/keys', {
        headers: { 'x-admin-password': ADMIN_REQUIRED_PASSWORD },
      });
      if (res.ok) {
        const data = await res.json();
        setKeysList(data.keys || []);
        setEnvKeyCount(data.envKeyCount || 0);
      }
    } catch (e) {
      console.warn('Gagal memuat senarai kunci dari pelayan:', e);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  // Bulk add keys
  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawInput.trim()) {
      setFeedbackMessage({ text: 'Sila masukkan sekurang-kurangnya satu API Key.', type: 'error' });
      return;
    }

    setIsLoadingKeys(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': ADMIN_REQUIRED_PASSWORD,
        },
        body: JSON.stringify({ rawKeys: rawInput, label: inputLabel.trim() || undefined }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackMessage({
          text: `Berjaya menambah ${data.addedCount} API Key ke dalam kolam sistem!`,
          type: 'success',
        });
        setRawInput('');
        setInputLabel('');
        fetchKeys();
      } else {
        setFeedbackMessage({
          text: data.error || 'Gagal menambah API Key. Sila semak format input.',
          type: 'error',
        });
      }
    } catch {
      setFeedbackMessage({ text: 'Ralat sambungan ke pelayan.', type: 'error' });
    } finally {
      setIsLoadingKeys(false);
    }
  };

  // Test single key
  const handleTestKey = async (id: string) => {
    setTestingKeyId(id);
    try {
      const res = await fetch('/api/admin/test-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': ADMIN_REQUIRED_PASSWORD,
        },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMessage({
          text: data.message,
          type: data.success ? 'success' : 'error',
        });
        fetchKeys();
      }
    } catch {
      setFeedbackMessage({ text: 'Ralat menguji kunci.', type: 'error' });
    } finally {
      setTestingKeyId(null);
    }
  };

  // Test all keys
  const handleTestAllKeys = async () => {
    setIsTestingAll(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch('/api/admin/test-all-keys', {
        method: 'POST',
        headers: { 'x-admin-password': ADMIN_REQUIRED_PASSWORD },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackMessage({
          text: `Ujian selesai: ${data.activeCount} aktif / bersedia, ${data.failedCount} had kuota atau ralat.`,
          type: 'info',
        });
        fetchKeys();
      }
    } catch {
      setFeedbackMessage({ text: 'Ralat menguji semua kunci.', type: 'error' });
    } finally {
      setIsTestingAll(false);
    }
  };

  // Delete key
  const handleDeleteKey = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/keys/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': ADMIN_REQUIRED_PASSWORD },
      });
      if (res.ok) {
        fetchKeys();
      }
    } catch {
      // ignore
    }
  };

  // Clear all
  const handleClearAll = async () => {
    if (!window.confirm('Adakah anda pasti ingin memadam semua API Key dalam kolam admin?')) return;
    try {
      const res = await fetch('/api/admin/clear-all', {
        method: 'DELETE',
        headers: { 'x-admin-password': ADMIN_REQUIRED_PASSWORD },
      });
      if (res.ok) {
        setKeysList([]);
        setFeedbackMessage({ text: 'Semua API Key telah dikosongkan.', type: 'info' });
      }
    } catch {
      // ignore
    }
  };

  const copyCodeToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const copyKeyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  if (!isOpen) return null;

  // Filtered teachers
  const filteredTeachers = teachersList.filter((t) => {
    const q = teacherSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.accessCode.toLowerCase().includes(q) ||
      (t.schoolName && t.schoolName.toLowerCase().includes(q))
    );
  });

  const totalFoldersCount = teachersList.reduce((acc, t) => acc + (t.folderCount || 0), 0);
  const totalRecordsCount = teachersList.reduce((acc, t) => acc + (t.recordCount || 0), 0);

  const activeKeyCount = keysList.filter(
    (k) => k.status === 'active' || k.status === 'untested'
  ).length;
  const quotaExceededKeyCount = keysList.filter((k) => k.status === 'quota_exceeded').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl shadow-indigo-950 flex flex-col my-auto max-h-[92vh]">
        {/* ========================================================= */}
        {/* VIEW 1: PASSWORD GATE IF NOT AUTHENTICATED */}
        {/* ========================================================= */}
        {!isAuthenticated ? (
          <div className="p-6 sm:p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-xl shadow-amber-950/60 ring-4 ring-amber-500/20 mb-4">
              <Lock className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Akses Terhad Pentadbir Sistem</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white">
              Pengesahan Kata Laluan Mod Admin
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mt-1.5 leading-relaxed">
              Sila masukkan kata laluan keselamatan pentadbir untuk melihat kod akaun guru, memadam
              akaun, atau mengurus kunci Gemini API.
            </p>

            <form onSubmit={handlePasswordSubmit} className="w-full max-w-sm mt-6 space-y-3.5">
              <div className="relative">
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan kata laluan admin..."
                  className="w-full pl-4 pr-11 py-3 bg-slate-950 border-2 border-indigo-500/40 focus:border-amber-400 rounded-xl text-white font-mono font-bold text-sm tracking-widest focus:outline-none shadow-inner"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordText(!showPasswordText)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {passwordError && (
                <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-medium flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingPassword}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-950/60 transition flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-60"
                >
                  {isVerifyingPassword ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5" />
                  )}
                  <span>Buka Mod Admin</span>
                </button>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-[11px] text-slate-400 text-left mt-3">
                <span className="font-bold text-slate-300 block mb-0.5">💡 Maklumat Keselamatan:</span>
                Hanya mod admin dilindungi kata laluan yang boleh melihat semua kod akaun yang dicipta dan
                memadam akaun guru bagi menjaga integriti sistem peperiksaan.
              </div>
            </form>
          </div>
        ) : (
          /* ========================================================= */
          /* VIEW 2: AUTHENTICATED ADMIN DASHBOARD */
          /* ========================================================= */
          <>
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 border-b border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-tr from-amber-500 to-indigo-600 shadow-md ring-2 ring-amber-400/50 flex items-center justify-center text-white shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-extrabold text-white leading-tight">
                      Panel Kawalan Mod Pentadbir (Admin)
                    </h3>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Aktif (KEA8019)
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Pengurusan akaun guru, semakan kod akses, dan konfigurasi kunci Gemini API
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleLockAdmin}
                  className="px-2.5 py-1.5 bg-slate-800/90 hover:bg-amber-950 text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                  title="Kunci semula panel admin"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Kunci Sesi</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sub-Header Tabs */}
            <div className="px-4 sm:px-5 pt-3 pb-0 bg-slate-950/60 border-b border-indigo-500/20 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('teachers');
                  setFeedbackMessage(null);
                }}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                  activeTab === 'teachers'
                    ? 'border-indigo-400 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Pengurusan Akaun Guru ({teachersList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('keys');
                  setFeedbackMessage(null);
                }}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
                  activeTab === 'keys'
                    ? 'border-indigo-400 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Key className="w-4 h-4 text-purple-400" />
                <span>Kolam Kunci Gemini API ({keysList.length})</span>
              </button>
            </div>

            {/* Feedback Message */}
            {feedbackMessage && (
              <div
                className={`mx-4 sm:mx-5 mt-3 p-3 rounded-xl border text-xs font-medium flex items-center justify-between ${
                  feedbackMessage.type === 'success'
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                    : feedbackMessage.type === 'error'
                    ? 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                    : 'bg-indigo-950/50 border-indigo-500/40 text-indigo-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {feedbackMessage.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
                  {feedbackMessage.type === 'error' && <XCircle className="w-4 h-4" />}
                  {feedbackMessage.type === 'info' && <Sparkles className="w-4 h-4" />}
                  <span>{feedbackMessage.text}</span>
                </div>
                <button
                  onClick={() => setFeedbackMessage(null)}
                  className="text-slate-400 hover:text-white ml-2"
                >
                  &times;
                </button>
              </div>
            )}

            {/* Body Tabs Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {/* ========================================================= */}
              {/* TAB 1: TEACHER ACCOUNTS MANAGEMENT */}
              {/* ========================================================= */}
              {activeTab === 'teachers' && (
                <div className="space-y-4">
                  {/* Top Notification Note */}
                  <div className="p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-xl flex items-start gap-2.5 text-xs text-indigo-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">
                        Privilej Eksklusif Mod Pentadbir:
                      </span>
                      Hanya dalam mod admin ini anda boleh melihat kod akses guru dan memadam akaun.
                      Pengguna biasa di peranti lain tidak mempunyai akses untuk melihat atau memadam akaun pengguna lain.
                    </div>
                  </div>

                  {/* Summary Stat Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-slate-950/80 rounded-xl border border-indigo-500/20">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Jumlah Akaun Guru
                      </span>
                      <div className="text-xl font-extrabold text-white mt-0.5 flex items-center gap-2">
                        <span>{teachersList.length}</span>
                        <Users className="w-4 h-4 text-indigo-400" />
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/30">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                        Folder Kelas Disimpan
                      </span>
                      <div className="text-xl font-extrabold text-emerald-300 mt-0.5 flex items-center gap-2">
                        <span>{totalFoldersCount}</span>
                        <FolderOpen className="w-4 h-4 text-emerald-400" />
                      </div>
                    </div>

                    <div className="p-3 bg-purple-950/30 rounded-xl border border-purple-500/30">
                      <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
                        Kertas Disemak (OMR)
                      </span>
                      <div className="text-xl font-extrabold text-purple-300 mt-0.5 flex items-center gap-2">
                        <span>{totalRecordsCount}</span>
                        <FileCheck className="w-4 h-4 text-purple-400" />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950/80 rounded-xl border border-indigo-500/20 flex flex-col justify-center">
                      <button
                        type="button"
                        onClick={() => setIsCreatingTeacher(!isCreatingTeacher)}
                        className="py-1.5 px-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isCreatingTeacher ? 'Tutup Borang' : '+ Tambah Guru'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Admin Manual Teacher Creation Form */}
                  {isCreatingTeacher && (
                    <form
                      onSubmit={handleCreateTeacherSubmit}
                      className="p-4 bg-slate-950 rounded-xl border border-indigo-500/40 space-y-3 animate-fade-in"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Plus className="w-4 h-4 text-indigo-400" />
                          <span>Daftarkan Akaun Guru Baharu Secara Terus</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsCreatingTeacher(false)}
                          className="text-slate-400 hover:text-white text-xs"
                        >
                          Batal
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Kod Akses Guru: *
                          </label>
                          <input
                            type="text"
                            value={newAdminCode}
                            onChange={(e) =>
                              setNewAdminCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))
                            }
                            placeholder="cth: CIKGU-ALI / 98765"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-indigo-400 rounded-lg text-white font-mono font-bold text-xs uppercase focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Nama Guru: *
                          </label>
                          <input
                            type="text"
                            value={newAdminName}
                            onChange={(e) => setNewAdminName(e.target.value)}
                            placeholder="cth: Cikgu Ali Ridzuan"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-indigo-400 rounded-lg text-white text-xs focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Sekolah:
                          </label>
                          <input
                            type="text"
                            value={newAdminSchool}
                            onChange={(e) => setNewAdminSchool(e.target.value)}
                            placeholder="SMK JENERI"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-indigo-400 rounded-lg text-white text-xs uppercase focus:outline-none"
                          />
                        </div>
                      </div>

                      {createTeacherError && (
                        <p className="text-xs text-rose-400 font-medium">{createTeacherError}</p>
                      )}

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={isSubmittingTeacher}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isSubmittingTeacher ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Simpan &amp; Daftarkan Akaun</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Search and Action Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={teacherSearch}
                        onChange={(e) => setTeacherSearch(e.target.value)}
                        placeholder="Cari mengikut nama guru, kod akses, atau sekolah..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-400 rounded-xl text-white text-xs focus:outline-none"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>

                    <button
                      type="button"
                      onClick={fetchTeachers}
                      disabled={isLoadingTeachers}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-700"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTeachers ? 'animate-spin' : ''}`} />
                      <span>Muat Semula</span>
                    </button>
                  </div>

                  {/* Teacher Accounts Table / List */}
                  {isLoadingTeachers ? (
                    <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>Memuat senarai akaun guru dari pelayan pusat...</span>
                    </div>
                  ) : filteredTeachers.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs bg-slate-950/60 rounded-xl border border-slate-800">
                      <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <span>
                        {teacherSearch
                          ? 'Tiada akaun guru yang sepadan dengan carian anda.'
                          : 'Belum ada akaun guru berdaftar dalam sistem.'}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTeachers.map((teacher) => (
                        <div
                          key={teacher.accessCode}
                          className="p-3 sm:p-3.5 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-indigo-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                teacher.avatarUrl ||
                                getTeacherAvatarSvg(teacher.accessCode, teacher.name)
                              }
                              alt={teacher.name}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/40 shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs sm:text-sm font-bold text-white">
                                  {teacher.name}
                                </span>
                                <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                  {teacher.schoolName || 'SMK JENERI'}
                                </span>
                              </div>

                              {/* Highlighted Access Code */}
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-[11px] font-mono font-black text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1.5 shadow-sm">
                                  <KeyRound className="w-3 h-3 text-emerald-400" />
                                  KOD: {teacher.accessCode}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => copyCodeToClipboard(teacher.accessCode)}
                                  className="text-[10px] text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1 py-0.5 px-1.5 rounded bg-indigo-950/40 border border-indigo-500/20"
                                >
                                  {copiedCode === teacher.accessCode ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-300 font-bold">Disalin</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Salin Kod</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Stats & Actions */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                            <div className="text-right text-[10px] text-slate-400 font-mono">
                              <div className="text-slate-300 font-semibold">
                                {teacher.folderCount || 0} Kelas &bull; {teacher.recordCount || 0} Rekod Murid
                              </div>
                              <div>
                                {teacher.createdAt
                                  ? new Date(teacher.createdAt).toLocaleDateString('ms-MY', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })
                                  : 'Daftar Sistem'}
                              </div>
                            </div>

                            {/* DELETE BUTTON - ONLY IN ADMIN MODE */}
                            <button
                              type="button"
                              onClick={() => setTeacherToDelete(teacher)}
                              className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-200 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition active:scale-95"
                              title="Padam akaun guru ini (Hanya Admin)"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span className="hidden sm:inline">Padam</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Confirmation Modal to Delete Teacher */}
                  {teacherToDelete && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                      <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                            <Trash2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">
                              Sahkan Pemadaman Akaun Guru
                            </h4>
                            <p className="text-xs text-rose-300">
                              Tindakan ini kekal dan tidak boleh diundur.
                            </p>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                          <div>
                            Nama Guru:{' '}
                            <span className="font-bold text-white">{teacherToDelete.name}</span>
                          </div>
                          <div>
                            Kod Akses:{' '}
                            <span className="font-mono font-bold text-emerald-400">
                              {teacherToDelete.accessCode}
                            </span>
                          </div>
                          <div>
                            Data Terjejas:{' '}
                            <span className="text-amber-300">
                              {teacherToDelete.folderCount || 0} Kelas,{' '}
                              {teacherToDelete.recordCount || 0} Kertas OMR
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setTeacherToDelete(null)}
                            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteTeacherConfirmed}
                            disabled={deletingCode !== null}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-950 transition flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {deletingCode ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            <span>Padam Akaun Secara Kekal</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 2: GEMINI API KEYS MANAGEMENT */}
              {/* ========================================================= */}
              {activeTab === 'keys' && (
                <div className="space-y-4">
                  {/* Key Pool Status Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-slate-950/80 rounded-xl border border-indigo-500/20">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Jumlah Kunci
                      </span>
                      <div className="text-xl font-extrabold text-white mt-0.5 flex items-baseline gap-1.5">
                        <span>{keysList.length}</span>
                        {envKeyCount > 0 && (
                          <span className="text-[10px] font-normal text-indigo-400">
                            (+{envKeyCount} .env)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/30">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                        Aktif / Bersedia
                      </span>
                      <div className="text-xl font-extrabold text-emerald-300 mt-0.5">
                        {activeKeyCount}
                      </div>
                    </div>

                    <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-500/30">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                        Had Kuota (429)
                      </span>
                      <div className="text-xl font-extrabold text-amber-300 mt-0.5">
                        {quotaExceededKeyCount}
                      </div>
                    </div>

                    <div className="p-3 bg-purple-950/30 rounded-xl border border-purple-500/30">
                      <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
                        Enjin Putaran
                      </span>
                      <div className="text-xs font-bold text-purple-200 mt-1 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>Auto-Failover</span>
                      </div>
                    </div>
                  </div>

                  {/* Bulk Paste Box */}
                  <form
                    onSubmit={handleBulkAdd}
                    className="p-4 bg-slate-950 rounded-xl border border-indigo-500/30 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white flex items-center gap-2">
                        <Plus className="w-4 h-4 text-indigo-400" />
                        <span>Tampal Banyak Gemini API Keys Sekaligus (Bulk Paste):</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Pisahkan dengan Baris Baharu, Koma, atau Ruang
                      </span>
                    </div>

                    <textarea
                      rows={3}
                      value={rawInput}
                      onChange={(e) => setRawInput(e.target.value)}
                      placeholder={`Tampal kunci Gemini API di sini, contohnya:
AIzaSyB1234567890abcdefghijklmnopqrst
AIzaSyC9876543210fedcba9876543210zyxw
AIzaSyD1122334455aabbccddeeffgghhiijj`}
                      className="w-full p-3 bg-slate-900 border border-slate-800 focus:border-indigo-400 rounded-lg text-white font-mono text-xs focus:outline-none placeholder:text-slate-600"
                    />

                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <input
                        type="text"
                        value={inputLabel}
                        onChange={(e) => setInputLabel(e.target.value)}
                        placeholder="Label Kumpulan (Pilihan, cth: Kunci Sekolah, Kunci Guru A)"
                        className="w-full sm:flex-1 px-3 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-400 rounded-lg text-white text-xs focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isLoadingKeys}
                        className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs rounded-lg shadow-md transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                      >
                        {isLoadingKeys ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>Simpan Kunci ke Kolam</span>
                      </button>
                    </div>
                  </form>

                  {/* Key List Header & Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span>Senarai Kunci Dalam Kolam ({keysList.length})</span>
                    </span>

                    <div className="flex items-center gap-2">
                      {keysList.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={handleTestAllKeys}
                            disabled={isTestingAll}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white rounded-lg text-[11px] font-semibold border border-indigo-500/30 transition flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <RefreshCw
                              className={`w-3 h-3 ${isTestingAll ? 'animate-spin' : ''}`}
                            />
                            <span>Uji Semua Kunci</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleClearAll}
                            className="px-2 py-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-lg text-[11px] font-semibold border border-slate-700 transition"
                          >
                            Kosongkan
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Key items list */}
                  {keysList.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs bg-slate-950/60 rounded-xl border border-slate-800">
                      <Key className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <span>Kolam kunci API admin kosong. Sila masukkan kunci di atas.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {keysList.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-slate-900 rounded-lg text-indigo-400 shrink-0">
                              <Key className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-white tracking-wider">
                                  {item.maskedKey}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  ({item.label || 'Kunci Gemini'})
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                    item.status === 'active'
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                      : item.status === 'quota_exceeded'
                                      ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                                      : item.status === 'error'
                                      ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                                      : 'bg-slate-900 text-slate-400 border border-slate-700'
                                  }`}
                                >
                                  {item.status === 'active' && 'Aktif'}
                                  {item.status === 'quota_exceeded' && 'Had Kuota (429)'}
                                  {item.status === 'error' && 'Ralat'}
                                  {item.status === 'untested' && 'Belum Diuji'}
                                </span>

                                {item.lastTested && (
                                  <span className="text-[9px] text-slate-400 flex items-center gap-1 font-mono">
                                    <Clock className="w-2.5 h-2.5" />
                                    {new Date(item.lastTested).toLocaleTimeString('ms-MY')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => handleTestKey(item.id)}
                              disabled={testingKeyId === item.id}
                              className="px-2 py-1 bg-slate-800 hover:bg-indigo-950 text-slate-300 hover:text-indigo-300 rounded text-xs font-semibold border border-slate-700 transition flex items-center gap-1"
                            >
                              <RefreshCw
                                className={`w-3 h-3 ${testingKeyId === item.id ? 'animate-spin' : ''}`}
                              />
                              <span>Uji</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteKey(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 rounded transition"
                              title="Padam Kunci"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const AdminDashboardModal = AdminApiKeyModal;
