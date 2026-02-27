"use client";

/**
 * RESPONSABILIDADE:
 * Portal de entrada do sistema com tela limpa de login e botao unico de acesso inteligente.
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - Compartilha sessao com `WebShell` e `MobileShell` via `auth-store`.
 * - Direciona automaticamente para Web/App conforme heuristica de dispositivo.
 *
 * CONTRATO BACKEND: substituir login local por `/auth/login` e validacao de sessao por `/auth/me`;
 * esta tela continua como ponto unico de autenticacao e roteamento inicial.
 */
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [authSession, setAuthSession] = useState<ReturnType<typeof getAuthSession>>(null);
  const [hydrated, setHydrated] = useState(false);
  const [recommendedMode, setRecommendedMode] = useState<"web" | "app">("web");
  const [isAccessing, setIsAccessing] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const refresh = () => setAuthSession(getAuthSession());
    refresh();
    return subscribeAuthSession(refresh);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Regra de negocio: definir modulo alvo por contexto de uso do dispositivo.
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
    // Regra de negocio: um unico botao executa autenticacao e entrada no modulo sugerido.
    // CONTRATO BACKEND: POST /auth/login -> { username|email, password } e retorno com token/sessao.
    setIsAccessing(true);
    try {
      const targetPath = recommendedMode === "app" ? "/app/home" : "/web/dashboard";

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
        setAuthFeedback(`Autenticado: acesso liberado para o modulo ${recommendedMode === "app" ? "App" : "Web"}.`);
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
    <main className="relative min-h-screen overflow-hidden bg-[#dce2ea]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#f0f4f9_0%,transparent_56%)]" />
      </div>

      <section className="relative mx-auto flex min-h-screen max-w-xl items-center px-7 py-10">
        <div className="w-full rounded-[22px] border border-slate-200/70 bg-[#f8fafc]/95 px-6 py-7 shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
          <div className="mb-6 flex items-center justify-center">
            <img
              src="/norte-tech-circle.png"
              alt="Norte Tech Logo"
              className="h-40 w-auto drop-shadow-2xl transition-all duration-700 hover:scale-105"
            />
          </div>

          <div className="flex items-center justify-center gap-3">
            <span className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Acesso Restrito ao Sistema
            </span>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Acesso ao Sistema</p>
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${hydrated && authSession ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
            >
              {hydrated && authSession ? "Autenticado" : "Nao autenticado"}
            </span>
          </div>

          <div className="mt-3 grid gap-3">
            <div>
              <label className="field-label">Usuario ou E-mail</label>
              <input
                value={authUser}
                onChange={(event) => setAuthUser(event.target.value)}
                placeholder="ex: admin@nortetech.com"
                className="field-control"
              />
            </div>
            <div>
              <label className="field-label">Senha</label>
              <input
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder="Digite sua senha"
                className="field-control"
              />
            </div>
          </div>

          <div className="mt-5">
            <button onClick={handleSmartAccess} disabled={isAccessing} className="btn-primary w-full justify-center py-3 text-[12px] tracking-[0.14em]">
              {isAccessing ? "Validando Acesso..." : "Entrar no Sistema  ->"}
            </button>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            {authSession
              ? `Usuario ativo: ${authSession.name} (${authSession.role}) - modo ${authSession.authMode}`
              : "Nao autenticado. Informe usuario e senha e clique em Acesso Inteligente."}
          </p>
          {authFeedback && <p className="mt-1 text-xs font-semibold text-slate-500">{authFeedback}</p>}
          <p className="mt-2 text-xs text-slate-500">
            Usuarios de teste: {getAuthUsers().map((user) => `${user.username}/${user.password}`).join(" | ")}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Deteccao automatica: {recommendedMode === "app" ? "Smartphone/Tablet -> App" : "Desktop/Notebook -> Web"}.
          </p>
          {authSession && (
            <button onClick={handleLogout} className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 underline">
              Encerrar sessao
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
