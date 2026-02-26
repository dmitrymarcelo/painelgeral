"use client";

import { useEffect, useMemo, useState } from "react";
import { WebShell } from "@/components/layout/web-shell";
import { apiRequest } from "@/lib/api-client";
import {
  createAuthUser,
  getAuthApiContext,
  getAuthSession,
  getAuthUsers,
  getRolePermissions,
  isApiAuthSession,
  normalizeAppUserRole,
  removeAuthUser,
  subscribeAuthSession,
  subscribeAuthUsers,
  updateAuthUser,
} from "@/lib/auth-store";
import { clearLocalDemoData, getLocalDemoSeedInfo, resetAndSeedLocalDemoData } from "@/lib/test-data-seed";

type FormState = {
  id?: string;
  username: string;
  password: string;
  name: string;
  role: string;
  active?: boolean;
};

type ApiUserRow = {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  userRoles?: { role?: { code?: string } }[];
};

type UsersTableRow = {
  id?: string;
  username: string;
  name: string;
  role: string;
  active: boolean;
  source: "local" | "api";
};

const ROLE_OPTIONS = ["Operacoes", "Gestor", "Tecnico", "Administrador"] as const;

const emptyForm = (): FormState => ({
  username: "",
  password: "",
  name: "",
  role: "Operacoes",
});

