"use client";

export type LocalAuthUser = {
  username: string;
  password: string;
  name: string;
  role: string;
};

export type LocalAuthSession = {
  username: string;
  name: string;
  role: string;
  loginAt: string;
};

const AUTH_USERS_KEY = "frota-pro.auth-users";
const AUTH_SESSION_KEY = "frota-pro.auth-session";
const AUTH_EVENT = "frota-pro:auth-change";

const DEFAULT_USERS: LocalAuthUser[] = [
  { username: "admin", password: "admin123", name: "Administrador", role: "Gestor" },
  { username: "operacoes", password: "123456", name: "Gestor de Operacoes", role: "Operacoes" },
];

const isBrowser = () => typeof window !== "undefined";

const emitAuthChange = () => {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(AUTH_EVENT));
};

export const getAuthUsers = (): LocalAuthUser[] => {
  if (!isBrowser()) return DEFAULT_USERS;
  try {
    const raw = window.localStorage.getItem(AUTH_USERS_KEY);
    if (!raw) {
      window.localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      window.localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    return parsed.filter(Boolean) as LocalAuthUser[];
  } catch {
    return DEFAULT_USERS;
  }
};

export const getAuthSession = (): LocalAuthSession | null => {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalAuthSession;
  } catch {
    return null;
  }
};

export const loginWithCredentials = (username: string, password: string) => {
  const normalizedUser = username.trim().toLowerCase();
  const normalizedPass = password.trim();
  if (!normalizedUser || !normalizedPass) {
    return { ok: false as const, message: "Informe usuario e senha." };
  }

  const user = getAuthUsers().find(
    (candidate) =>
      candidate.username.toLowerCase() === normalizedUser && candidate.password === normalizedPass,
  );
  if (!user) {
    return { ok: false as const, message: "Usuario ou senha invalidos." };
  }

  const session: LocalAuthSession = {
    username: user.username,
    name: user.name,
    role: user.role,
    loginAt: new Date().toISOString(),
  };

  if (isBrowser()) {
    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    emitAuthChange();
  }

  return { ok: true as const, session };
};

export const logoutAuthSession = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(AUTH_SESSION_KEY);
  emitAuthChange();
};

export const subscribeAuthSession = (callback: () => void) => {
  if (!isBrowser()) return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === AUTH_SESSION_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(AUTH_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(AUTH_EVENT, callback);
  };
};

