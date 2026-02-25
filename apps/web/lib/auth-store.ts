"use client";

/**
 * RESPONSABILIDADE:
 * Store de autenticacao local (modo demo/offline) usado pelo portal inicial,
 * WebShell, MobileShell e tela de usuarios.
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - `app/page.tsx` usa `loginWithCredentials` para liberar acesso aos modulos.
 * - `WebShell` e `MobileShell` assinam `subscribeAuthSession` para proteger rotas.
 * - `app/web/users/page.tsx` usa CRUD local enquanto o backend de identidade nao esta integrado.
 *
 * CONTRATO BACKEND: este arquivo deve ser substituido por chamadas de API
 * (`POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST/PATCH /users`)
 * retornando tokens/sessao. Estrutura esperada no frontend:
 * `{ username/email, name, role, loginAt }`.
 */

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
  // Regra de negocio: garantir pelo menos um usuario local para demos/offline.
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

const saveAuthUsers = (users: LocalAuthUser[]) => {
  if (!isBrowser()) return;
  // CONTRATO BACKEND: migrar este write para endpoints de usuarios e manter cache local opcional.
  window.localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
  emitAuthChange();
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
  // Regra de negocio: normaliza login para evitar duplicidade por caixa/espacos.
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
    // CONTRATO BACKEND: aqui deve persistir token/sessao retornados por `/auth/login`.
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

export const createAuthUser = (input: LocalAuthUser) => {
  const username = input.username.trim().toLowerCase();
  const password = input.password.trim();
  const name = input.name.trim();
  const role = input.role.trim();

  if (!username || !password || !name || !role) {
    return { ok: false as const, message: "Preencha usuario, senha, nome e perfil." };
  }

  const users = getAuthUsers();
  if (users.some((user) => user.username.toLowerCase() === username)) {
    // Regra de negocio: login unico para evitar colisao de sessao.
    return { ok: false as const, message: "Ja existe um usuario com esse login." };
  }

  const next = [...users, { username, password, name, role }];
  saveAuthUsers(next);
  return { ok: true as const, users: next };
};

export const updateAuthUser = (
  username: string,
  updates: Partial<Pick<LocalAuthUser, "password" | "name" | "role">>,
) => {
  const normalized = username.trim().toLowerCase();
  const users = getAuthUsers();
  let changed = false;
  const next = users.map((user) => {
    if (user.username.toLowerCase() !== normalized) return user;
    changed = true;
    return {
      ...user,
      password: updates.password?.trim() ? updates.password.trim() : user.password,
      name: updates.name?.trim() ? updates.name.trim() : user.name,
      role: updates.role?.trim() ? updates.role.trim() : user.role,
    };
  });
  if (!changed) return { ok: false as const, message: "Usuario nao encontrado." };
  saveAuthUsers(next);
  return { ok: true as const, users: next };
};

export const removeAuthUser = (username: string) => {
  const normalized = username.trim().toLowerCase();
  const users = getAuthUsers();
  const next = users.filter((user) => user.username.toLowerCase() !== normalized);
  if (next.length === users.length) {
    return { ok: false as const, message: "Usuario nao encontrado." };
  }
  if (next.length === 0) {
    // Regra de negocio: evita lock-out em ambiente local de demonstracao.
    return { ok: false as const, message: "Mantenha pelo menos um usuario no sistema." };
  }
  saveAuthUsers(next);
  return { ok: true as const, users: next };
};

export const subscribeAuthSession = (callback: () => void) => {
  if (!isBrowser()) return () => undefined;
  // Fluxo de dados: mesma aba (evento custom) + outras abas (storage).
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

export const subscribeAuthUsers = subscribeAuthSession;
