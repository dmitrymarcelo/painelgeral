"use client";
import { apiRequest } from "@/lib/api-client";

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

export type AppUserRole = "Operacoes" | "Gestor" | "Tecnico" | "Administrador";

export type LocalAuthSession = {
  authMode: "local" | "api";
  userId?: string;
  username: string;
  email?: string;
  name: string;
  role: string;
  tenantId?: string;
  accessToken?: string;
  refreshToken?: string;
  loginAt: string;
};

export type AppRolePermissions = {
  canCreateSchedule: boolean;
  canRescheduleCalendar: boolean;
  canEditSchedulingDetails: boolean;
  canChangeExecutionStatus: boolean;
  canCompleteMaintenance: boolean;
  canInformMaintenanceKm: boolean;
  canDeleteSchedule: boolean;
  canManageUsers: boolean;
  isAdmin: boolean;
};

const AUTH_USERS_KEY = "frota-pro.auth-users";
const AUTH_SESSION_KEY = "frota-pro.auth-session";
const AUTH_EVENT = "frota-pro:auth-change";

const DEFAULT_USERS: LocalAuthUser[] = [
  { username: "admin", password: "admin123", name: "Administrador", role: "Administrador" },
  { username: "operacoes", password: "123456", name: "Gestor de Operacoes", role: "Operacoes" },
];

const isBrowser = () => typeof window !== "undefined";

const emitAuthChange = () => {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(AUTH_EVENT));
};

const enforceLocalAdminRole = <T extends { username?: string; role?: string; authMode?: string }>(record: T): T => {
  const username = String(record.username ?? "").trim().toLowerCase();
  if (username !== "admin") return record;
  if ("authMode" in record && record.authMode && record.authMode !== "local") return record;
  if (record.role === "Administrador") return record;
  // Regra de negocio: o login local `admin` e reservado para acesso total no ambiente demo.
  return { ...record, role: "Administrador" };
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
    const users = (parsed.filter(Boolean) as LocalAuthUser[]).map((user) => enforceLocalAdminRole(user));
    // Migra storage antigo onde `admin` foi salvo como Gestor.
    window.localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
    return users;
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
    const parsed = JSON.parse(raw) as LocalAuthSession;
    const migrated = enforceLocalAdminRole(parsed) as LocalAuthSession;
    if (JSON.stringify(parsed) !== JSON.stringify(migrated)) {
      window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return null;
  }
};

export const isApiAuthSession = (
  session: LocalAuthSession | null,
): session is LocalAuthSession & { authMode: "api"; accessToken: string; tenantId: string } =>
  Boolean(session && session.authMode === "api" && session.accessToken && session.tenantId);

export const normalizeAppUserRole = (role?: string | null): AppUserRole => {
  const normalized = (role ?? "").trim().toUpperCase();
  if (["ADMIN", "ADMINISTRADOR"].includes(normalized)) return "Administrador";
  if (["OPERACOES", "OPERAÇÕES"].includes(normalized)) return "Operacoes";
  if (["TECNICO", "TÉCNICO"].includes(normalized)) return "Tecnico";
  if (normalized === "GESTOR") return "Gestor";
  // Fallback conservador: gestor no contexto atual e o perfil operacional mais comum.
  return "Gestor";
};

