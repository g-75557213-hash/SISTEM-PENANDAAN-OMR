import React, { useState, useEffect } from 'react';
import { TeacherUser } from '../types';
import {
  KeyRound,
  Sparkles,
  School,
  User,
  ArrowRight,
  PlusCircle,
  Check,
  ShieldCheck,
  Lock,
  RotateCcw,
} from 'lucide-react';
import { getTeacherAvatarSvg, TEACHER_AVATAR_PRESETS } from '../utils/avatarUtils';

interface TeacherAccessCodeModalProps {
  isOpen: boolean;
  onLogin: (user: TeacherUser) => void;
  onClose?: () => void;
  defaultCode?: string;
  onOpenAdmin?: () => void;
}

export const TeacherAccessCodeModal: React.FC<TeacherAccessCodeModalProps> = ({
  isOpen,
  onLogin,
  onClose,
  defaultCode = '',
  onOpenAdmin,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login form state
  const [inputCode, setInputCode] = useState(defaultCode);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newSchool, setNewSchool] = useState('SMK JENERI');
  const [selectedPresetId, setSelectedPresetId] = useState(TEACHER_AVATAR_PRESETS[0].id);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Remembered last used code on this specific device
  const [lastUsedCode, setLastUsedCode] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const savedCode = localStorage.getItem('omr_last_used_code');
      if (savedCode) {
        setLastUsedCode(savedCode);
        if (!inputCode) {
          setInputCode(savedCode);
        }
      }
      if (defaultCode) {
        setInputCode(defaultCode);
      }
    }
  }, [isOpen, defaultCode]);

  if (!isOpen) return null;

  // Handle Log In with existing code (Cross-device synced from central server)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cleanCode = inputCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!cleanCode) {
      setLoginError('Sila masukkan Kod Akses Guru anda.');
      return;
    }
    if (cleanCode.length < 3) {
      setLoginError('Kod Akses mestilah sekurang-kurangnya 3 aksara.');
      return;
    }

    setIsSubmitting(true);
    let userToLogin: TeacherUser | null = null;
    let notFoundError: string | null = null;

    try {
      // 1. Cubaan Pertama: POST ke /api/teacher/login
      try {
        const res = await fetch('/api/teacher/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ accessCode: cleanCode }),
        });

        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && data.success && data.user) {
            userToLogin = data.user;
          }
        } else if (res.status === 404) {
          const data = await res.json().catch(() => null);
          notFoundError =
            data?.error ||
            `Kod akses "${cleanCode}" tidak dijumpai dalam sistem. Sila semak semula ejaan kod anda atau cipta akaun baharu di tab 'Cipta Kod Baharu'.`;
        }
      } catch (postErr) {
        console.warn('POST /api/teacher/login tidak responsif, mencuba fallback GET...', postErr);
      }

      // 2. Cubaan Kedua (Fallback Mobile GET): Sangat tahan lasak untuk telefon & rangkaian perlahan
      if (!userToLogin && !notFoundError) {
        try {
          const getRes = await fetch(`/api/teacher/login/${encodeURIComponent(cleanCode)}?t=${Date.now()}`, {
            headers: { 'Accept': 'application/json' },
          });

          if (getRes.ok) {
            const getData = await getRes.json().catch(() => null);
            if (getData && getData.success && getData.user) {
              userToLogin = getData.user;
            }
          } else if (getRes.status === 404) {
            const getData = await getRes.json().catch(() => null);
            notFoundError =
              getData?.error ||
              `Kod akses "${cleanCode}" tidak dijumpai dalam pangkalan data sistem. Sila pastikan ejaan betul atau cipta akaun baharu di tab 'Cipta Kod Baharu'.`;
          }
        } catch (getErr) {
          console.warn('GET /api/teacher/login/:code gagal, mencuba /api/teacher/check...', getErr);
        }
      }

      // 3. Cubaan Ketiga (Fallback Check):
      if (!userToLogin && !notFoundError) {
        try {
          const checkRes = await fetch(`/api/teacher/check/${encodeURIComponent(cleanCode)}?t=${Date.now()}`);
          if (checkRes.ok) {
            const checkData = await checkRes.json().catch(() => null);
            if (checkData && checkData.exists && checkData.teacher) {
              userToLogin = checkData.teacher;
            } else if (checkData && checkData.exists === false) {
              notFoundError = `Kod akses "${cleanCode}" tidak dijumpai dalam pangkalan data sistem.`;
            }
          }
        } catch (checkErr) {
          console.warn('Semua endpoint rangkaian gagal diakses:', checkErr);
        }
      }

      // Jika berjaya dijumpai daripada mana-mana laluan pelayan:
      if (userToLogin) {
        localStorage.setItem('omr_last_used_code', cleanCode);
        localStorage.setItem(`omr_teacher_profile_${cleanCode}`, JSON.stringify(userToLogin));
        onLogin(userToLogin);
        return;
      }

      // Jika pelayan mengesahkan kod memang tiada:
      if (notFoundError) {
        setLoginError(notFoundError);
        return;
      }

      // Fallback storan setempat jika internet / pelayan sedang memulakan proses
      const profileKey = `omr_teacher_profile_${cleanCode}`;
      const savedData = localStorage.getItem(profileKey);
      if (savedData) {
        const localUser: TeacherUser = JSON.parse(savedData);
        localStorage.setItem('omr_last_used_code', cleanCode);
        onLogin(localUser);
        return;
      }

      setLoginError(
        `Rangkaian telefon sedang menyambung ke pelayan. Sila tekan butang "Masuk Akaun Guru" sekali lagi.`
      );
    } catch (err: any) {
      setLoginError(
        `Sila tekan butang "Masuk Akaun Guru" sekali lagi untuk menyambung ke pelayan.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Register New Code (Enforces 1 unique code = 1 specific user)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    const cleanCode = newCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    const cleanName = newName.trim();
    const cleanSchool = newSchool.trim() || 'SMK JENERI';

    if (!cleanCode || cleanCode.length < 3) {
      setRegisterError('Kod Akses mestilah sekurang-kurangnya 3 huruf atau nombor.');
      return;
    }

    if (!cleanName) {
      setRegisterError('Sila masukkan nama guru (cth: Cikgu Ahmad Hakim).');
      return;
    }

    const preset = TEACHER_AVATAR_PRESETS.find((p) => p.id === selectedPresetId);
    const avatarUrl = getTeacherAvatarSvg(cleanCode, cleanName, preset?.iconText);

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/teacher/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessCode: cleanCode,
          name: cleanName,
          schoolName: cleanSchool,
          avatarUrl,
        }),
      });
      const data = await res.json();

      if (res.status === 409 || data.isExisting) {
        setRegisterError(
          data.error ||
            `Kod akses "${cleanCode}" sudah didaftarkan untuk pengguna lain! Setiap kod adalah spesifik untuk seorang guru sahaja. Sila pilih kod unik lain, atau log masuk di tab 'Log Masuk Kod Sedia Ada' jika ini akaun anda.`
        );
        return;
      }

      if (!res.ok || !data.success) {
        setRegisterError(data.error || 'Ralat semasa mendaftar kod akses. Sila cuba lagi.');
        return;
      }

      const newUser: TeacherUser = data.user;
      localStorage.setItem('omr_last_used_code', cleanCode);
      localStorage.setItem(`omr_teacher_profile_${cleanCode}`, JSON.stringify(newUser));
      onLogin(newUser);
    } catch (err: any) {
      // Fallback jika pelayan luar talian
      const newUser: TeacherUser = {
        id: `teacher_${cleanCode}`,
        accessCode: cleanCode,
        name: cleanName,
        schoolName: cleanSchool,
        avatarUrl,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('omr_last_used_code', cleanCode);
      localStorage.setItem(`omr_teacher_profile_${cleanCode}`, JSON.stringify(newUser));
      onLogin(newUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-indigo-950 flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900/80 via-indigo-900/80 to-purple-900/80 border-b border-indigo-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md ring-2 ring-purple-400/50 aspect-square bg-slate-950 shrink-0 flex items-center justify-center p-1">
              <KeyRound className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-extrabold text-white leading-tight flex items-center gap-2">
                Akses Akaun Guru
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Kod Akses Sahaja
                </span>
              </h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                Tiada akaun Google atau emel diperlukan &bull; Akses peribadi dan pantas
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 bg-slate-950/60 p-1 rounded-xl border border-indigo-500/20">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setLoginError(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                tab === 'login'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Log Masuk Kod Sedia Ada</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setRegisterError(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                tab === 'register'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-purple-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Cipta Kod Baharu</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {tab === 'login' ? (
            /* TAB 1: LOGIN WITH CODE (NO PUBLIC ACCOUNTS LIST OR DELETE BUTTONS) */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Masukkan Kod Akses Guru Anda:</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    (Contoh: CIKGU123, 7555, SAINS-01)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                    placeholder="MASUKKAN KOD ANDA..."
                    className="w-full pl-4 pr-10 py-3 bg-slate-950 border-2 border-indigo-500/40 focus:border-indigo-400 rounded-xl text-white font-mono font-bold text-sm sm:text-base tracking-wider uppercase focus:outline-none shadow-inner"
                    autoFocus
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400">
                    <KeyRound className="w-5 h-5" />
                  </div>
                </div>

                {/* Optional autofill for last used code on this specific device */}
                {lastUsedCode && inputCode !== lastUsedCode && (
                  <button
                    type="button"
                    onClick={() => setInputCode(lastUsedCode)}
                    className="mt-2 text-[11px] text-indigo-300 hover:text-white flex items-center gap-1 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 px-2.5 py-1 rounded-lg transition"
                  >
                    <RotateCcw className="w-3 h-3 text-indigo-400" />
                    <span>Gunakan kod terakhir peranti ini:</span>
                    <span className="font-mono font-bold text-emerald-300">{lastUsedCode}</span>
                  </button>
                )}

                {loginError && (
                  <p className="text-xs text-rose-400 font-medium mt-1.5">{loginError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-950/60 transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Mengesahkan Kod Dengan Pelayan...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk Akaun Guru</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Informative info banner */}
              <div className="p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-xl flex items-start gap-2.5 text-[11px] text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">Akaun Diselaraskan Merentas Peranti</span>
                  Kod anda diselaraskan ke pangkalan data pusat. Anda boleh log masuk di mana-mana
                  komputer, telefon pintar, atau tablet menggunakan kod yang sama dan semua data peperiksaan anda akan dipaparkan secara automatik.
                </div>
              </div>

              {/* Admin Mode shortcut */}
              {onOpenAdmin && (
                <div className="pt-2 border-t border-slate-800 text-center">
                  <button
                    type="button"
                    onClick={onOpenAdmin}
                    className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-amber-300 transition py-1 px-2 rounded-lg hover:bg-slate-800"
                  >
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>Pentadbir Sistem: Lihat kod akaun guru atau padam akaun (Kata laluan: KEA8019)</span>
                  </button>
                </div>
              )}
            </form>
          ) : (
            /* TAB 2: REGISTER NEW CODE */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="p-2.5 bg-blue-950/40 border border-blue-500/30 rounded-xl text-[11px] text-blue-200">
                <span className="font-bold text-white block mb-0.5">📌 Pendaftaran Kod Unik Peribadi</span>
                Setiap kod adalah khusus untuk seorang guru sahaja. Kod ini boleh digunakan pada mana-mana peranti lain selepas pendaftaran.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  1. Cipta Kod Akses Guru (Pilihan Anda Sendiri): *
                </label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) =>
                    setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))
                  }
                  placeholder="Contoh: CIKGU-ZAKI, KOD7555, SAINS-01"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-indigo-500/40 focus:border-indigo-400 rounded-xl text-white font-mono font-bold text-sm tracking-wider uppercase focus:outline-none"
                  autoFocus
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Kod ini akan menjadi kunci pengenalan akaun anda di mana-mana peranti.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  2. Nama Panggilan Guru: *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Contoh: Cikgu Ahmad Hakim"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-indigo-500/40 focus:border-indigo-400 rounded-xl text-white text-xs font-medium focus:outline-none"
                  />
                  <User className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  3. Nama Sekolah:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newSchool}
                    onChange={(e) => setNewSchool(e.target.value)}
                    placeholder="SMK JENERI"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-indigo-500/40 focus:border-indigo-400 rounded-xl text-white text-xs font-medium uppercase focus:outline-none"
                  />
                  <School className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Avatar Preset Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  4. Pilihan Ikon Profil Guru:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {TEACHER_AVATAR_PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedPresetId(preset.id)}
                        className={`p-2 rounded-xl flex flex-col items-center gap-1 border transition ${
                          isSelected
                            ? 'bg-indigo-600/30 border-indigo-400 ring-2 ring-indigo-500/60'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-2xl">{preset.iconText}</span>
                        <span className="text-[9px] text-slate-300 truncate max-w-full font-medium">
                          {preset.label.split(' ')[1] || preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {registerError && (
                <p className="text-xs text-rose-400 font-medium">{registerError}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-teal-950/60 transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Mendaftarkan Kod di Sistem...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Cipta Kod & Masuk Akaun Sekarang</span>
                  </>
                )}
              </button>

              {onOpenAdmin && (
                <div className="pt-2 border-t border-slate-800 text-center">
                  <button
                    type="button"
                    onClick={onOpenAdmin}
                    className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-amber-300 transition py-1 px-2 rounded-lg hover:bg-slate-800"
                  >
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>Akses Mod Pentadbir (Kata laluan: KEA8019)</span>
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
