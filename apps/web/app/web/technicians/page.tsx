"use client";

import { FormEvent, useMemo, useState } from "react";
import { WebShell } from "@/components/layout/web-shell";
import { getTechnicians, saveTechnicians, TechnicianRecord } from "@/lib/technicians-store";
import {
  getSchedulingResponsibles,
  saveSchedulingResponsibles,
  SchedulingResponsibleRecord,
} from "@/lib/scheduling-responsible-store";

type TabKey = "tecnicos" | "agendamento";

export default function WebTechniciansPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("tecnicos");

  const [technicians, setTechnicians] = useState<TechnicianRecord[]>(() => getTechnicians());
  const [name, setName] = useState("");

  const [schedulingResponsibles, setSchedulingResponsibles] = useState<SchedulingResponsibleRecord[]>(
    () => getSchedulingResponsibles(),
  );
  const [matricula, setMatricula] = useState("");
  const [responsibleName, setResponsibleName] = useState("");

  const activeCount = useMemo(() => technicians.filter((item) => item.active).length, [technicians]);
  const activeSchedulingCount = useMemo(
    () => schedulingResponsibles.filter((item) => item.active).length,
    [schedulingResponsibles],
  );

  const persistTechnicians = (next: TechnicianRecord[]) => {
    setTechnicians(next);
    saveTechnicians(next);
  };

  const persistSchedulingResponsibles = (next: SchedulingResponsibleRecord[]) => {
    setSchedulingResponsibles(next);
    saveSchedulingResponsibles(next);
  };

  const handleAddTechnician = (event: FormEvent) => {
    event.preventDefault();
    const normalized = name.trim();
    if (!normalized) return;

    const exists = technicians.some(
      (item) => item.name.toLowerCase().trim() === normalized.toLowerCase(),
    );
    if (exists) return;

    const next: TechnicianRecord[] = [
      ...technicians,
      {
        id: crypto.randomUUID(),
        name: normalized,
        active: true,
        createdAt: new Date().toISOString(),
      },
    ];

    persistTechnicians(next);
    setName("");
  };

  const handleToggleTechnician = (id: string) => {
    const next = technicians.map((item) => (item.id === id ? { ...item, active: !item.active } : item));
    persistTechnicians(next);
  };

  const handleRemoveTechnician = (id: string) => {
    const next = technicians.filter((item) => item.id !== id);
    persistTechnicians(next);
  };

  const handleAddSchedulingResponsible = (event: FormEvent) => {
    event.preventDefault();

    const normalizedMatricula = matricula.replace(/\D/g, "").trim();
    const normalizedName = responsibleName.trim();
    if (!normalizedMatricula || !normalizedName) return;

    const exists = schedulingResponsibles.some(
      (item) =>
        item.matricula === normalizedMatricula ||
        item.name.toLowerCase().trim() === normalizedName.toLowerCase(),
    );
    if (exists) return;

    const next: SchedulingResponsibleRecord[] = [
      ...schedulingResponsibles,
      {
        id: crypto.randomUUID(),
        matricula: normalizedMatricula,
        name: normalizedName,
        active: true,
        createdAt: new Date().toISOString(),
      },
    ];

    persistSchedulingResponsibles(next);
    setMatricula("");
    setResponsibleName("");
  };

  const handleToggleSchedulingResponsible = (id: string) => {
    const next = schedulingResponsibles.map((item) =>
      item.id === id ? { ...item, active: !item.active } : item,
    );
    persistSchedulingResponsibles(next);
  };

  const handleRemoveSchedulingResponsible = (id: string) => {
    const next = schedulingResponsibles.filter((item) => item.id !== id);
    persistSchedulingResponsibles(next);
  };

  return (
    <WebShell title="Cadastro de Tecnicos Responsaveis" subtitle="Base de Responsaveis de Checklist e Agendamento">
      <div className="space-y-4">
        <div className="card p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("tecnicos")}
              className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${
                activeTab === "tecnicos"
                  ? "bg-[var(--color-brand)] text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              Tecnico Responsavel
            </button>
            <button
              onClick={() => setActiveTab("agendamento")}
              className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${
                activeTab === "agendamento"
                  ? "bg-[var(--color-brand)] text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              Responsavel pelo Agendamento
            </button>
          </div>
        </div>

        {activeTab === "tecnicos" ? (
          <>
            <div className="card p-4">
              <p className="text-sm text-slate-600">
                Tecnicos ativos: <strong>{activeCount}</strong> de <strong>{technicians.length}</strong>
              </p>
            </div>

            <div className="card p-4">
              <form onSubmit={handleAddTechnician} className="flex flex-col gap-3 md:flex-row">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nome completo do tecnico"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-[var(--color-brand)] px-5 py-3 text-sm font-black uppercase text-white"
                >
                  Adicionar tecnico
                </button>
              </form>
            </div>

            <div className="card overflow-hidden">
              <div className="grid grid-cols-[1fr_120px_120px] border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                <span>Tecnico</span>
                <span>Status</span>
                <span className="text-right">Acoes</span>
              </div>
              <div>
                {technicians.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_120px_120px] items-center border-b border-slate-100 px-4 py-3">
                    <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                    <button
                      onClick={() => handleToggleTechnician(item.id)}
                      className={`w-fit rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                        item.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {item.active ? "Ativo" : "Inativo"}
                    </button>
                    <div className="text-right">
                      <button
                        onClick={() => handleRemoveTechnician(item.id)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-black uppercase text-red-600"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
                {technicians.length === 0 && (
                  <p className="px-4 py-6 text-sm text-slate-500">Nenhum tecnico cadastrado.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="card p-4">
              <p className="text-sm text-slate-600">
                Responsaveis ativos no agendamento: <strong>{activeSchedulingCount}</strong> de <strong>{schedulingResponsibles.length}</strong>
              </p>
            </div>

            <div className="card p-4">
              <form onSubmit={handleAddSchedulingResponsible} className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
                <input
                  value={matricula}
                  onChange={(event) => setMatricula(event.target.value.replace(/\D/g, ""))}
                  placeholder="Matricula numerica"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
                <input
                  value={responsibleName}
                  onChange={(event) => setResponsibleName(event.target.value)}
                  placeholder="Nome do responsavel"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-[var(--color-brand)] px-5 py-3 text-sm font-black uppercase text-white"
                >
                  Adicionar
                </button>
              </form>
            </div>

            <div className="card overflow-hidden">
              <div className="grid grid-cols-[140px_1fr_120px_120px] border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                <span>Matricula</span>
                <span>Nome</span>
                <span>Status</span>
                <span className="text-right">Acoes</span>
              </div>
              <div>
                {schedulingResponsibles.map((item) => (
                  <div key={item.id} className="grid grid-cols-[140px_1fr_120px_120px] items-center border-b border-slate-100 px-4 py-3">
                    <span className="font-mono text-sm font-bold text-slate-700">{item.matricula}</span>
                    <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                    <button
                      onClick={() => handleToggleSchedulingResponsible(item.id)}
                      className={`w-fit rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                        item.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {item.active ? "Ativo" : "Inativo"}
                    </button>
                    <div className="text-right">
                      <button
                        onClick={() => handleRemoveSchedulingResponsible(item.id)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-black uppercase text-red-600"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
                {schedulingResponsibles.length === 0 && (
                  <p className="px-4 py-6 text-sm text-slate-500">Nenhum responsavel de agendamento cadastrado.</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </WebShell>
  );
}