export const getRolePermissions = (
  sessionOrRole: LocalAuthSession | string | null | undefined,
): AppRolePermissions => {
  const role =
    typeof sessionOrRole === "string"
      ? normalizeAppUserRole(sessionOrRole)
      : normalizeAppUserRole(sessionOrRole?.role);

  const isAdmin = role === "Administrador";

  // Regra de negocio (definida pelo fluxo operacional do projeto):
  // - Operacoes: somente criar agendamento
  // - Gestor: criar + remanejar datas/agendamento
  // - Tecnico: mesmas funcoes do gestor + finalizar e informar KM
  // - Administrador: acesso total
  if (isAdmin) {
    return {
      canCreateSchedule: true,
      canRescheduleCalendar: true,
      canEditSchedulingDetails: true,
      canChangeExecutionStatus: true,
      canCompleteMaintenance: true,
      canInformMaintenanceKm: true,
      canDeleteSchedule: true,
      canManageUsers: true,
      isAdmin: true,
    };
  }

  if (role === "Tecnico") {
    return {
      canCreateSchedule: true,
      canRescheduleCalendar: true,
      // Regra de negocio: tecnico remaneja (data/horario) e executa, mas nao altera
      // metadados administrativos do agendamento (ativo/descricao) sem aval administrativo.
      canEditSchedulingDetails: false,
      canChangeExecutionStatus: true,
      canCompleteMaintenance: true,
      canInformMaintenanceKm: true,
      canDeleteSchedule: false,
      canManageUsers: false,
      isAdmin: false,
    };
  }

  if (role === "Gestor") {
    return {
      canCreateSchedule: true,
      canRescheduleCalendar: true,
      // Gestor pode agendar/remanejar datas, mas nao editar detalhes de execucao/cadastro.
      canEditSchedulingDetails: false,
      canChangeExecutionStatus: false,
      canCompleteMaintenance: false,
      canInformMaintenanceKm: false,
      canDeleteSchedule: false,
      canManageUsers: false,
      isAdmin: false,
    };
  }

  return {
    canCreateSchedule: true,
    canRescheduleCalendar: false,
    canEditSchedulingDetails: false,
    canChangeExecutionStatus: false,
    canCompleteMaintenance: false,
    canInformMaintenanceKm: false,
    canDeleteSchedule: false,
    canManageUsers: false,
    isAdmin: false,
  };
};

export const getAuthApiContext = () => {
  const session = getAuthSession();
  if (!isApiAuthSession(session)) return null;
  return {
    token: session.accessToken as string,
    tenantId: session.tenantId as string,
    session,
  };
};

type ApiLoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    tenantId: string;
    name: string;
    email: string;
    roles: string[];
  };
};

export const loginWithCredentials = async (username: string, password: string) => {
  // Regra de negocio: normaliza login para evitar duplicidade por caixa/espacos.
  const normalizedUser = username.trim().toLowerCase();
  const normalizedPass = password.trim();
  if (!normalizedUser || !normalizedPass) {
    return { ok: false as const, message: "Informe usuario e senha." };
  }

  const wantsApiAuth =
    normalizedUser.includes("@") ||
    (typeof window !== "undefined" &&
      window.localStorage.getItem("frota-pro.auth-mode") === "api");

  if (wantsApiAuth) {
    try {
      const tenantSlug =
        (typeof window !== "undefined" && window.localStorage.getItem("frota-pro.tenant-slug")) ||
        process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ||
        "frota-pro";
      const response = await apiRequest<ApiLoginResponse>("/auth/login", {
        method: "POST",
        tenantId: tenantSlug,
        body: { email: normalizedUser, password: normalizedPass },
      });

      const primaryRole = response.user.roles?.[0] || "Usuario";
      const session: LocalAuthSession = {
        authMode: "api",
        userId: response.user.id,
        username: response.user.email,
        email: response.user.email,
        name: response.user.name,
        role: primaryRole,
        tenantId: response.user.tenantId,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        loginAt: new Date().toISOString(),
      };

      if (isBrowser()) {
        window.localStorage.setItem("frota-pro.auth-mode", "api");
        window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
        emitAuthChange();
      }

      return { ok: true as const, session };
    } catch (error) {
      // Se o login parece local (sem email), cai no fluxo local. Com email, retorna erro da API.
      if (normalizedUser.includes("@")) {
        return {
          ok: false as const,
          message:
            error instanceof Error ? `Falha no login API: ${error.message}` : "Falha no login API.",
        };
      }
    }
  }

  const user = getAuthUsers().find(
    (candidate) =>
      candidate.username.toLowerCase() === normalizedUser && candidate.password === normalizedPass,
  );
  if (!user) {
    return { ok: false as const, message: "Usuario ou senha invalidos." };
  }

  const session: LocalAuthSession = {
    authMode: "local",
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