export default function WebUsersPage() {
  const [authSession, setAuthSession] = useState(getAuthSession());
  const [users, setUsers] = useState<UsersTableRow[]>(
    getAuthUsers().map((user) => ({
      username: user.username,
      name: user.name,
      role: user.role,
      active: true,
      source: "local",
    })),
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [seedInfo, setSeedInfo] = useState<{ version: string | null; hasSeed: boolean } | null>(null);

  const apiMode = useMemo(() => isApiAuthSession(authSession), [authSession]);
  const currentPermissions = useMemo(() => getRolePermissions(authSession), [authSession]);
  const normalizedCurrentRole = useMemo(() => normalizeAppUserRole(authSession?.role), [authSession]);

  const mapApiUserToRow = (user: ApiUserRow): UsersTableRow => ({
    id: user.id,
    username: user.email,
    name: user.name,
    role: normalizeAppUserRole(user.userRoles?.[0]?.role?.code),
    active: Boolean(user.isActive),
    source: "api",
  });

  const refreshLocalUsers = () =>
    setUsers(
      getAuthUsers().map((user) => ({
        username: user.username,
        name: user.name,
        role: user.role,
        active: true,
        source: "local",
      })),
    );

  const refreshApiUsers = async () => {
    const ctx = getAuthApiContext();
    if (!ctx) return;
    setLoading(true);
    try {
      const apiUsers = await apiRequest<ApiUserRow[]>("/users", {
        method: "GET",
        tenantId: ctx.tenantId,
        token: ctx.token,
      });
      setUsers(apiUsers.map(mapApiUserToRow));
    } catch (error) {
      setMessage(error instanceof Error ? `Falha ao carregar usuarios da API: ${error.message}` : "Falha ao carregar usuarios da API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const refreshSession = () => setAuthSession(getAuthSession());
    refreshSession();
    return subscribeAuthSession(refreshSession);
  }, []);

  useEffect(() => {
    if (apiMode) {
      void refreshApiUsers();
      return () => undefined;
    }
    refreshLocalUsers();
    return subscribeAuthUsers(refreshLocalUsers);
  }, [apiMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSeedInfo(getLocalDemoSeedInfo());
  }, [users.length, apiMode]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditingUsername(null);
  };

  const handleSubmit = async () => {
    if (!currentPermissions.canManageUsers) {
      setMessage("Somente Administrador pode cadastrar ou editar usuarios.");
      return;
    }

    if (apiMode) {
      const ctx = getAuthApiContext();
      if (!ctx) {
        setMessage("Sessao API invalida. Faca login novamente.");
        return;
      }

      try {
        setLoading(true);
        const roleMap: Record<string, string> = {
          Administrador: "ADMIN",
          Gestor: "GESTOR",
          Operacoes: "OPERACOES",
          Tecnico: "TECNICO",
        };
        if (editingUsername && form.id) {
          await apiRequest(`/users/${form.id}`, {
            method: "PATCH",
            tenantId: ctx.tenantId,
            token: ctx.token,
            body: {
              name: form.name,
              email: form.username,
              password: form.password || undefined,
              roles: [roleMap[form.role] || "TECNICO"],
              isActive: form.active ?? true,
            },
          });
          setMessage("Usuario atualizado na API com sucesso.");
        } else {
          await apiRequest("/users", {
            method: "POST",
            tenantId: ctx.tenantId,
            token: ctx.token,
            body: {
              name: form.name,
              email: form.username,
              password: form.password,
              roles: [roleMap[form.role] || "TECNICO"],
              isActive: true,
            },
          });
          setMessage("Usuario cadastrado na API com sucesso.");
        }
        resetForm();
        await refreshApiUsers();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Falha ao salvar usuario na API.");
      } finally {
        setLoading(false);
      }
      return;
    }

    const result = editingUsername
      ? updateAuthUser(editingUsername, {
          name: form.name,
          role: form.role,
          password: form.password || undefined,
        })
      : createAuthUser(form as FormState);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setMessage(editingUsername ? "Usuario atualizado com sucesso." : "Usuario cadastrado com sucesso.");
    resetForm();
    refreshLocalUsers();
  };

  const handleResetAndSeed = () => {
    if (!currentPermissions.canManageUsers) {
      setMessage("Somente Administrador pode resetar/popular dados locais de teste.");
      return;
    }
    const result = resetAndSeedLocalDemoData();
    setMessage(result.message);
    setAuthSession(getAuthSession());
    refreshLocalUsers();
    setSeedInfo(getLocalDemoSeedInfo());
  };

  const handleClearLocalData = () => {
    if (!currentPermissions.canManageUsers) {
      setMessage("Somente Administrador pode limpar dados locais.");
      return;
    }
    clearLocalDemoData();
    setMessage("Dados locais de demonstracao foram limpos. Recarregue a pagina para reidratar stores basicas.");
    setSeedInfo(getLocalDemoSeedInfo());
    refreshLocalUsers();
  };

  return (
    <WebShell title="Usuarios de Acesso" subtitle="Controle local de login">
      <div className="space-y-5">
        {!currentPermissions.canManageUsers && (
          <div className="card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Apenas <strong>Administrador</strong> pode gerenciar usuarios. Seu perfil atual:{" "}
            <strong>{normalizedCurrentRole}</strong>.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="kpi-card border-l-4 border-l-slate-400 bg-gradient-to-b from-white to-slate-50">
            <p className="stat-label">Usuarios</p>
            <p className="text-4xl font-black">{users.length}</p>
            <p className="text-xs text-slate-500">{apiMode ? "Cadastros via API" : "Cadastros locais"}</p>
          </div>
          <div className="kpi-card border-l-4 border-l-blue-500 bg-gradient-to-b from-white to-blue-50/30">
            <p className="stat-label">Perfis</p>
            <p className="text-4xl font-black text-blue-700">{new Set(users.map((u) => u.role)).size}</p>
            <p className="text-xs text-slate-500">Tipos de acesso</p>
          </div>
          <div className="kpi-card border-l-4 border-l-emerald-500 bg-gradient-to-b from-white to-emerald-50/30">
            <p className="stat-label">Modo</p>
            <p className="text-2xl font-black text-emerald-700">Local</p>
            <p className="text-xs text-slate-500">{apiMode ? "Base backend (API)" : "Base em localStorage (demo)"}</p>
          </div>
        </div>

        {!apiMode && (
          <div className="card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  Massa de Testes (Local)
                </p>
                <p className="text-sm text-slate-500">
                  Limpa e popula dados de demonstracao nas abas Web/App (calendario, OS, ativos e planos preventivos).
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                  seedInfo?.hasSeed ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                }`}
              >
                {seedInfo?.hasSeed ? `Seed ${seedInfo.version}` : "Sem seed aplicada"}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleResetAndSeed}
                disabled={!currentPermissions.canManageUsers}
                className="rounded-xl bg-[var(--color-brand)] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                Limpar e Popular Dados de Teste
              </button>
              <button
                onClick={handleClearLocalData}
                disabled={!currentPermissions.canManageUsers}
                className="rounded-xl border border-slate-300 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Limpar Dados Locais
              </button>
            </div>
          </div>
        )}

        <div className="card p-5">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Regras de perfis (fluxo do projeto)</p>
            <p className="text-sm text-slate-500">
              Matriz aplicada ao calendario e acoes operacionais do sistema.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                role: "Operacoes",
                color: "border-l-blue-500 from-blue-50/40",
                rules: "Agendar somente",
              },
              {
                role: "Gestor",
                color: "border-l-indigo-500 from-indigo-50/40",
                rules: "Agendar e remanejar datas no calendario",
              },
              {
                role: "Tecnico",
                color: "border-l-emerald-500 from-emerald-50/40",
                rules: "Agendar, remanejar, finalizar e informar KM",
              },
              {
                role: "Administrador",
                color: "border-l-rose-500 from-rose-50/40",
                rules: "Acesso total ao sistema",
              },
            ].map((item) => (
              <div key={item.role} className={`rounded-xl border border-slate-200 border-l-4 bg-gradient-to-b to-white p-4 ${item.color}`}>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{item.role}</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">{item.rules}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                Cadastro de Usuario
              </p>
              <p className="text-sm text-slate-500">
                {apiMode
                  ? "Cadastre ou edite usuarios reais na API (tenant autenticado)."
                  : "Cadastre ou edite usuarios para acesso ao sistema (login local)."}
              </p>
            </div>
            {editingUsername && (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-700">
                Editando {editingUsername}
              </span>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              value={form.username}
              disabled={Boolean(editingUsername)}
              onChange={(e) => setForm((c) => ({ ...c, username: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
              placeholder={apiMode ? "E-mail do usuario" : "Usuario (login)"}
            />
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              placeholder={editingUsername ? "Nova senha (opcional)" : "Senha"}
            />
            <input
              value={form.name}
              onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="Nome completo"
            />
            <select
              value={form.role}
              onChange={(e) => setForm((c) => ({ ...c, role: e.target.value }))}
              disabled={!currentPermissions.canManageUsers}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!currentPermissions.canManageUsers}
              className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? "Salvando..." : editingUsername ? "Salvar Alteracoes" : "Cadastrar Usuario"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-700 hover:bg-slate-50"
            >
              Limpar
            </button>
            {message && <p className="text-sm font-semibold text-slate-600">{message}</p>}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Usuarios cadastrados ({users.length})
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Perfil</th>
                <th className="px-6 py-4">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.username} className="border-b border-slate-100">
                  <td className="px-6 py-4 font-mono font-bold">{user.username}</td>
                  <td className="px-6 py-4">{user.name}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black uppercase text-blue-700">
                      {user.role}
                    </span>
                    {!user.active && (
                      <span className="ml-2 rounded-full bg-rose-100 px-2 py-1 text-[10px] font-black uppercase text-rose-700">
                        Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={!currentPermissions.canManageUsers}
                        onClick={() => {
                          if (!currentPermissions.canManageUsers) return;
                          setEditingUsername(user.username);
                          setForm({
                            id: user.id,
                            username: user.username,
                            password: "",
                            name: user.name,
                            role: user.role,
                            active: user.active,
                          });
                          setMessage("");
                        }}
                        className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-black uppercase text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={!currentPermissions.canManageUsers}
                        onClick={() => {
                          void (async () => {
                            if (!currentPermissions.canManageUsers) {
                              setMessage("Somente Administrador pode alterar cadastros de usuarios.");
                              return;
                            }
                            if (apiMode) {
                              const ctx = getAuthApiContext();
                              if (!ctx || !user.id) {
                                setMessage("Sessao API invalida.");
                                return;
                              }
                              try {
                                setLoading(true);
                                await apiRequest(`/users/${user.id}/status`, {
                                  method: "PATCH",
                                  tenantId: ctx.tenantId,
                                  token: ctx.token,
                                  body: { isActive: false },
                                });
                                setMessage("Usuario inativado com sucesso.");
                                await refreshApiUsers();
                                if (editingUsername === user.username) resetForm();
                              } catch (error) {
                                setMessage(error instanceof Error ? error.message : "Falha ao inativar usuario.");
                              } finally {
                                setLoading(false);
                              }
                              return;
                            }

                            const result = removeAuthUser(user.username);
                            setMessage(result.ok ? "Usuario removido com sucesso." : result.message);
                            refreshLocalUsers();
                            if (editingUsername === user.username) resetForm();
                          })();
                        }}
                        className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-black uppercase text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {apiMode ? "Inativar" : "Remover"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </WebShell>
  );
}
