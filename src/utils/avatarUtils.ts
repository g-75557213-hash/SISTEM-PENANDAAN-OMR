// Utility to generate vibrant SVG avatar for Malaysian teachers based on code/name or chosen role

export const TEACHER_AVATAR_PRESETS = [
  { id: 'cikgu_lelaki_1', label: 'Cikgu Lelaki (Sut)', color1: '#1e40af', color2: '#3b82f6', iconText: '👨‍🏫' },
  { id: 'cikgu_wanita_1', label: 'Cikgu Wanita (Tudung)', color1: '#7e22ce', color2: '#a855f7', iconText: '👩‍🏫' },
  { id: 'cikgu_sains', label: 'Cikgu Sains / STEM', color1: '#047857', color2: '#10b981', iconText: '🔬' },
  { id: 'cikgu_matematik', label: 'Cikgu Matematik', color1: '#c2410c', color2: '#f97316', iconText: '📐' },
  { id: 'cikgu_bahasa', label: 'Cikgu Bahasa / Sastera', color1: '#b91c1c', color2: '#ef4444', iconText: '📚' },
  { id: 'cikgu_inovasi', label: 'Cikgu Inovasi Digital', color1: '#4338ca', color2: '#6366f1', iconText: '⚡' },
];

export const getTeacherAvatarSvg = (code: string, name?: string, iconText?: string): string => {
  const cleanCode = (code || 'GURU').trim().toUpperCase();
  const cleanName = (name || cleanCode).trim();
  
  // Calculate deterministic color hash
  let hash = 0;
  for (let i = 0; i < cleanCode.length; i++) {
    hash = cleanCode.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 45) % 360;

  const displayChar = iconText || cleanName.replace(/^Cikgu\s*/i, '').charAt(0).toUpperCase() || 'C';

  const isEmoji = displayChar.length > 1 || /\p{Extended_Pictographic}/u.test(displayChar);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="g_${Math.abs(hash)}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="hsl(${hue1}, 75%, 35%)"/>
        <stop offset="100%" stop-color="hsl(${hue2}, 85%, 55%)"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="64" fill="url(#g_${Math.abs(hash)})"/>
    <text x="64" y="${isEmoji ? 76 : 74}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${isEmoji ? '56' : '52'}" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${displayChar}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
