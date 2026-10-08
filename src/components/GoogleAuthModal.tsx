import React, { useState, useRef, useEffect } from 'react';
import { TeacherUser } from '../types';
import { LogIn, ShieldCheck, School, ArrowRight, UserCheck, Camera, Sparkles } from 'lucide-react';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onLogin: (user: TeacherUser) => void;
  defaultEmail?: string;
}

// Generate an authentic account profile avatar based on the account details
export const getAccountProfileAvatar = (email: string, name?: string): string => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem(`omr_account_avatar_${email}`);
    if (saved) return saved;
  }
  const cleanName = name ? name.replace(/^Cikgu\s*/i, '').trim() : '';
  const initial = (cleanName || email.replace(/@.*/, '') || 'G').charAt(0).toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="%232563eb"/>
        <stop offset="50%" stop-color="%234f46e5"/>
        <stop offset="100%" stop-color="%239333ea"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="64" fill="url(#bgGrad)"/>
    <text x="64" y="74" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="54" font-weight="700" fill="%23ffffff" text-anchor="middle" dominant-baseline="central">${initial}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onLogin,
  defaultEmail = 'g-75557213@moe-dl.edu.my',
}) => {
  const [selectedEmail, setSelectedEmail] = useState(defaultEmail);
  const [teacherName, setTeacherName] = useState('Cikgu (Akaun Guru MOE)');
  // DO NOT pre-fill school name, leave empty so only placeholder is shown
  const [schoolName, setSchoolName] = useState('');
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(() =>
    getAccountProfileAvatar(defaultEmail, 'Cikgu (Akaun Guru MOE)')
  );
  const [isCustomEmail, setIsCustomEmail] = useState(false);
  const [hasCustomUpload, setHasCustomUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync account avatar automatically when email or name changes if no custom file upload
  useEffect(() => {
    if (!hasCustomUpload) {
      setSelectedAvatarUrl(getAccountProfileAvatar(selectedEmail, teacherName));
    }
  }, [selectedEmail, teacherName, hasCustomUpload]);

  if (!isOpen) return null;

  // Handle custom photo upload directly from user's account/camera/device
  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedAvatarUrl(reader.result);
        setHasCustomUpload(true);
        try {
          localStorage.setItem(`omr_account_avatar_${selectedEmail}`, reader.result);
        } catch {
          // ignore storage quota error
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGoogleSignIn = () => {
    const user: TeacherUser = {
      id: `google-${selectedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      name: teacherName,
      email: selectedEmail,
      schoolName: schoolName.trim() || 'SMK JENERI',
      avatarUrl: selectedAvatarUrl,
    };
    onLogin(user);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-indigo-950/60 flex flex-col">
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
            Log masuk dengan akaun Google rasmi anda untuk mula menanda kertas OMR secara pintar.
          </p>
        </div>

        {/* Body Form */}
        <div className="p-6 flex flex-col gap-4 text-xs">
          {/* Quick MOE DELIMa Account Selector */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-indigo-500/30 flex flex-col gap-2.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              Akaun Google Guru Dikesan:
            </span>

            <div
              onClick={() => {
                setSelectedEmail('g-75557213@moe-dl.edu.my');
                setIsCustomEmail(false);
              }}
              className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                !isCustomEmail && selectedEmail === 'g-75557213@moe-dl.edu.my'
                  ? 'bg-gradient-to-r from-blue-900/30 via-indigo-900/40 to-purple-900/30 border-purple-500 shadow-md shadow-indigo-950'
                  : 'bg-slate-900 border-slate-800 hover:border-indigo-500/40'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Account Avatar Image (strictly from user account) */}
                <div className="relative">
                  <img
                    src={selectedAvatarUrl}
                    alt="Gambar Akaun"
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-500/60 shadow-md bg-slate-800"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
                </div>
                <div>
                  <span className="font-bold text-white block text-xs">
                    g-75557213@moe-dl.edu.my
                  </span>
                  <span className="text-[10px] text-purple-300 font-medium">
                    Google Workspace for Education (MOE DELIMa)
                  </span>
                </div>
              </div>
              {!isCustomEmail && selectedEmail === 'g-75557213@moe-dl.edu.my' && (
                <UserCheck className="w-4 h-4 text-purple-400" />
              )}
            </div>

            {/* Profile Avatar Bar - Uses Account Profile Picture directly */}
            <div className="mt-1 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Gambar Profil Akaun Dikesan</span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 transition"
                title="Muat naik foto peribadi jika ingin tukar gambar akaun"
              >
                <Camera className="w-3 h-3" />
                <span>Tukar Foto Akaun</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileUpload}
                className="hidden"
              />
            </div>

            {/* Option to use custom Google email */}
            {isCustomEmail ? (
              <div className="flex flex-col gap-2 pt-1">
                <div>
                  <label className="block text-slate-400 mb-1">Emel Google Anda:</label>
                  <input
                    type="email"
                    value={selectedEmail}
                    onChange={(e) => setSelectedEmail(e.target.value)}
                    placeholder="nama.guru@gmail.com"
                    className="w-full px-3 py-2 bg-slate-900 border border-indigo-500/40 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Nama Panggilan Guru:</label>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="cth: Cikgu Sarah"
                    className="w-full px-3 py-2 bg-slate-900 border border-indigo-500/40 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsCustomEmail(true);
                  setSelectedEmail('');
                }}
                className="text-[11px] text-indigo-400 hover:text-purple-300 hover:underline text-left font-medium mt-0.5"
              >
                Guna akaun Google lain &rarr;
              </button>
            )}
          </div>

          {/* School Name (Not pre-filled, only shows placeholder example SMK JENERI) */}
          <div>
            <label className="block text-slate-400 mb-1 font-semibold flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-purple-400" />
              Sekolah / Institusi:
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="SMK JENERI"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 uppercase font-semibold text-xs focus:outline-none focus:border-purple-500 placeholder:text-slate-500 placeholder:font-normal placeholder:normal-case"
            />
          </div>

          {/* Submit Button in vibrant Blue to Purple Gradient */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950 transition active:scale-[0.98] mt-1"
          >
            <LogIn className="w-4 h-4" />
            <span>Teruskan Sebagai {selectedEmail ? selectedEmail.split('@')[0] : 'Guru'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[10px] text-slate-500 text-center leading-normal">
            Data kelas, subjek, dan kertas yang diimbas akan diasingkan khas untuk akaun ini sahaja dan tidak akan bercampur dengan guru lain.
          </p>
        </div>
      </div>
    </div>
  );
};
