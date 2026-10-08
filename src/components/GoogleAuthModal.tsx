import React, { useState, useRef } from 'react';
import { TeacherUser } from '../types';
import { LogIn, ShieldCheck, School, ArrowRight, UserCheck, Camera, Sparkles, Image as ImageIcon } from 'lucide-react';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onLogin: (user: TeacherUser) => void;
  defaultEmail?: string;
}

// Preset avatars for teachers with colorful backgrounds
const PRESET_AVATARS = [
  {
    id: 'moe-educator-1',
    label: 'Cikgu Rasmi MOE',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'moe-educator-2',
    label: 'Cikgu Lelaki',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar-illust-1',
    label: 'Avatar Digital',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=TeacherMOE&backgroundColor=6366f1,a855f7',
  },
  {
    id: 'avatar-illust-2',
    label: 'Avatar Ceria',
    url: 'https://api.dicebear.com/7.x/micah/svg?seed=TeacherDELIMa&backgroundColor=3b82f6,8b5cf6',
  },
];

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onLogin,
  defaultEmail = 'g-75557213@moe-dl.edu.my',
}) => {
  const [selectedEmail, setSelectedEmail] = useState(defaultEmail);
  const [teacherName, setTeacherName] = useState('Cikgu (Akaun Guru MOE)');
  const [schoolName, setSchoolName] = useState('SMK BANDAR UTAMA DAMANSARA');
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(PRESET_AVATARS[0].url);
  const [isCustomEmail, setIsCustomEmail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Handle custom photo upload
  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGoogleSignIn = () => {
    const user: TeacherUser = {
      id: `google-${selectedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      name: teacherName,
      email: selectedEmail,
      schoolName,
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

          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-3 text-white ring-2 ring-purple-400/30">
            <svg className="w-8 h-8" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
            Log Masuk Akaun Guru
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-purple-300 border border-purple-500/30">
              DELIMa
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Log masuk dengan akaun Google rasmi anda. Gambar akaun dan rekod penandaan akan disimpan khusus untuk anda.
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
                {/* Account Avatar Image */}
                <div className="relative">
                  <img
                    src={selectedAvatarUrl}
                    alt="Gambar Akaun"
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-500/60 shadow-md"
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

            {/* Profile Avatar Selection Bar */}
            <div className="mt-1 pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  Pilih / Muat Naik Gambar Akaun:
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                >
                  <Camera className="w-3 h-3" />
                  Foto Sendiri
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileUpload}
                  className="hidden"
                />
              </div>

              {/* Preset avatar circles */}
              <div className="flex items-center gap-2">
                {PRESET_AVATARS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setSelectedAvatarUrl(av.url)}
                    className={`relative rounded-full p-0.5 transition ${
                      selectedAvatarUrl === av.url
                        ? 'ring-2 ring-purple-400 scale-105 shadow-md shadow-purple-500/40'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    title={av.label}
                  >
                    <img
                      src={av.url}
                      alt={av.label}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  </button>
                ))}
              </div>
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

          {/* School Name (Optional) */}
          <div>
            <label className="block text-slate-400 mb-1 font-semibold flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-purple-400" />
              Sekolah / Institusi:
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 uppercase font-semibold text-xs focus:outline-none focus:border-purple-500"
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
