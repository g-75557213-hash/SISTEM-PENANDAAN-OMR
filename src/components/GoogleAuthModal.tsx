import React, { useState, useRef, useEffect } from 'react';
import { TeacherUser } from '../types';
import {
  LogIn,
  ArrowRight,
  Camera,
  Sparkles,
  AlertCircle,
  Loader2,
  Mail,
  X,
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
  defaultEmail = 'g-75557213@moe-dl.edu.my',
}) => {
  const [selectedEmail, setSelectedEmail] = useState(defaultEmail);
  const [teacherName, setTeacherName] = useState('Cikgu (Akaun Guru MOE)');
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(() =>
    getGoogleAccountAvatar(defaultEmail, 'Cikgu (Akaun Guru MOE)')
  );
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [hasCustomUpload, setHasCustomUpload] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync account avatar automatically from Google account when email changes
  useEffect(() => {
    if (!hasCustomUpload && selectedEmail) {
      setAvatarLoadError(false);
      setSelectedAvatarUrl(getGoogleAccountAvatar(selectedEmail, teacherName));
    }
  }, [selectedEmail, teacherName, hasCustomUpload]);

  if (!isOpen) return null;

  // Real Google Sign-In using Firebase OAuth
  const handleRealGoogleSignIn = async () => {
    setIsLoadingGoogle(true);
    setErrorMessage(null);
    try {
      const result = await signInWithGoogle();
      const user: TeacherUser = {
        id: `google-${result.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name: result.displayName || 'Cikgu',
        email: result.email,
        schoolName: 'SMK JENERI',
        avatarUrl: result.photoURL,
      };
      onLogin(user);
    } catch (err: any) {
      console.warn('Popup login notice:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Tetingkap log masuk Google ditutup. Anda boleh teruskan menggunakan emel Google di bawah.');
      } else if (err?.code === 'auth/popup-blocked') {
        setErrorMessage('Tetingkap popup disekat oleh pelayar. Sila benarkan popup atau teruskan dengan emel Google anda di bawah.');
      } else {
        setErrorMessage(
          'Tidak dapat membuka tetingkap Google secara langsung. Sila teruskan dengan memasukkan emel Google anda di bawah.'
        );
      }
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  // Custom photo upload directly from user's account/camera/device
  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedAvatarUrl(reader.result);
        setHasCustomUpload(true);
        setAvatarLoadError(false);
        try {
          localStorage.setItem(`omr_account_avatar_${selectedEmail}`, reader.result);
        } catch {
          // ignore storage quota error
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Direct confirmation with Google email & account photo
  const handleDirectSignIn = () => {
    const emailToUse = selectedEmail.trim();
    if (!emailToUse) {
      setErrorMessage('Sila masukkan alamat emel Google yang sah.');
      return;
    }

    const user: TeacherUser = {
      id: `google-${emailToUse.replace(/[^a-zA-Z0-9]/g, '_')}`,
      name: teacherName.trim() || `Cikgu (${emailToUse.split('@')[0]})`,
      email: emailToUse,
      schoolName: 'SMK JENERI',
      avatarUrl: selectedAvatarUrl,
    };
    onLogin(user);
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

        {/* Header Branding - Vibrant Blue to Purple Gradient */}
        <div className="p-6 bg-gradient-to-b from-indigo-950/70 via-slate-900 to-slate-900 border-b border-indigo-500/20 text-center flex flex-col items-center relative overflow-hidden">
          {/* Ambient colorful glow */}
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
              DELIMa
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Log masuk menggunakan akaun emel Google rasmi anda dan gambar profil akaun Google tersebut.
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
              atau log masuk dengan emel Google
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Email Input & Google Account Profile Preview */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-indigo-500/30 flex flex-col gap-3">
            <div>
              <label className="block text-slate-300 mb-1 font-semibold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-purple-400" />
                Emel Google Guru:
              </label>
              <input
                type="email"
                value={selectedEmail}
                onChange={(e) => setSelectedEmail(e.target.value)}
                placeholder="nama@moe-dl.edu.my atau nama@gmail.com"
                className="w-full px-3 py-2 bg-slate-900 border border-indigo-500/40 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            {/* Profile Avatar Card - Takes real Google account photo */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                  <img
                    src={selectedAvatarUrl}
                    alt="Gambar Akaun Google"
                    onError={() => {
                      if (!avatarLoadError) {
                        setAvatarLoadError(true);
                        setSelectedAvatarUrl(
                          `data:image/svg+xml;utf8,${encodeURIComponent(
                            `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="#4f46e5"/><text x="64" y="74" font-family="sans-serif" font-size="52" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central">G</text></svg>`
                          )}`
                        );
                      }
                    }}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-500/60 shadow-md bg-slate-800"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-200">
                    <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
                    <span className="truncate">Gambar Profil Akaun Google</span>
                  </div>
                  <span className="text-[10px] text-purple-300/80 font-mono block truncate">
                    {selectedEmail || 'Sedia untuk log masuk'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 transition text-[11px] shrink-0 ml-2"
                title="Tukar foto profil"
              >
                <Camera className="w-3 h-3" />
                <span>Tukar</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileUpload}
                className="hidden"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                Nama Panggilan Guru (Pilihan):
              </label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="cth: Cikgu Sarah"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Submit Button in vibrant Blue to Purple Gradient */}
          <button
            type="button"
            onClick={handleDirectSignIn}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950 transition active:scale-[0.98] mt-1 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Teruskan Log Masuk</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[10px] text-slate-500 text-center leading-normal">
            Sistem menggunakan gambar profil akaun Google sebenar anda tanpa sebarang pilihan avatar tiruan daripada sistem.
          </p>
        </div>
      </div>
    </div>
  );
};
