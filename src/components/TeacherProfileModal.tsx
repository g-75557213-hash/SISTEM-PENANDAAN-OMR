import React, { useRef, useState } from 'react';
import { TeacherUser } from '../types';
import { X, Camera, Sparkles, School, Mail, LogOut, Check } from 'lucide-react';
import { getAccountProfileAvatar } from './GoogleAuthModal';

interface TeacherProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: TeacherUser;
  onUpdateUser: (updatedUser: TeacherUser) => void;
  onLogout: () => void;
}

export const TeacherProfileModal: React.FC<TeacherProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onLogout,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [schoolName, setSchoolName] = useState(currentUser.schoolName || '');
  const [avatarUrl, setAvatarUrl] = useState(
    currentUser.avatarUrl || getAccountProfileAvatar(currentUser.email, currentUser.name)
  );
  const [savedFeedback, setSavedFeedback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
        try {
          localStorage.setItem(`omr_account_avatar_${currentUser.email}`, reader.result);
        } catch {
          // ignore storage quota error
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const updated: TeacherUser = {
      ...currentUser,
      name,
      schoolName: schoolName.trim() || 'SMK JENERI',
      avatarUrl,
    };
    onUpdateUser(updated);
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-indigo-950 flex flex-col">
        {/* Header with colorful blue-to-purple gradient */}
        <div className="p-5 bg-gradient-to-r from-blue-900/60 via-indigo-900/60 to-purple-900/60 border-b border-indigo-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl overflow-hidden shadow-md ring-1 ring-purple-400/40 aspect-square bg-slate-900 shrink-0 flex items-center justify-center">
              <img
                src="/src/assets/images/system_logo_1791437837470.jpg"
                alt="SISTEM PENANDAAN OMR"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">Profil Akaun Guru</h3>
              <span className="text-[10px] text-purple-300 font-medium">Google Workspace &bull; DELIMa MOE</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 flex flex-col gap-4 text-xs">
          {/* Avatar Showcase with Glow Ring */}
          <div className="flex flex-col items-center text-center p-4 bg-slate-950/70 rounded-xl border border-indigo-500/20 relative">
            <div className="relative group mb-2.5">
              <img
                src={avatarUrl}
                alt={name}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-purple-500/80 shadow-xl shadow-purple-950/60"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition backdrop-blur-xs"
                title="Tukar gambar"
              >
                <Camera className="w-5 h-5 mb-0.5" />
                <span className="text-[9px] font-bold">Tukar</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] font-bold text-purple-300 hover:text-purple-200 flex items-center gap-1.5 transition"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Muat Naik / Tukar Foto Akaun Sendiri</span>
            </button>
          </div>

          {/* Form details */}
          <div className="space-y-3">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                Emel Log Masuk Google:
              </label>
              <div className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-mono text-xs flex items-center justify-between">
                <span>{currentUser.email}</span>
                <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30">
                  DELIMa
                </span>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Nama Panggilan Guru:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-indigo-500/30 focus:border-purple-500 rounded-lg text-white font-medium text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-purple-400" />
                Sekolah:
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="SMK JENERI"
                className="w-full px-3 py-2 bg-slate-950 border border-indigo-500/30 focus:border-purple-500 rounded-lg text-white font-medium text-xs uppercase focus:outline-none placeholder:text-slate-500 placeholder:normal-case placeholder:font-normal"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-950 transition active:scale-98"
            >
              {savedFeedback ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Gambar & Profil Disimpan!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Simpan Perubahan Profil</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full py-2 px-3 bg-slate-950 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Keluar Akaun Guru</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
