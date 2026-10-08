import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure Google Provider with requested scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Cache the access token in memory only
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface GoogleAuthResult {
  email: string;
  displayName: string;
  photoURL: string;
  accessToken: string;
  user: User;
}

/**
 * Generate Google profile avatar URL or SVG fallback for a given email
 */
export const getGoogleAccountAvatar = (email: string, name?: string): string => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem(`omr_account_avatar_${email}`);
    if (saved) return saved;
  }

  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail) {
    // Unavatar queries Google account profile photo directly for Gmail & Google Workspace / DELIMa accounts
    return `https://unavatar.io/google/${encodeURIComponent(cleanEmail)}`;
  }

  const cleanName = name ? name.replace(/^Cikgu\s*/i, '').trim() : '';
  const initial = (cleanName || 'G').charAt(0).toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="gGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="%231e40af"/>
        <stop offset="50%" stop-color="%234338ca"/>
        <stop offset="100%" stop-color="%237e22ce"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="64" fill="url(#gGrad)"/>
    <text x="64" y="74" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="700" fill="%23ffffff" text-anchor="middle" dominant-baseline="central">${initial}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/**
 * Perform Google Sign In popup with Firebase Auth
 */
export const signInWithGoogle = async (): Promise<GoogleAuthResult> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken || '';
    cachedAccessToken = accessToken;

    const email = result.user.email || '';
    const displayName = result.user.displayName || (email ? `Cikgu (${email.split('@')[0]})` : 'Cikgu');
    // Actual Google account photo URL
    const photoURL = result.user.photoURL || getGoogleAccountAvatar(email, displayName);

    if (photoURL && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`omr_account_avatar_${email}`, photoURL);
      } catch {
        // ignore quota
      }
    }

    return {
      email,
      displayName,
      photoURL,
      accessToken,
      user: result.user,
    };
  } catch (error: any) {
    console.error('Google Sign In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Listen to auth state changes
 */
export const initAuthListener = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const getCachedAccessToken = (): string | null => cachedAccessToken;

export const logoutGoogle = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};
