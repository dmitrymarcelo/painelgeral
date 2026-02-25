"use client";

import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/layout/mobile-shell";
import {
  getMaintenanceEvents,
  MaintenanceEvent,
  subscribeMaintenanceEvents,
} from "@/lib/maintenance-store";

type MobileOsRow = {
  id: string;
  code: string;
  plate: string;
  model: string;
  status: "Agendada" | "Em andamento" | "Pendente" | "Concluida" | "Nao Compareceu" | "Em tolerancia";
  scheduledAt: string;
};

const parseAssetLabel = (label: string) => {
  const parts = label.split(" - ").map((part) => part.trim());
  if (parts.length >= 2) {
    return { model: parts.slice(0, -1).join(" - "), plate: parts[parts.length - 1] };
  }
  return { model: label, plate: label };
};

const getEventDate = (event: MaintenanceEvent) => {
  const [hour, minute] = event.time.split(":").map(Number);
  return new Date(event.year, event.month, event.day, hour, minute, 0, 0);
};

const getStatusLabel = (event: MaintenanceEvent): MobileOsRow["status"] => {
  if (event.status === "no_show") return "Nao Compareceu";
  if (event.status === "tolerance") return "Em tolerancia";
  if (event.status === "in_progress") return "Em andamento";
  if (event.status === "completed") return "Concluida";
  return getEventDate(event).getTime() < Date.now() ? "Pendente" : "Agendada";
};

export default function MobileMaintenancePage() {
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);

  useEffect(() => {
    const refresh = () => setEvents(getMaintenanceEvents());
    refresh();
    return subscribeMaintenanceEvents(refresh);
  }, []);

  const rows = useMemo<MobileOsRow[]>(() => {
    return events
      .map((event, index) => {
        const parsed = parseAssetLabel(event.asset);
        const date = getEventDate(event);
        const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
        return {
          id: event.id,
          code: `OS-${stamp}-${String(index + 1).padStart(3, "0")}`,
          plate: parsed.plate,
          model: parsed.model,
          status: getStatusLabel(event),
          scheduledAt: `${String(event.day).padStart(2, "0")}/${String(event.month + 1).padStart(2, "0")} ${event.time}`,
        };
      })
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }, [events]);

  const summary = useMemo(() => {
    return {
      total: rows.length,
      inProgress: rows.filter((row) => row.status === "Em andamento").length,
      pending: rows.filter((row) => row.status === "Pendente").length,
      completed: rows.filter((row) => row.status === "Concluida").length,
    };
  }, [rows]);

  return (
    <MobileShell title="Ordens de Servico" freeScroll>
      <div className="space-y-3 pb-24">
        <div className="grid grid-cols-2 gap-3">
          <div className="card border-l-4 border-l-slate-400 bg-gradient-to-b from-white to-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Total OS</p>
            <p className="text-4xl font-black text-slate-900">{summary.total}</p>
            <p className="text-[10px] text-slate-500">Registros</p>
          </div>
          <div className="card border-l-4 border-l-amber-500 bg-gradient-to-b from-white to-amber-50/30 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">Em andamento</p>
            <p className="text-4xl font-black text-amber-700">{summary.inProgress}</p>
            <p className="text-[10px] text-slate-500">Execucao</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="card border-l-4 border-l-red-500 bg-gradient-to-b from-white to-rose-50/30 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-red-700">Pendentes</p>
            <p className="text-4xl font-black text-red-700">{summary.pending}</p>
            <p className="text-[10px] text-slate-500">Atrasadas/nao iniciadas</p>
          </div>
          <div className="card border-l-4 border-l-emerald-500 bg-gradient-to-b from-white to-emerald-50/30 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">Concluidas</p>
            <p className="text-4xl font-black text-emerald-700">{summary.completed}</p>
            <p className="text-[10px] text-slate-500">Finalizadas</p>
          </div>
        </div>

        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-mono font-bold text-slate-400">{row.code}</p>
                  <p className="text-sm font-black text-slate-900">{row.model}</p>
                  <p className="text-xs text-slate-500">{row.plate}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                    row.status === "Agendada"
                      ? "bg-sky-100 text-sky-700"
                      : row.status === "Em andamento"
                        ? "bg-amber-100 text-amber-700"
                        : row.status === "Pendente"
                          ? "bg-red-100 text-red-700"
                          : row.status === "Nao Compareceu"
                            ? "bg-rose-100 text-rose-700"
                            : row.status === "Em tolerancia"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {row.status}
                </span>
              </div>
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <p className="text-slate-500">Agendamento</p>
                <p className="font-bold text-slate-900">{row.scheduledAt}</p>
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="card p-4 text-sm text-slate-500">Nenhuma ordem de servico encontrada.</div>
          )}
        </div>
      </div>
    </MobileShell>
  );
}
