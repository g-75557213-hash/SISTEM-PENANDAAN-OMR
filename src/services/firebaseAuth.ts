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
 * Decode Google JWT Credential (ID Token) safely without external libraries
 */
export const decodeGoogleJwt = (
  credential: string
): { email?: string; name?: string; picture?: string; sub?: string } => {
  try {
    const base64Url = credential.split('.')[1];
    if (!base64Url) return {};
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
};

export const getGoogleClientId = (): string => {
  return (
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) ||
    (firebaseConfig as any).oAuthClientId ||
    '477104692393-0ajjtk3vj6f46e7q66lho5v3kdsq5ook.apps.googleusercontent.com'
  );
};

/**
 * Attempt Google Sign-In via Google Identity Services (GIS) OAuth with strict timeout
 */
const signInWithGoogleIdentityServices = (): Promise<GoogleAuthResult | null> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
      resolve(null);
      return;
    }

    let isResolved = false;
    const safeResolve = (res: GoogleAuthResult | null) => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timer);
        resolve(res);
      }
    };

    // Prevent hanging forever if user closes popup or Google shows Error 400
    const timer = setTimeout(() => {
      safeResolve(null);
    }, 15000);

    try {
      const clientId = getGoogleClientId();

      const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        prompt: 'select_account',
        callback: async (tokenResponse: any) => {
          if (!tokenResponse || !tokenResponse.access_token) {
            safeResolve(null);
            return;
          }

          try {
            const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });
            const profile = await resp.json();
            const email = profile.email || '';
            const displayName =
              profile.name || (email ? `Cikgu (${email.split('@')[0]})` : 'Cikgu');
            const photoURL =
              profile.picture || getGoogleAccountAvatar(email, displayName);

            cachedAccessToken = tokenResponse.access_token;

            if (photoURL && typeof window !== 'undefined') {
              try {
                localStorage.setItem(`omr_account_avatar_${email}`, photoURL);
              } catch {
                // ignore
              }
            }

            safeResolve({
              email,
              displayName,
              photoURL,
              accessToken: tokenResponse.access_token,
              user: { email, displayName, photoURL } as User,
            });
          } catch {
            safeResolve(null);
          }
        },
        error_callback: () => {
          safeResolve(null);
        },
      });

      tokenClient.requestAccessToken();
    } catch {
      safeResolve(null);
    }
  });
};

/**
 * Perform Google Sign In popup with GIS or Firebase Auth
 */
export const signInWithGoogle = async (): Promise<GoogleAuthResult> => {
  try {
    isSigningIn = true;

    // 1. Try Google Identity Services first (GIS is officially configured for this app's OAuth client)
    const gisResult = await signInWithGoogleIdentityServices();
    if (gisResult && gisResult.email) {
      return gisResult;
    }

    // 2. Fallback to Firebase Popup
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
    console.warn('Google Sign In caught error:', error);
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
