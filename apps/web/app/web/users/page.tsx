"use client";

import { useEffect, useState } from "react";
import { WebShell } from "@/components/layout/web-shell";
import {
  createAuthUser,
  getAuthUsers,
  removeAuthUser,
  subscribeAuthUsers,
  updateAuthUser,
} from "@/lib/auth-store";

type FormState = {
  username: string;
  password: string;
  name: string;
  role: string;
};

const emptyForm = (): FormState => ({
  username: "",
  password: "",
  name: "",
  role: "Operacoes",
});

export default function WebUsersPage() {
  const [users, setUsers] = useState(getAuthUsers());
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const refresh = () => setUsers(getAuthUsers());
    refresh();
    return subscribeAuthUsers(refresh);
  }, []);

  const resetForm = () => {
    setForm(emptyForm());
    setEditingUsername(null);
  };

  const handleSubmit = () => {
    const result = editingUsername
      ? updateAuthUser(editingUsername, {
          name: form.name,
          role: form.role,
          password: form.password || undefined,
        })
      : createAuthUser(form);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setMessage(editingUsername ? "Usuario atualizado com sucesso." : "Usuario cadastrado com sucesso.");
    resetForm();
    setUsers(getAuthUsers());
  };

  return (
    <WebShell title="Usuarios de Acesso" subtitle="Controle local de login">
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="kpi-card border-l-4 border-l-slate-400 bg-gradient-to-b from-white to-slate-50">
            <p className="stat-label">Usuarios</p>
            <p className="text-4xl font-black">{users.length}</p>
            <p className="text-xs text-slate-500">Cadastros locais</p>
          </div>
          <div className="kpi-card border-l-4 border-l-blue-500 bg-gradient-to-b from-white to-blue-50/30">
            <p className="stat-label">Perfis</p>
            <p className="text-4xl font-black text-blue-700">{new Set(users.map((u) => u.role)).size}</p>
            <p className="text-xs text-slate-500">Tipos de acesso</p>
          </div>
          <div className="kpi-card border-l-4 border-l-emerald-500 bg-gradient-to-b from-white to-emerald-50/30">
            <p className="stat-label">Modo</p>
            <p className="text-2xl font-black text-emerald-700">Local</p>
            <p className="text-xs text-slate-500">Base em localStorage (demo)</p>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                Cadastro de Usuario
              </p>
              <p className="text-sm text-slate-500">
                Cadastre ou edite usuarios para acesso ao sistema (login local).
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
              placeholder="Usuario (login)"
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
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            >
              <option value="Operacoes">Operacoes</option>
              <option value="Gestor">Gestor</option>
              <option value="Tecnico">Tecnico</option>
              <option value="Administrador">Administrador</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white hover:bg-blue-700"
            >
              {editingUsername ? "Salvar Alteracoes" : "Cadastrar Usuario"}
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
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingUsername(user.username);
                          setForm({
                            username: user.username,
                            password: "",
                            name: user.name,
                            role: user.role,
                          });
                          setMessage("");
                        }}
                        className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-black uppercase text-blue-700 hover:bg-blue-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const result = removeAuthUser(user.username);
                          setMessage(result.ok ? "Usuario removido com sucesso." : result.message);
                          setUsers(getAuthUsers());
                          if (editingUsername === user.username) resetForm();
                        }}
                        className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-black uppercase text-red-700 hover:bg-red-50"
                      >
                        Remover
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

