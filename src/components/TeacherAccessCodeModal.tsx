import React, { useState, useEffect } from 'react';
import { TeacherUser } from '../types';
import {
  KeyRound,
  Sparkles,
  School,
  User,
  ArrowRight,
  PlusCircle,
  Clock,
  Trash2,
  Check,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { getTeacherAvatarSvg, TEACHER_AVATAR_PRESETS } from '../utils/avatarUtils';

interface TeacherAccessCodeModalProps {
  isOpen: boolean;
  onLogin: (user: TeacherUser) => void;
  onClose?: () => void;
  defaultCode?: string;
}

export const TeacherAccessCodeModal: React.FC<TeacherAccessCodeModalProps> = ({
  isOpen,
  onLogin,
  onClose,
  defaultCode = '',
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [inputCode, setInputCode] = useState(defaultCode);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newSchool, setNewSchool] = useState('SMK JENERI');
  const [selectedPresetId, setSelectedPresetId] = useState(TEACHER_AVATAR_PRESETS[0].id);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Stored saved profiles on this browser
  const [savedProfiles, setSavedProfiles] = useState<TeacherUser[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadSavedProfiles();
      if (defaultCode) {
        setInputCode(defaultCode);
      }
    }
  }, [isOpen, defaultCode]);

  const loadSavedProfiles = () => {
    try {
      const raw = localStorage.getItem('omr_teacher_saved_profiles');
      if (raw) {
        const parsed = JSON.parse(raw) as TeacherUser[];
        setSavedProfiles(parsed);
      }
    } catch {
      setSavedProfiles([]);
    }
  };

  const persistProfileToList = (user: TeacherUser) => {
    try {
      const raw = localStorage.getItem('omr_teacher_saved_profiles');
      let list: TeacherUser[] = raw ? JSON.parse(raw) : [];
      list = list.filter(
        (u) => u.accessCode.toUpperCase() !== user.accessCode.toUpperCase()
      );
      list.unshift(user);
      localStorage.setItem('omr_teacher_saved_profiles', JSON.stringify(list));
      setSavedProfiles(list);
    } catch {
      // storage error ignored
    }
  };

  const handleDeleteProfile = (codeToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = savedProfiles.filter(
        (p) => p.accessCode.toUpperCase() !== codeToDelete.toUpperCase()
      );
      localStorage.setItem('omr_teacher_saved_profiles', JSON.stringify(updated));
      setSavedProfiles(updated);
    } catch {
      // ignore
    }
  };

  if (!isOpen) return null;

  // Handle Log In with existing code
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cleanCode = inputCode.trim().toUpperCase();
    if (!cleanCode) {
      setLoginError('Sila masukkan Kod Akses Guru anda.');
      return;
    }
    if (cleanCode.length < 3) {
      setLoginError('Kod Akses mestilah sekurang-kurangnya 3 aksara.');
      return;
    }

    // Check if profile exists in saved profiles
    const existing = savedProfiles.find(
      (p) => p.accessCode.toUpperCase() === cleanCode
    );

    let userToLogin: TeacherUser;
    if (existing) {
      userToLogin = existing;
    } else {
      // Check if user data exists under this code
      const profileKey = `omr_teacher_profile_${cleanCode}`;
      const savedData = localStorage.getItem(profileKey);

      if (savedData) {
        try {
          userToLogin = JSON.parse(savedData);
        } catch {
          userToLogin = {
            id: `teacher_${cleanCode}`,
            accessCode: cleanCode,
            name: `Cikgu ${cleanCode}`,
            schoolName: 'SMK JENERI',
            avatarUrl: getTeacherAvatarSvg(cleanCode, `Cikgu ${cleanCode}`),
            createdAt: new Date().toISOString(),
          };
        }
      } else {
        // Auto-create or login with this code
        userToLogin = {
          id: `teacher_${cleanCode}`,
          accessCode: cleanCode,
          name: `Cikgu ${cleanCode}`,
          schoolName: 'SMK JENERI',
          avatarUrl: getTeacherAvatarSvg(cleanCode, `Cikgu ${cleanCode}`),
          createdAt: new Date().toISOString(),
        };
      }
    }

    persistProfileToList(userToLogin);
    onLogin(userToLogin);
  };

  // Handle Quick Select from saved list
  const handleQuickSelect = (profile: TeacherUser) => {
    persistProfileToList(profile);
    onLogin(profile);
  };

  // Handle Register New Code
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    const cleanCode = newCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    const cleanName = newName.trim();
    const cleanSchool = newSchool.trim() || 'SMK JENERI';

    if (!cleanCode || cleanCode.length < 3) {
      setRegisterError('Kod Akses mestilah sekurang-kurangnya 3 huruf/nombor.');
      return;
    }

    if (!cleanName) {
      setRegisterError('Sila masukkan nama guru (cth: Cikgu Hakim).');
      return;
    }

    const preset = TEACHER_AVATAR_PRESETS.find((p) => p.id === selectedPresetId);
    const avatarUrl = getTeacherAvatarSvg(cleanCode, cleanName, preset?.iconText);

    const newUser: TeacherUser = {
      id: `teacher_${cleanCode}`,
      accessCode: cleanCode,
      name: cleanName,
      schoolName: cleanSchool,
      avatarUrl,
      createdAt: new Date().toISOString(),
    };

    // Save individual profile
    localStorage.setItem(`omr_teacher_profile_${cleanCode}`, JSON.stringify(newUser));
    persistProfileToList(newUser);
    onLogin(newUser);
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
                Tiada akaun Google atau emel diperlukan &bull; Akses pantas dan peribadi
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
            /* TAB 1: LOGIN WITH CODE */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Masukkan Kod Akses Guru Anda:</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    (Contoh: CIKGU123, 7555, SAINS-SMKJ)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="MASUKKAN KOD ANDA..."
                    className="w-full pl-4 pr-10 py-3 bg-slate-950 border-2 border-indigo-500/40 focus:border-indigo-400 rounded-xl text-white font-mono font-bold text-sm sm:text-base tracking-wider uppercase focus:outline-none shadow-inner"
                    autoFocus
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400">
                    <KeyRound className="w-5 h-5" />
                  </div>
                </div>
                {loginError && (
                  <p className="text-xs text-rose-400 font-medium mt-1.5">{loginError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-950/60 transition flex items-center justify-center gap-2 active:scale-98"
              >
                <span>Masuk Akaun Guru</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Saved accounts on this device */}
              {savedProfiles.length > 0 && (
                <div className="pt-2 border-t border-indigo-500/15">
                  <span className="block text-[11px] font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    Akaun Disimpan di Peranti Ini (Klik untuk Masuk Segera):
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {savedProfiles.map((p) => (
                      <div
                        key={p.accessCode}
                        onClick={() => handleQuickSelect(p)}
                        className="group flex items-center justify-between p-2.5 bg-slate-950/80 hover:bg-indigo-950/50 border border-slate-800 hover:border-indigo-500/40 rounded-xl cursor-pointer transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={p.avatarUrl || getTeacherAvatarSvg(p.accessCode, p.name)}
                            alt={p.name}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-indigo-500/40"
                          />
                          <div>
                            <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
                              {p.name}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 font-mono">
                              <span className="bg-indigo-500/20 text-indigo-300 px-1 rounded">
                                Kod: {p.accessCode}
                              </span>
                              <span>{p.schoolName || 'SMK JENERI'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-indigo-400 font-semibold group-hover:translate-x-0.5 transition hidden sm:inline">
                            Pilih &rarr;
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteProfile(p.accessCode, e)}
                            title="Padam rekod dari peranti"
                            className="p-1 text-slate-500 hover:text-rose-400 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Informative info banner */}
              <div className="p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-xl flex items-start gap-2.5 text-[11px] text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">Akses Selamat &amp; Pantas</span>
                  Semua kelas, skema jawapan, dan rekod kertas OMR murid disimpan secara khusus di bawah Kod Akses anda. Masukkan kod yang sama bila-bila masa untuk membuka semula akaun anda.
                </div>
              </div>
            </form>
          ) : (
            /* TAB 2: REGISTER NEW CODE */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
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
                  Kod ini akan digunakan setiap kali anda ingin log masuk ke akaun anda.
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
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-teal-950/60 transition flex items-center justify-center gap-2 active:scale-98"
              >
                <Check className="w-4 h-4" />
                <span>Cipta Kod & Masuk Akaun Sekarang</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
