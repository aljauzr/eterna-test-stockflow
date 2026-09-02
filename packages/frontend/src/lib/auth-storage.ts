import { AUTH_COOKIE_KEY, AUTH_STORAGE_KEY } from "./auth-session";

export type StoredAuthSession = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    workspaceName: string;
  };
};

export function getStoredAuthSession(): StoredAuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StoredAuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function setStoredAuthSession(session: StoredAuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  document.cookie = `${AUTH_COOKIE_KEY}=${encodeURIComponent(session.accessToken)}; Path=/; SameSite=Lax`;
}

export function clearStoredAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  document.cookie = `${AUTH_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getStoredAccessToken(): string | null {
  const session = getStoredAuthSession();
  if (session?.accessToken) {
    return session.accessToken;
  }

  if (typeof document === "undefined") {
    return null;
  }

  const cookieValue = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${AUTH_COOKIE_KEY}=`))
    ?.split("=")[1];

  return cookieValue ? decodeURIComponent(cookieValue) : null;
}
