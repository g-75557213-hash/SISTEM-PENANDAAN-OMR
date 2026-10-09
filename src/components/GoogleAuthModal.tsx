import React, { useState } from 'react';
import { TeacherUser } from '../types';
import {
  AlertCircle,
  Loader2,
  X,
  Copy,
  Check,
  HelpCircle,
  ChevronDown,
  ChevronUp,
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
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showOriginHelp, setShowOriginHelp] = useState(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopyOrigin = () => {
    if (navigator.clipboard && currentOrigin) {
      navigator.clipboard.writeText(currentOrigin);
      setCopiedOrigin(true);
      setTimeout(() => setCopiedOrigin(false), 2000);
    }
  };

  if (!isOpen) return null;

  // Process login with user object
  const completeLogin = (email: string, name?: string, photo?: string) => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Tiada akaun Google dikesan. Sila cuba log masuk semula.');
      return;
    }

    const finalEmail = cleanEmail.toLowerCase();

    // Derive friendly teacher name if blank
    let finalName = (name || '').trim();
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
      id: `google-${finalEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      name: finalName,
      email: finalEmail,
      schoolName: 'SMK JENERI',
      avatarUrl: finalPhoto,
    };

    // Save to localStorage for automatic session retention
    try {
      localStorage.setItem('omr_teacher_saved_email', finalEmail);
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
      console.warn('Google Sign-In notice:', err);
      const isOriginMismatch =
        err?.message?.includes('origin_mismatch') ||
        err?.message?.includes('400') ||
        err?.code === 'auth/unauthorized-domain';

      if (isOriginMismatch) {
        setShowOriginHelp(true);
        setErrorMessage(
          'Akses disekat oleh Google (Error 400: origin_mismatch). Sila daftarkan domain ini dalam Google Cloud Console.'
        );
      } else {
        setErrorMessage(
          'Tetingkap log masuk Google disekat oleh pelayar atau ditutup. Sila benarkan popup untuk meneruskan log masuk.'
        );
      }
    } finally {
      setIsLoadingGoogle(false);
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
              Akaun Google
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
            Sila log masuk menggunakan Akaun Google rasmi anda (@gmail.com atau DELIMa MOE) untuk mengakses sistem pemeriksaan kertas jawapan OMR.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[11px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Exclusive Google Sign-In Button */}
          <button
            type="button"
            disabled={isLoadingGoogle}
            onClick={handleRealGoogleSignIn}
            className="w-full py-4 px-4 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 rounded-xl font-bold text-sm flex items-center justify-center gap-3 shadow-lg shadow-black/40 transition border border-slate-300 active:scale-[0.99] cursor-pointer disabled:opacity-60"
          >
            {isLoadingGoogle ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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

          {/* Quick Origin Mismatch Helper */}
          <div className="bg-slate-950/60 rounded-xl border border-indigo-500/20 overflow-hidden mt-1">
            <button
              type="button"
              onClick={() => setShowOriginHelp(!showOriginHelp)}
              className="w-full px-3 py-2 flex items-center justify-between text-left text-[11px] text-purple-300 hover:text-purple-200 hover:bg-slate-900/60 transition"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                Maklumat Kebenaran Google Cloud Console
              </span>
              {showOriginHelp ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {showOriginHelp && (
              <div className="p-3 border-t border-indigo-500/20 bg-slate-950/90 flex flex-col gap-2.5 text-[11px] text-slate-300">
                <p className="leading-relaxed">
                  <strong className="text-purple-300">Konfigurasi Domain:</strong> Pastikan domain aplikasi ini didaftarkan di dalam <em>Authorized JavaScript origins</em> pada Google Cloud Console.
                </p>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">Domain Asal Aplikasi (Origin URI):</span>
                  <div className="flex items-center gap-2">
                    <code className="text-[10px] font-mono text-emerald-300 bg-slate-950 px-2 py-1 rounded border border-slate-800 flex-1 truncate select-all">
                      {currentOrigin || 'https://ais-pre-...run.app'}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyOrigin}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-semibold flex items-center gap-1 transition shrink-0 cursor-pointer"
                    >
                      {copiedOrigin ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedOrigin ? 'Disalin' : 'Salin'}</span>
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300">Langkah Mendaftar di Google Cloud Console:</div>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-400">
                    <li>Buka <span className="text-purple-300 font-mono">console.cloud.google.com/apis/credentials</span></li>
                    <li>Pilih OAuth 2.0 Web Client ID</li>
                    <li>Di bawah <strong>Authorized JavaScript origins</strong>, tampal domain di atas</li>
                    <li>Klik <strong>Save</strong></li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          <p className="text-[10px] text-slate-500 text-center leading-normal mt-2">
            Hanya log masuk melalui akaun Google rasmi disokong. Profil guru, skema jawapan, dan data kelas akan diselaraskan secara automatik.
          </p>
        </div>
      </div>
    </div>
  );
};
