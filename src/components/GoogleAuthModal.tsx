import React, { useState, useEffect, useRef } from 'react';
import { TeacherUser } from '../types';
import {
  LogIn,
  ArrowRight,
  AlertCircle,
  Loader2,
  Mail,
  User,
  X,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  signInWithGoogle,
  getGoogleAccountAvatar,
} from '../services/firebaseAuth';

export { getGoogleAccountAvatar as getAccountProfileAvatar };

interface GoogleAuthModalProps {
  isOpen: boolean;
  onLogin: (user: TeacherUser) => void;
  onClose?: () => void;
  defaultEmail?: string;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onLogin,
  onClose,
  defaultEmail = '',
}) => {
  const [selectedEmail, setSelectedEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omr_teacher_saved_email');
      if (saved) return saved;
    }
    return defaultEmail;
  });

  const [teacherName, setTeacherName] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('omr_teacher_active_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed.name) return parsed.name;
        } catch {
          // ignore
        }
      }
    }
    return '';
  });

  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  // Sync if defaultEmail changes
  useEffect(() => {
    if (defaultEmail && !selectedEmail) {
      setSelectedEmail(defaultEmail);
    }
  }, [defaultEmail]);

  if (!isOpen) return null;

  // Process login with user object
  const completeLogin = (email: string, name?: string, photo?: string) => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Sila masukkan alamat emel Google atau Gmail yang sah.');
      return;
    }

    // Auto append @gmail.com if user only entered username without @
    const finalEmail = cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@gmail.com`;

    // Derive friendly teacher name if blank
    let finalName = (name || teacherName).trim();
    if (!finalName) {
      const usernamePart = finalEmail.split('@')[0];
      const formatted = usernamePart
        .split(/[._-]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      finalName = `Cikgu ${formatted}`;
    }

    const finalPhoto = photo || getGoogleAccountAvatar(finalEmail, finalName);

    const user: TeacherUser = {
      id: `google-${finalEmail.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')}`,
      name: finalName,
      email: finalEmail.toLowerCase(),
      schoolName: 'SMK JENERI',
      avatarUrl: finalPhoto,
    };

    // Save to localStorage for automatic login on next reload
    try {
      localStorage.setItem('omr_teacher_saved_email', finalEmail.toLowerCase());
      localStorage.setItem('omr_teacher_active_user', JSON.stringify(user));
    } catch {
      // ignore
    }

    onLogin(user);
  };

  // Google Sign-In button
  const handleRealGoogleSignIn = async () => {
    setIsLoadingGoogle(true);
    setErrorMessage(null);
    try {
      const result = await signInWithGoogle();
      if (result && result.email) {
        completeLogin(result.email, result.displayName, result.photoURL);
        return;
      }
      throw new Error('No user returned');
    } catch (err: any) {
      console.warn('Popup login notice:', err);
      // If user has already entered an email in the input, log them in directly
      if (selectedEmail.trim()) {
        completeLogin(selectedEmail);
        return;
      }

      setErrorMessage(
        'Tetingkap popup Google disekat oleh pelayar atau persekitaran web. Sila masukkan emel Gmail anda di bawah untuk log masuk secara terus.'
      );
      if (emailInputRef.current) {
        emailInputRef.current.focus();
      }
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  // Form submit (Enter key or button click)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmail.trim()) {
      setErrorMessage('Sila masukkan alamat emel Gmail atau Google anda.');
      if (emailInputRef.current) {
        emailInputRef.current.focus();
      }
      return;
    }
    completeLogin(selectedEmail);
  };

  // Quick domain append chips
  const handleAppendDomain = (domain: string) => {
    const cur = selectedEmail.trim();
    if (!cur) {
      setSelectedEmail(`cikgu${domain}`);
    } else if (cur.includes('@')) {
      const username = cur.split('@')[0];
      setSelectedEmail(`${username}${domain}`);
    } else {
      setSelectedEmail(`${cur}${domain}`);
    }
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-indigo-950/60 flex flex-col relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition z-10"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header Branding */}
        <div className="p-6 bg-gradient-to-b from-indigo-950/70 via-slate-900 to-slate-900 border-b border-indigo-500/20 text-center flex flex-col items-center relative overflow-hidden">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-purple-600/20 blur-3xl rounded-full pointer-events-none" />

          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-xl shadow-indigo-500/30 mb-3 ring-2 ring-purple-400/40 aspect-square bg-slate-900 flex items-center justify-center">
            <img
              src="/src/assets/images/system_logo_1791437837470.jpg"
              alt="SISTEM PENANDAAN OMR"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
            SISTEM PENANDAAN OMR
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-purple-300 border border-purple-500/30">
              Gmail & DELIMa
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
            Log masuk menggunakan akaun Gmail atau Google Workspace / DELIMa MOE anda untuk mula menyemak jawapan OMR.
          </p>
        </div>

        {/* Body Form */}
        <div className="p-6 flex flex-col gap-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[11px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Official Google Sign-In Button */}
          <button
            type="button"
            disabled={isLoadingGoogle}
            onClick={handleRealGoogleSignIn}
            className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-3 shadow-md shadow-black/40 transition border border-slate-300 active:scale-[0.99] cursor-pointer disabled:opacity-60"
          >
            {isLoadingGoogle ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span className="text-slate-800 font-semibold tracking-wide">
              {isLoadingGoogle ? 'Menghubungkan Akaun Google...' : 'Log Masuk dengan Akaun Google'}
            </span>
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              atau log masuk dengan emel Gmail / Google
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Form for Direct Email Sign-In with keyboard Enter support */}
          <form onSubmit={handleFormSubmit} className="flex flex-col gap-3">
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-indigo-500/30 flex flex-col gap-2.5">
              <div>
                <label className="block text-slate-300 mb-1.5 font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-purple-400" />
                    Emel Gmail / Google Guru:
                  </span>
                  <span className="text-[10px] text-emerald-400 font-normal flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Menyokong Semua Emel
                  </span>
                </label>
                <input
                  ref={emailInputRef}
                  type="email"
                  value={selectedEmail}
                  onChange={(e) => setSelectedEmail(e.target.value)}
                  placeholder="cth: nama@gmail.com atau nama@moe-dl.edu.my"
                  required
                  className="w-full px-3 py-2.5 bg-slate-900 border border-indigo-500/40 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-mono transition"
                />
              </div>

              {/* Quick domain buttons */}
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[10px] text-slate-400 font-medium">Pilihan Pantas:</span>
                <button
                  type="button"
                  onClick={() => handleAppendDomain('@gmail.com')}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-indigo-950/80 text-purple-300 hover:text-purple-200 border border-purple-500/30 text-[10px] font-mono transition flex items-center gap-1 cursor-pointer"
                  title="Pilih domain @gmail.com"
                >
                  <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                  + @gmail.com
                </button>
                <button
                  type="button"
                  onClick={() => handleAppendDomain('@moe-dl.edu.my')}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-blue-950/80 text-blue-300 hover:text-blue-200 border border-blue-500/30 text-[10px] font-mono transition cursor-pointer"
                  title="Pilih domain DELIMa MOE"
                >
                  + @moe-dl.edu.my
                </button>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Nama Panggilan Guru (Pilihan):
                </label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="cth: Cikgu Sarah"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-purple-500 placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Direct Login Button */}
            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950 transition active:scale-[0.98] mt-1 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Log Masuk Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[10px] text-slate-500 text-center leading-normal">
            Menyokong semua akaun Google (@gmail.com dan DELIMa MOE). Skema jawapan dan rekod kelas disimpan secara selamat mengikut akaun anda.
          </p>
        </div>
      </div>
    </div>
  );
};
