"use client";

import { useEffect, useMemo, useState } from "react";
import { WebShell } from "@/components/layout/web-shell";
import {
  getMaintenanceEvents,
  getMaintenanceOperationalStatus,
  MaintenanceEvent,
  MaintenanceOperationalStatus,
  subscribeMaintenanceEvents,
} from "@/lib/maintenance-store";
import { translations } from "@/lib/i18n";

type DashboardRow = {
  id: string;
  model: string;
  action: string;
  due: string;
  status: MaintenanceOperationalStatus;
};

const formatDate = (event: MaintenanceEvent) =>
  `${String(event.day).padStart(2, "0")}/${String(event.month + 1).padStart(2, "0")} ${event.time}`;

const parseAssetLabel = (label: string) => {
  const parts = label.split(" - ").map((part) => part.trim());
  if (parts.length >= 2) {
    return { model: parts.slice(0, -1).join(" - "), id: parts[parts.length - 1] };
  }
  return { model: label, id: label };
};

const statusLabel = (status: MaintenanceOperationalStatus) => {
  if (status === "VENCIDA") return translations.overdueStatus;
  if (status === "A_VENCER") return translations.nearDueStatus;
  if (status === "ATENCAO") return translations.attention;
  return translations.compliant;
};

export default function WebDashboardPage() {
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);

  useEffect(() => {
    const refresh = () => setEvents(getMaintenanceEvents());
    refresh();
    return subscribeMaintenanceEvents(refresh);
  }, []);

  const metrics = useMemo(() => {
    const statuses = events.map((event) => getMaintenanceOperationalStatus(event));
    const overdueCount = statuses.filter((status) => status === "VENCIDA").length;
    const nearDueCount = statuses.filter((status) => status === "A_VENCER").length;
    const compliantCount = statuses.filter((status) => status === "CONFORME").length;

    const total = statuses.length || 1;
    const compliance = Math.max(0, Math.min(100, Math.round((compliantCount / total) * 100)));
    const uniqueAssets = new Set(events.map((event) => parseAssetLabel(event.asset).id));

    return {
      overdueCount,
      nearDueCount,
      compliance,
      fleetTotal: Math.max(uniqueAssets.size, 1),
    };
  }, [events]);

  const urgencyRows = useMemo<DashboardRow[]>(() => {
    return events
      .map((event) => {
        const parsed = parseAssetLabel(event.asset);
        const operationalStatus = getMaintenanceOperationalStatus(event);

        let due = `Programada ${formatDate(event)}`;
        if (operationalStatus === "VENCIDA") {
          due = `Excedido (${formatDate(event)})`;
        } else if (event.status === "completed") {
          due = event.completedAt
            ? `Concluida ${new Date(event.completedAt).toLocaleString("pt-BR")}`
            : "Concluida";
        } else if (event.status === "in_progress") {
          due = `Em andamento desde ${formatDate(event)}`;
        }

        return {
          id: parsed.id,
          model: parsed.model,
          action: event.title || "Manutencao Preventiva",
          due,
          status: operationalStatus,
        };
      })
      .sort((a, b) => {
        const rank = (status: MaintenanceOperationalStatus) => {
          if (status === "VENCIDA") return 0;
          if (status === "A_VENCER") return 1;
          if (status === "ATENCAO") return 2;
          return 3;
        };
        return rank(a.status) - rank(b.status);
      })
      .slice(0, 8);
  }, [events]);

  return (
    <WebShell title={translations.dashboardTitle} subtitle={translations.dashboardSubtitle}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="kpi-card border-l-4 border-l-[var(--color-danger)]">
            <p className="stat-label">{translations.overdue}</p>
            <p className="mt-2 text-5xl font-black text-[var(--color-danger)]">{metrics.overdueCount}</p>
            <p className="text-xs font-bold text-[var(--color-danger)]">Atualizado em tempo real</p>
          </div>
          <div className="kpi-card border-l-4 border-l-[var(--color-warning)]">
            <p className="stat-label">{translations.nearDue}</p>
            <p className="mt-2 text-5xl font-black text-[var(--color-warning)]">{metrics.nearDueCount}</p>
            <p className="text-xs font-semibold text-slate-500">{translations.schedulingAvailable}</p>
          </div>
          <div className="kpi-card border-l-4 border-l-[var(--color-brand)]">
            <p className="stat-label">{translations.compliance}</p>
            <p className="mt-2 text-5xl font-black">{metrics.compliance}%</p>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-[var(--color-brand)]" style={{ width: `${metrics.compliance}%` }} />
            </div>
          </div>
          <div className="kpi-card border-l-4 border-l-slate-400">
            <p className="stat-label">{translations.fleetTotal}</p>
            <p className="mt-2 text-5xl font-black">{metrics.fleetTotal}</p>
            <p className="text-xs font-semibold text-slate-500">{translations.activeVehicles}</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <div className="card p-6">
            <h3 className="text-lg font-black">{translations.preventiveTypesMonthly}</h3>
            <div className="mt-6 grid h-56 place-items-center">
              <div className="relative h-44 w-44 rounded-full border-[16px] border-slate-100">
                <div className="absolute inset-0 rounded-full border-[16px] border-[var(--color-brand)] border-r-[var(--color-brand-soft)] border-b-[var(--color-brand-soft)]" />
                <div className="absolute inset-0 grid place-items-center">
                  <p className="text-center text-4xl font-black">{events.length}</p>
                </div>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li className="flex justify-between"><span>{translations.oilChange}</span><strong>{events.filter((event) => event.title.toLowerCase().includes("oleo")).length}</strong></li>
              <li className="flex justify-between"><span>{translations.periodicReview}</span><strong>{events.filter((event) => event.title.toLowerCase().includes("revis")).length}</strong></li>
              <li className="flex justify-between"><span>{translations.tiresSuspension}</span><strong>{events.filter((event) => event.title.toLowerCase().includes("pneu") || event.title.toLowerCase().includes("suspens")).length}</strong></li>
            </ul>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-black">{translations.urgencyList}</h3>
              <button className="text-sm font-bold text-[var(--color-brand-ink)]">{translations.openFleetMap}</button>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-6 py-4">{translations.plateId}</th>
                  <th className="px-6 py-4">{translations.modelType}</th>
                  <th className="px-6 py-4">{translations.preventive}</th>
                  <th className="px-6 py-4">{translations.dueDate}</th>
                  <th className="px-6 py-4">{translations.status}</th>
                </tr>
              </thead>
              <tbody>
                {urgencyRows.map((row) => (
                  <tr key={`${row.id}-${row.action}`} className="border-b border-slate-100">
                    <td className="px-6 py-4 font-mono font-bold">{row.id}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold">{row.model}</p>
                    </td>
                    <td className="px-6 py-4">{row.action}</td>
                    <td
                      className={`px-6 py-4 font-bold ${
                        row.status === "VENCIDA"
                          ? "text-[var(--color-danger)]"
                          : row.status === "A_VENCER"
                            ? "text-[var(--color-warning)]"
                            : row.status === "ATENCAO"
                              ? "text-blue-700"
                              : "text-emerald-700"
                      }`}
                    >
                      {row.due}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                          row.status === "VENCIDA"
                            ? "bg-red-100 text-red-600"
                            : row.status === "A_VENCER"
                              ? "bg-amber-100 text-amber-700"
                              : row.status === "ATENCAO"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {statusLabel(row.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {urgencyRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-sm text-slate-500">Nenhum registro de preventiva.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </WebShell>
  );
}
