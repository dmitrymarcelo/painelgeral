"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MonitorIcon, SmartphoneIcon } from "@/components/ui/icons";
import {
  clearSchedulingResponsibleSession,
  findSchedulingResponsibleByMatricula,
  getSchedulingResponsibleSession,
  setSchedulingResponsibleSession,
  subscribeSchedulingResponsibles,
} from "@/lib/scheduling-responsible-store";

export default function PortalPage() {
  const [matricula, setMatricula] = useState("");
  const [feedback, setFeedback] = useState("");
  const [activeSession, setActiveSession] = useState(getSchedulingResponsibleSession());

  useEffect(() => {
    const refresh = () => setActiveSession(getSchedulingResponsibleSession());
    refresh();
    return subscribeSchedulingResponsibles(refresh);
  }, []);

  const applyMatricula = () => {
    const normalized = matricula.replace(/\D/g, "");
    if (!normalized) {
      setFeedback("Informe uma matricula numerica.");
      return;
    }

    const responsible = findSchedulingResponsibleByMatricula(normalized);
    if (!responsible) {
      setFeedback("Matricula nao encontrada em Responsavel pelo Agendamento.");
      return;
    }

    setSchedulingResponsibleSession({
      matricula: responsible.matricula,
      name: responsible.name,
      selectedAt: new Date().toISOString(),
    });
    setFeedback(`Responsavel ativo: ${responsible.name} (${responsible.matricula})`);
  };

  const clearSession = () => {
    clearSchedulingResponsibleSession();
    setFeedback("Sessao de responsavel pelo agendamento limpa.");
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
        <div className="mx-auto mb-8 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-lg backdrop-blur">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Rastreabilidade de Agendamento</p>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              value={matricula}
              onChange={(event) => setMatricula(event.target.value.replace(/\D/g, ""))}
              placeholder="Informe a matricula do responsavel"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            />
            <button
              onClick={applyMatricula}
              className="rounded-xl bg-[var(--color-brand)] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white"
            >
              Aplicar matricula
            </button>
            <button
              onClick={clearSession}
              className="rounded-xl border border-slate-300 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-600"
            >
              Limpar
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            {activeSession
              ? `Responsavel ativo: ${activeSession.name} (Matricula ${activeSession.matricula})`
              : "Nenhum responsavel de agendamento selecionado."}
          </p>
          {feedback && <p className="mt-1 text-xs font-semibold text-slate-500">{feedback}</p>}
        </div>

        <div className="mb-10 text-center">
          <h1 className="text-5xl font-black tracking-tight text-slate-900">Selecione o Modulo</h1>
          <p className="mt-3 text-lg text-slate-600">Escolha qual ambiente deseja acessar para gerenciar suas operacoes</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/web/dashboard"
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
                Acessar modulo
              </span>
            </div>
          </Link>

          <Link
            href="/app/home"
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
                Acessar modulo
              </span>
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
