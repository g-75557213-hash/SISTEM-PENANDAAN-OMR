import React, { useState, useEffect } from 'react';
import { AdminApiKey } from '../types';
import {
  Key,
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
} from 'lucide-react';

interface AdminApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminApiKeyModal: React.FC<AdminApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [keysList, setKeysList] = useState<AdminApiKey[]>([]);
  const [rawInput, setRawInput] = useState('');
  const [inputLabel, setInputLabel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [envKeyCount, setEnvKeyCount] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      fetchKeys();
    }
  }, [isOpen]);

  const fetchKeys = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/keys');
      if (res.ok) {
        const data = await res.json();
        setKeysList(data.keys || []);
        setEnvKeyCount(data.envKeyCount || 0);
      }
    } catch (e) {
      console.warn('Gagal memuat senarai kunci dari pelayan:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Bulk add keys
  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawInput.trim()) {
      setFeedbackMessage({ text: 'Sila masukkan sekurang-kurangnya satu API Key.', type: 'error' });
      return;
    }

    setIsLoading(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    } catch (err: any) {
      setFeedbackMessage({ text: 'Ralat sambungan ke pelayan.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Test single key
  const handleTestKey = async (id: string) => {
    setTestingKeyId(id);
    try {
      const res = await fetch('/api/admin/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`/api/admin/keys/${id}`, { method: 'DELETE' });
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
      const res = await fetch('/api/admin/clear-all', { method: 'DELETE' });
      if (res.ok) {
        setKeysList([]);
        setFeedbackMessage({ text: 'Semua API Key telah dikosongkan.', type: 'info' });
      }
    } catch {
      // ignore
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const activeCount = keysList.filter((k) => k.status === 'active' || k.status === 'untested').length;
  const quotaExceededCount = keysList.filter((k) => k.status === 'quota_exceeded').length;
  const errorCount = keysList.filter((k) => k.status === 'error').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-indigo-950 flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 border-b border-indigo-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-md ring-2 ring-indigo-400/40 flex items-center justify-center text-white shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white leading-tight flex items-center gap-2">
                Pengurusan Kolam Kunci Gemini API (Admin)
                <span className="text-[10px] bg-purple-500/20 text-purple-300 font-semibold px-2 py-0.5 rounded-full border border-purple-500/30">
                  Multi-Key Rotation
                </span>
              </h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                Masukkan banyak API Keys untuk pengagihan beban automatik &amp; tiada gangguan had kuota
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
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
                {activeCount}
              </div>
            </div>

            <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-500/30">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                Had Kuota (429)
              </span>
              <div className="text-xl font-extrabold text-amber-300 mt-0.5">
                {quotaExceededCount}
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

          {/* Feedback Message */}
          {feedbackMessage && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between ${
                feedbackMessage.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                  : feedbackMessage.type === 'error'
                  ? 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                  : 'bg-indigo-950/50 border-indigo-500/40 text-indigo-300'
              }`}
            >
              <span>{feedbackMessage.text}</span>
              <button
                onClick={() => setFeedbackMessage(null)}
                className="text-slate-400 hover:text-white ml-2"
              >
                &times;
              </button>
            </div>
          )}

          {/* Bulk Paste Box */}
          <form onSubmit={handleBulkAdd} className="p-4 bg-slate-950 rounded-xl border border-indigo-500/30 space-y-3">
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
              rows={4}
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
                disabled={isLoading}
                className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs rounded-lg shadow-md transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                {isLoading ? (
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
                    <RefreshCw className={`w-3 h-3 ${isTestingAll ? 'animate-spin' : ''}`} />
                    <span>Uji Semua Kunci</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-2 py-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-lg text-[11px] font-semibold border border-slate-700 transition"
                  >
                    Padam Semua
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Key List */}
          {keysList.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs space-y-1">
              <Key className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-300">Belum ada API Key dalam kolam sistem.</p>
              <p className="text-[11px] text-slate-500">
                Tampal kunci Gemini API di kotak di atas untuk mula menggunakan sistem failover.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {keysList.map((k, index) => {
                const isTestingThis = testingKeyId === k.id;
                return (
                  <div
                    key={k.id}
                    className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs transition hover:border-indigo-500/30"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                        #{index + 1}
                      </span>
                      <div>
                        <div className="font-mono text-xs font-bold text-white flex items-center gap-2">
                          <span>{k.maskedKey}</span>
                          {/* Status Badge */}
                          {k.status === 'active' && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-sans font-semibold border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Aktif / Sah
                            </span>
                          )}
                          {k.status === 'quota_exceeded' && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-sans font-semibold border border-amber-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Had Kuota
                            </span>
                          )}
                          {k.status === 'error' && (
                            <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-sans font-semibold border border-rose-500/30 flex items-center gap-1">
                              <XCircle className="w-2.5 h-2.5" />
                              Ralat
                            </span>
                          )}
                          {k.status === 'untested' && (
                            <span className="text-[9px] bg-slate-700/50 text-slate-300 px-1.5 py-0.5 rounded font-sans font-semibold">
                              Belum Diuji
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{k.label}</span>
                          {k.lastTested && (
                            <span className="text-slate-500">
                              &bull; Diuji: {new Date(k.lastTested).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleTestKey(k.id)}
                        disabled={isTestingThis}
                        title="Uji sambungan kunci ini"
                        className="px-2 py-1 bg-slate-900 hover:bg-indigo-950 text-indigo-300 hover:text-white rounded-lg text-[10px] font-bold border border-slate-700 hover:border-indigo-500/40 transition flex items-center gap-1 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${isTestingThis ? 'animate-spin' : ''}`} />
                        <span>Uji</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteKey(k.id)}
                        title="Padam kunci"
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Smart Failover Information */}
          <div className="p-3 bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-purple-950/40 rounded-xl border border-indigo-500/20 text-[11px] text-slate-300 flex items-start gap-2.5">
            <Server className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">Bagaimana Kolam Kunci Berfungsi?</span>
              Apabila guru memulakan imbasan OMR atau pengecaman nama pelajar, sistem akan memilih kunci daripada kolam secara bergilir (round-robin). Sekiranya salah satu kunci mencapai had kuota (Error 429) atau ralat, sistem akan secara automatik menukar ke kunci seterusnya dalam sekelip mata tanpa mengganggu pengguna.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
