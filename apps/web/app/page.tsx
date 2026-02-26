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
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MonitorIcon, SmartphoneIcon } from "@/components/ui/icons";
import {
  getAuthSession,
  getAuthUsers,
  loginWithCredentials,
  logoutAuthSession,
  subscribeAuthSession,
} from "@/lib/auth-store";
export default function PortalPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFeedback, setAuthFeedback] = useState("");
  const [authSession, setAuthSession] = useState(getAuthSession());
  const [recommendedMode, setRecommendedMode] = useState<"web" | "app">("web");
  const [selectedModule, setSelectedModule] = useState<"web" | "app">("web");
  const [manualModuleSelection, setManualModuleSelection] = useState(false);
  const [isAccessing, setIsAccessing] = useState(false);

  useEffect(() => {
    const refresh = () => setAuthSession(getAuthSession());
    refresh();
    return subscribeAuthSession(refresh);
  }, []);

  useEffect(() => {
    // Regra de negocio/UX: pre-seleciona modulo sugerido automaticamente ate o usuario escolher manualmente.
    if (!manualModuleSelection) {
      setSelectedModule(recommendedMode);
    }
  }, [manualModuleSelection, recommendedMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Regra de negocio/UX: usar heuristica local para sugerir modulo por dispositivo.
    // Nao e deteccao perfeita; backend nao participa. A sugestao prioriza App em smartphones.
    const detectMode = () => {
      const ua = navigator.userAgent.toLowerCase();
      const isPhoneUa = /android|iphone|ipod|windows phone|mobile/.test(ua);
      const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
      const smallViewport = window.innerWidth < 900;
      setRecommendedMode(isPhoneUa || (coarsePointer && smallViewport) ? "app" : "web");
    };
    detectMode();
    window.addEventListener("resize", detectMode);
    return () => window.removeEventListener("resize", detectMode);
  }, []);

  const handleSmartAccess = async () => {
    // Regra de negocio: "Acesso Inteligente" unifica autenticacao e entrada no modulo selecionado
    // para reduzir passos operacionais na tela inicial.
    // CONTRATO BACKEND: POST /auth/login -> { username|email, password } e retorno com sessao/token;
    // apos autenticacao, a navegacao segue para rotas protegidas que devem validar `/auth/me`.
    setIsAccessing(true);
    try {
      const targetPath = selectedModule === "app" ? "/app/home" : "/web/dashboard";

      if (!authSession) {
        const result = await loginWithCredentials(authUser, authPassword);
        if (!result.ok) {
          setAuthFeedback(`Nao autenticado: ${result.message}`);
          return;
        }

        setAuthFeedback(
          `Autenticado: ${result.session.name} (${result.session.role}) [${result.session.authMode.toUpperCase()}]`,
        );
        setAuthPassword("");
      } else {
        setAuthFeedback(`Autenticado: acesso liberado para o modulo ${selectedModule === "app" ? "App" : "Web"}.`);
      }

      router.push(targetPath);
    } finally {
      setIsAccessing(false);
    }
  };

  const handleLogout = () => {
    logoutAuthSession();
    setAuthFeedback("Sessao de usuario encerrada.");
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
        <div className="mx-auto mb-8 w-full max-w-4xl">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/92 shadow-xl backdrop-blur">
            <div className="grid gap-0 lg:grid-cols-[360px_1fr]">
              <div className="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(165deg,#041b53,#0d2c7a_45%,#0f3d98)] p-6 text-white lg:border-b-0 lg:border-r">
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-[#ffd400]/20 blur-2xl" />
                <div className="relative">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/70">Portal Norte Tech</p>
                  <div className="mt-5 rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
                    <div className="relative h-20 w-full">
                      <Image
                        src="/norte-tech-jf.svg"
                        alt="Norte Tech"
                        fill
                        className="object-contain object-left"
                        priority
                      />
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-blue-100">
                    Selecione o modulo e use um unico fluxo de acesso. O sistema autentica e direciona automaticamente.
                  </p>
                  <div className="mt-5 flex items-center gap-2">
                    <span className="chip bg-white/15 text-white">Modulo: {selectedModule === "app" ? "App" : "Web"}</span>
                    <span className="chip bg-[#ffd400]/20 text-[#ffe165]">
                      {recommendedMode === "app" ? "Recomendado: App" : "Recomendado: Web"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Acesso ao Sistema</p>
                  <span
                    className={`chip ${
                      authSession ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {authSession ? "Autenticado" : "Nao autenticado"}
                  </span>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="field-label">Usuario</label>
                    <input
                      value={authUser}
                      onChange={(event) => setAuthUser(event.target.value)}
                      placeholder="Usuario"
                      className="field-control"
                    />
                  </div>
                  <div>
                    <label className="field-label">Senha</label>
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(event) => setAuthPassword(event.target.value)}
                      placeholder="Senha"
                      className="field-control"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button onClick={handleSmartAccess} disabled={isAccessing} className="btn-primary">
                    {isAccessing ? "Validando Acesso..." : `Acesso Inteligente (${selectedModule === "app" ? "App" : "Web"})`}
                  </button>
                  <button onClick={handleLogout} className="btn-secondary">
                    Sair
                  </button>
                  <Link href="/web/users" className="btn-soft-primary">
                    Usuarios de Acesso
                  </Link>
                </div>

                <p className="mt-3 text-sm text-slate-600">
                  {authSession
                    ? `Usuario ativo: ${authSession.name} (${authSession.role}) - modo ${authSession.authMode}`
                    : "Nao autenticado. Informe usuario e senha e clique em Acesso Inteligente."}
                </p>
                {authFeedback && <p className="mt-1 text-xs font-semibold text-slate-500">{authFeedback}</p>}
                <p className="mt-2 text-xs text-slate-500">
                  Usuarios de teste: {getAuthUsers().map((user) => `${user.username}/${user.password}`).join(" • ")}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Detecao automatica: {recommendedMode === "app" ? "Smartphone/Tablet -> App" : "Desktop/Notebook -> Web"}.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-10 text-center">
          <h1 className="text-5xl font-black tracking-tight text-slate-900">Selecione o Modulo</h1>
          <p className="mt-3 text-lg text-slate-600">Escolha qual ambiente deseja acessar para gerenciar suas operacoes</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setManualModuleSelection(true);
              setSelectedModule("web");
              setAuthFeedback("Modulo Web selecionado. Clique em Acesso Inteligente para continuar.");
            }}
            className={`card group relative overflow-hidden rounded-3xl p-8 text-left transition hover:-translate-y-0.5 ${
              selectedModule === "web" ? "ring-2 ring-[var(--color-brand)]" : ""
            }`}
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-slate-100"></div>
            <div className="relative">
              <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-brand)] text-white shadow-lg">
                <MonitorIcon className="h-7 w-7" />
              </div>
              <h2 className="text-4xl font-black text-slate-900">Web</h2>
              <p className="mt-3 text-base leading-relaxed text-slate-600">Acesso completo para gestores, planejamento e controle da frota preventiva.</p>
              <span className="mt-7 inline-flex rounded-xl bg-[var(--color-brand)] px-5 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
                {selectedModule === "web" ? "Selecionado" : "Selecionar modulo"}
              </span>
              {recommendedMode === "web" && (
                <span className="ml-2 mt-7 inline-flex rounded-xl border border-[var(--color-brand)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-brand)]">
                  Recomendado
                </span>
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setManualModuleSelection(true);
              setSelectedModule("app");
              setAuthFeedback("Modulo App selecionado. Clique em Acesso Inteligente para continuar.");
            }}
            className={`card group relative overflow-hidden rounded-3xl p-8 text-left transition hover:-translate-y-0.5 ${
              selectedModule === "app" ? "ring-2 ring-[#2f80ed]" : ""
            }`}
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-slate-100"></div>
            <div className="relative">
              <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[#2f80ed] text-white shadow-lg">
                <SmartphoneIcon className="h-7 w-7" />
              </div>
              <h2 className="text-4xl font-black text-slate-900">App</h2>
              <p className="mt-3 text-base leading-relaxed text-slate-600">Operacao de campo com checklists e agenda de manutencao preventiva.</p>
              <span className="mt-7 inline-flex rounded-xl bg-[#2f80ed] px-5 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
                {selectedModule === "app" ? "Selecionado" : "Selecionar modulo"}
              </span>
              {recommendedMode === "app" && (
                <span className="ml-2 mt-7 inline-flex rounded-xl border border-[#2f80ed] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#2f80ed]">
                  Recomendado
                </span>
              )}
            </div>
          </button>
        </div>
      </section>
    </main>
  );
}
