"use client";

/**
 * RESPONSABILIDADE:
 * Portal de entrada do sistema (selecao de modulo + autenticacao local de demonstracao).
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - Compartilha sessao com `WebShell` e `MobileShell` via `auth-store`.
 * - Controla o bloqueio de navegacao para modulos sem login.
 *
 * CONTRATO BACKEND: substituir login local por `/auth/login` e `/auth/me`;
 * esta tela permanece como ponto de autenticacao e escolha de modulo.
 */
import Link from "next/link";
import { MouseEvent, useEffect, useState } from "react";
import { MonitorIcon, SmartphoneIcon } from "@/components/ui/icons";
import {
  getAuthSession,
  getAuthUsers,
  loginWithCredentials,
  logoutAuthSession,
  subscribeAuthSession,
} from "@/lib/auth-store";
export default function PortalPage() {
  const [authUser, setAuthUser] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFeedback, setAuthFeedback] = useState("");
  const [authSession, setAuthSession] = useState(getAuthSession());

  useEffect(() => {
    const refresh = () => setAuthSession(getAuthSession());
    refresh();
    return subscribeAuthSession(refresh);
  }, []);

  const handleLogin = async () => {
    // Regra de negocio: o portal valida o acesso e delega autorizacao fina aos modulos/API.
    const result = await loginWithCredentials(authUser, authPassword);
    if (!result.ok) {
      setAuthFeedback(result.message);
      return;
    }
    setAuthFeedback(
      `Login realizado: ${result.session.name} (${result.session.role}) [${result.session.authMode.toUpperCase()}]`,
    );
    setAuthPassword("");
  };

  const handleLogout = () => {
    logoutAuthSession();
    setAuthFeedback("Sessao de usuario encerrada.");
  };

  const guardModuleNavigation = (event: MouseEvent<HTMLAnchorElement>) => {
    // Regra de negocio: bloqueio client-side para UX; backend continua sendo a fonte de verdade.
    if (authSession) return;
    event.preventDefault();
    setAuthFeedback("Realize login com usuario e senha para acessar os modulos.");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--color-bg)]">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.64]"
          style={{
            backgroundImage: "url('/norte-tech-jf.svg')",
            backgroundSize: "120% 120%",
            backgroundPosition: "center",
            filter: "saturate(0.9) contrast(0.95)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-[#f6f7f8]/76 to-[#f6f7f8]/92" />
      </div>

      <section className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-12 md:py-18">
        <div className="mx-auto mb-8 w-full max-w-3xl">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Acesso ao Sistema</p>
              <span
                className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                  authSession ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {authSession ? "Autenticado" : "Login requerido"}
              </span>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input
                value={authUser}
                onChange={(event) => setAuthUser(event.target.value)}
                placeholder="Usuario"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              />
              <input
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder="Senha"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={handleLogin}
                className="rounded-xl bg-[var(--color-brand)] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white"
              >
                Entrar
              </button>
              <button
                onClick={handleLogout}
                className="rounded-xl border border-slate-300 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-600"
              >
                Sair
              </button>
              <Link
                href="/web/users"
                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-blue-700"
              >
                Usuarios de Acesso
              </Link>
            </div>

            <p className="mt-3 text-sm text-slate-600">
              {authSession
                ? `Usuario ativo: ${authSession.name} (${authSession.role}) - modo ${authSession.authMode}`
                : "Faça login para liberar o acesso aos modulos Web e App."}
            </p>
            {authFeedback && <p className="mt-1 text-xs font-semibold text-slate-500">{authFeedback}</p>}
            <p className="mt-2 text-xs text-slate-500">
              Usuarios de teste: {getAuthUsers().map((user) => `${user.username}/${user.password}`).join(" • ")}
            </p>
          </div>
        </div>

        <div className="mb-10 text-center">
          <h1 className="text-5xl font-black tracking-tight text-slate-900">Selecione o Modulo</h1>
          <p className="mt-3 text-lg text-slate-600">Escolha qual ambiente deseja acessar para gerenciar suas operacoes</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/web/dashboard"
            onClick={guardModuleNavigation}
            className="card group relative overflow-hidden rounded-3xl p-8 transition hover:-translate-y-0.5"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-slate-100"></div>
            <div className="relative">
              <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-brand)] text-white shadow-lg">
                <MonitorIcon className="h-7 w-7" />
              </div>
              <h2 className="text-4xl font-black text-slate-900">Web</h2>
              <p className="mt-3 text-base leading-relaxed text-slate-600">Acesso completo para gestores, planejamento e controle da frota preventiva.</p>
              <span className="mt-7 inline-flex rounded-xl bg-[var(--color-brand)] px-5 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
                {authSession ? "Acessar modulo" : "Login necessario"}
              </span>
            </div>
          </Link>

          <Link
            href="/app/home"
            onClick={guardModuleNavigation}
            className="card group relative overflow-hidden rounded-3xl p-8 transition hover:-translate-y-0.5"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-slate-100"></div>
            <div className="relative">
              <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[#2f80ed] text-white shadow-lg">
                <SmartphoneIcon className="h-7 w-7" />
              </div>
              <h2 className="text-4xl font-black text-slate-900">App</h2>
              <p className="mt-3 text-base leading-relaxed text-slate-600">Operacao de campo com checklists e agenda de manutencao preventiva.</p>
              <span className="mt-7 inline-flex rounded-xl bg-[#2f80ed] px-5 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
                {authSession ? "Acessar modulo" : "Login necessario"}
              </span>
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
