"use client";

import { useEffect, useMemo, useState } from "react";
import { WebShell } from "@/components/layout/web-shell";
import { translations } from "@/lib/i18n";
import {
  getMaintenanceDueDate,
  getMaintenanceEvents,
  MaintenanceEvent,
  subscribeMaintenanceEvents,
} from "@/lib/maintenance-store";

type CompletionKind = "on_time" | "late" | null;

type OsRow = {
  code: string;
  asset: string;
  service: string;
  priority: string;
  owner: string;
  schedulingResponsible: string;
  due: string;
  status: "scheduled" | "in_progress" | "completed";
  completionKind: CompletionKind;
};

const formatDue = (event: MaintenanceEvent) => {
  const day = String(event.day).padStart(2, "0");
  const month = String(event.month + 1).padStart(2, "0");
  return `${day}/${month} ${event.time}`;
};

const normalizeCode = (event: MaintenanceEvent, index: number) => {
  const stamp = `${event.year}${String(event.month + 1).padStart(2, "0")}${String(event.day).padStart(2, "0")}`;
  return `OS-${stamp}-${String(index + 1).padStart(3, "0")}`;
};

const getCompletionKind = (event: MaintenanceEvent): CompletionKind => {
  if (event.status !== "completed") return null;
  if (!event.completedAt) return "late";
  const due = getMaintenanceDueDate(event).getTime();
  const completed = new Date(event.completedAt).getTime();
  return completed <= due ? "on_time" : "late";
};

export default function WebMaintenancePage() {
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);

  useEffect(() => {
    const refresh = () => setEvents(getMaintenanceEvents());
    refresh();
    return subscribeMaintenanceEvents(refresh);
  }, []);

  const rows = useMemo<OsRow[]>(() => {
    return events.map((event, index) => ({
      code: normalizeCode(event, index),
      asset: event.asset,
      service: event.title || "Manutencao Preventiva",
      priority: translations.normalPriority,
      owner: event.technician || translations.unassigned,
      schedulingResponsible: event.schedulerName
        ? `${event.schedulerName}${event.schedulerMatricula ? ` (${event.schedulerMatricula})` : ""}`
        : "Nao informado",
      due: formatDue(event),
      status: event.status,
      completionKind: getCompletionKind(event),
    }));
  }, [events]);

  const openCount = rows.filter((row) => row.status === "scheduled").length;
  const inProgressCount = rows.filter((row) => row.status === "in_progress").length;
  const completedCount = rows.filter((row) => row.status === "completed").length;

  return (
    <WebShell title={translations.serviceOrders} subtitle={translations.activityManagement}>
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="kpi-card">
            <p className="stat-label">{translations.openOrders}</p>
            <p className="text-4xl font-black">{openCount}</p>
          </div>
          <div className="kpi-card">
            <p className="stat-label">{translations.inProgressOrders}</p>
            <p className="text-4xl font-black">{inProgressCount}</p>
          </div>
          <div className="kpi-card">
            <p className="stat-label">{translations.completedMonth}</p>
            <p className="text-4xl font-black">{completedCount}</p>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            {translations.openOrders} ({openCount})
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-6 py-4">{translations.id}</th>
                <th className="px-6 py-4">{translations.asset}</th>
                <th className="px-6 py-4">{translations.service}</th>
                <th className="px-6 py-4">{translations.priority}</th>
                <th className="px-6 py-4">{translations.responsible}</th>
                <th className="px-6 py-4">Responsavel Agendamento</th>
                <th className="px-6 py-4">{translations.deadline}</th>
                <th className="px-6 py-4">{translations.status}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.code} className="border-b border-slate-100">
                  <td className="px-6 py-4 font-mono font-bold">{row.code}</td>
                  <td className="px-6 py-4 font-semibold">{row.asset}</td>
                  <td className="px-6 py-4">{row.service}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">
                      {row.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">{row.owner}</td>
                  <td className="px-6 py-4">{row.schedulingResponsible}</td>
                  <td
                    className={`px-6 py-4 font-bold ${
                      row.completionKind === "on_time"
                        ? "text-blue-700"
                        : row.status === "completed"
                          ? "text-emerald-700"
                          : "text-[var(--color-danger)]"
                    }`}
                  >
                    {row.due}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                        row.status === "scheduled"
                          ? "bg-slate-100 text-slate-600"
                          : row.status === "in_progress"
                            ? "bg-amber-100 text-amber-700"
                            : row.completionKind === "on_time"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {row.status === "scheduled"
                        ? "Aberta"
                        : row.status === "in_progress"
                          ? "Em andamento"
                          : row.completionKind === "on_time"
                            ? "Concluida no prazo"
                            : "Concluida"}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-6 py-6 text-sm text-slate-500" colSpan={8}>
                    Nenhuma ordem registrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </WebShell>
  );
}
