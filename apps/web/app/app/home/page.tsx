"use client";

import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/layout/mobile-shell";
import {
  getMaintenanceEvents,
  getMaintenanceOperationalStatus,
  MaintenanceEvent,
  subscribeMaintenanceEvents,
} from "@/lib/maintenance-store";
import { translations } from "@/lib/i18n";

type UrgencyRow = {
  id: string;
  model: string;
  action: string;
  due: string;
  status: "VENCIDA" | "A_VENCER" | "ATENCAO" | "CONFORME";
};

const parseAssetLabel = (label: string) => {
  const parts = label.split(" - ").map((part) => part.trim());
  if (parts.length >= 2) {
    return { model: parts.slice(0, -1).join(" - "), id: parts[parts.length - 1] };
  }
  return { model: label, id: label };
};

const formatDate = (event: MaintenanceEvent) =>
  `${String(event.day).padStart(2, "0")}/${String(event.month + 1).padStart(2, "0")} ${event.time}`;

export default function MobileHomePage() {
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);

  useEffect(() => {
    const refresh = () => setEvents(getMaintenanceEvents());
    refresh();
    return subscribeMaintenanceEvents(refresh);
  }, []);

  const stats = useMemo(() => {
    const statuses = events.map((event) => getMaintenanceOperationalStatus(event));
    const overdueCount = statuses.filter((status) => status === "VENCIDA").length;
    const nearDueCount = statuses.filter((status) => status === "A_VENCER").length;
    const compliantCount = statuses.filter((status) => status === "CONFORME").length;
    const attentionCount = statuses.filter((status) => status === "ATENCAO").length;

    const total = statuses.length || 1;
    const compliance = Math.max(0, Math.min(100, Math.round((compliantCount / total) * 100)));

    return {
      overdueCount,
      nearDueCount,
      compliance,
      attentionCount,
      total: events.length,
    };
  }, [events]);

  const urgencyRows = useMemo<UrgencyRow[]>(() => {
    return events
      .map((event) => {
        const parsed = parseAssetLabel(event.asset);
        const status = getMaintenanceOperationalStatus(event);

        let due = `Programada ${formatDate(event)}`;
        if (status === "VENCIDA") {
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
          action: event.title,
          due,
          status,
        };
      })
      .sort((a, b) => {
        const rank = (status: UrgencyRow["status"]) => {
          if (status === "VENCIDA") return 0;
          if (status === "A_VENCER") return 1;
          if (status === "ATENCAO") return 2;
          return 3;
        };
        return rank(a.status) - rank(b.status);
      })
      .slice(0, 12);
  }, [events]);

  return (
    <MobileShell title={translations.dashboardTitle} freeScroll>
      <div className="space-y-4 pb-24">
        <div className="grid grid-cols-2 gap-3">
          <div className="card border-l-4 border-l-[var(--color-danger)] p-4">
            <p className="text-[10px] font-black uppercase text-[var(--color-danger)]">{translations.overdue}</p>
            <p className="text-4xl font-black text-[var(--color-danger)]">{stats.overdueCount}</p>
            <p className="text-[10px] font-bold text-[var(--color-danger)]">Atualizado em tempo real</p>
          </div>
          <div className="card border-l-4 border-l-[var(--color-warning)] p-4">
            <p className="text-[10px] font-black uppercase text-[var(--color-warning)]">{translations.nearDue}</p>
            <p className="text-4xl font-black text-[var(--color-warning)]">{stats.nearDueCount}</p>
            <p className="text-[10px] text-slate-500">{translations.schedulingAvailable}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="card border-l-4 border-l-[var(--color-brand)] p-4">
            <p className="text-[10px] font-black uppercase text-[var(--color-brand)]">{translations.compliance}</p>
            <p className="text-4xl font-black">{stats.compliance}%</p>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-[var(--color-brand)]" style={{ width: `${stats.compliance}%` }} />
            </div>
          </div>
          <div className="card border-l-4 border-l-slate-400 p-4">
            <p className="text-[10px] font-black uppercase text-slate-400">{translations.fleetTotal}</p>
            <p className="text-4xl font-black">{stats.total}</p>
            <p className="text-[10px] text-slate-500">{translations.activeVehicles}</p>
          </div>
        </div>

        <div className="card p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{translations.assetManagementStatus}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="font-semibold">{translations.landFleet}</p>
              <p className="text-2xl font-black">{events.filter((event) => !event.asset.toLowerCase().includes("lancha")).length}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="font-semibold">{translations.nauticalFleet}</p>
              <p className="text-2xl font-black">{events.filter((event) => event.asset.toLowerCase().includes("lancha")).length}</p>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-black">{translations.urgencyList}</h3>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-600">
              {stats.overdueCount} {translations.overdueShort}
            </span>
          </div>
          <div>
            {urgencyRows.map((row) => (
              <div key={`${row.id}-${row.action}`} className="flex items-center justify-between border-b border-slate-100 p-3">
                <div className="flex-1">
                  <p className="font-mono text-xs font-bold text-slate-400">{row.id}</p>
                  <p className="text-sm font-semibold">{row.model}</p>
                  <p className="text-xs text-slate-500">{row.action}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-bold ${
                    row.status === "VENCIDA"
                      ? "text-[var(--color-danger)]"
                      : row.status === "A_VENCER"
                        ? "text-[var(--color-warning)]"
                        : row.status === "ATENCAO"
                          ? "text-blue-700"
                          : "text-emerald-700"
                  }`}>
                    {row.due}
                  </p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                    row.status === "VENCIDA"
                      ? "bg-red-100 text-red-600"
                      : row.status === "A_VENCER"
                        ? "bg-amber-100 text-amber-700"
                        : row.status === "ATENCAO"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {row.status === "VENCIDA"
                      ? translations.overdueStatus
                      : row.status === "A_VENCER"
                        ? translations.nearDueStatus
                        : row.status === "ATENCAO"
                          ? translations.attention
                          : translations.compliant}
                  </span>
                </div>
              </div>
            ))}
            {urgencyRows.length === 0 && (
              <div className="p-4 text-sm text-slate-500">Nenhum registro de preventiva.</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-red-500 p-4 text-white">
            <p className="text-[10px] font-black uppercase">{translations.stoppedVehicles}</p>
            <p className="text-4xl font-black">{stats.overdueCount}</p>
          </div>
          <div className="rounded-2xl bg-blue-500 p-4 text-white">
            <p className="text-[10px] font-black uppercase">Em atencao</p>
            <p className="text-4xl font-black">{stats.attentionCount}</p>
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
