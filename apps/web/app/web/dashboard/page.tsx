"use client";

/**
 * RESPONSABILIDADE:
 * Dashboard executivo/operacional da frota com KPIs e lista de urgencia.
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - Consome `maintenance-store` para consolidar status operacionais.
 * - Serve de leitura para diretoria/gestao (nao edita dados).
 *
 * CONTRATO BACKEND: idealmente consumira endpoints agregados de KPI e lista de urgencia,
 * mas o shape atual pode ser reproduzido a partir de `calendar_events`/`work_orders`.
 */
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
    // Regra de negocio: o dashboard trabalha com "status operacional" derivado de prazo/execucao,
    // nao apenas com o status bruto do evento.
    const statuses = events.map((event) => getMaintenanceOperationalStatus(event));
    const overdueCount = statuses.filter((status) => status === "VENCIDA").length;
    const nearDueCount = statuses.filter((status) => status === "A_VENCER").length;
    const attentionCount = statuses.filter((status) => status === "ATENCAO").length;
    const compliantCount = statuses.filter((status) => status === "CONFORME").length;
    const inProgressCount = events.filter((event) => event.status === "in_progress").length;
    const completedCount = events.filter((event) => event.status === "completed").length;
    const today = new Date();
    const todayCount = events.filter(
      (event) =>
        event.day === today.getDate() &&
        event.month === today.getMonth() &&
        event.year === today.getFullYear(),
    ).length;

    const total = statuses.length || 1;
    const compliance = Math.max(0, Math.min(100, Math.round((compliantCount / total) * 100)));
    const uniqueAssets = new Set(events.map((event) => parseAssetLabel(event.asset).id));

    return {
      overdueCount,
      nearDueCount,
      attentionCount,
      inProgressCount,
      completedCount,
      todayCount,
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
          <div className="kpi-card border-l-4 border-l-[var(--color-danger)] bg-gradient-to-b from-white to-rose-50/30">
            <div className="flex items-center justify-between">
              <p className="stat-label">{translations.overdue}</p>
              <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-black uppercase text-red-600">
                Critico
              </span>
            </div>
            <p className="mt-2 text-5xl font-black text-[var(--color-danger)]">{metrics.overdueCount}</p>
            <p className="text-xs font-bold text-[var(--color-danger)]">Atualizado em tempo real</p>
          </div>
          <div className="kpi-card border-l-4 border-l-[var(--color-warning)] bg-gradient-to-b from-white to-amber-50/40">
            <div className="flex items-center justify-between">
              <p className="stat-label">{translations.nearDue}</p>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-700">
                Planejar
              </span>
            </div>
            <p className="mt-2 text-5xl font-black text-[var(--color-warning)]">{metrics.nearDueCount}</p>
            <p className="text-xs font-semibold text-slate-500">{translations.schedulingAvailable}</p>
          </div>
          <div className="kpi-card border-l-4 border-l-[var(--color-brand)] bg-gradient-to-b from-white to-blue-50/40">
            <div className="flex items-center justify-between">
              <p className="stat-label">{translations.compliance}</p>
              <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black uppercase text-blue-700">
                Frota
              </span>
            </div>
            <p className="mt-2 text-5xl font-black">{metrics.compliance}%</p>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-[var(--color-brand)]" style={{ width: `${metrics.compliance}%` }} />
            </div>
          </div>
          <div className="kpi-card border-l-4 border-l-slate-400 bg-gradient-to-b from-white to-slate-50">
            <div className="flex items-center justify-between">
              <p className="stat-label">{translations.fleetTotal}</p>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">
                Ativos
              </span>
            </div>
            <p className="mt-2 text-5xl font-black">{metrics.fleetTotal}</p>
            <p className="text-xs font-semibold text-slate-500">{translations.activeVehicles}</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <div className="card p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">Resumo Operacional da Frota</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Visao rapida para decisao de oficina e programacao diaria.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black uppercase text-blue-700">
                Dashboard
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-blue-700">Hoje</p>
                  <p className="mt-1 text-3xl font-black text-blue-800">{metrics.todayCount}</p>
                  <p className="text-xs text-blue-700/80">Agendamentos do dia</p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-700">Em andamento</p>
                  <p className="mt-1 text-3xl font-black text-amber-800">{metrics.inProgressCount}</p>
                  <p className="text-xs text-amber-700/80">OS em execucao</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Distribuicao de status
                  </p>
                  <span className="text-xs font-semibold text-slate-500">{events.length} registros</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Conformes", value: Math.max(0, events.length - metrics.overdueCount - metrics.nearDueCount - metrics.attentionCount), tone: "bg-emerald-500" },
                    { label: "Atencao", value: metrics.attentionCount, tone: "bg-blue-500" },
                    { label: "A vencer", value: metrics.nearDueCount, tone: "bg-amber-500" },
                    { label: "Vencidas", value: metrics.overdueCount, tone: "bg-red-500" },
                  ].map((item) => {
                    const pct = events.length ? Math.round((item.value / events.length) * 100) : 0;
                    return (
                      <div key={item.label}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">{item.label}</span>
                          <span className="font-black text-slate-700">
                            {item.value} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-white">
                          <div className={`h-2 rounded-full ${item.tone}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700">Concluidas</p>
                <p className="mt-1 text-2xl font-black text-emerald-800">{metrics.completedCount}</p>
                <p className="text-xs text-emerald-700/80">Ordens finalizadas registradas</p>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-black">{translations.urgencyList}</h3>
              <button className="text-sm font-bold text-[var(--color-brand-ink)]">{translations.openFleetMap}</button>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="table-head-cell">{translations.plateId}</th>
                  <th className="table-head-cell">{translations.modelType}</th>
                  <th className="table-head-cell">{translations.preventive}</th>
                  <th className="table-head-cell">{translations.dueDate}</th>
                  <th className="table-head-cell">{translations.status}</th>
                </tr>
              </thead>
              <tbody>
                {urgencyRows.map((row) => (
                  <tr key={`${row.id}-${row.action}`} className="border-b border-slate-100">
                    <td className="table-cell font-mono font-bold">{row.id}</td>
                    <td className="table-cell">
                      <p className="font-semibold">{row.model}</p>
                    </td>
                    <td className="table-cell">{row.action}</td>
                    <td
                      className={`table-cell font-bold ${
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
                    <td className="table-cell">
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
                    <td colSpan={5} className="table-cell text-sm text-slate-500">Nenhum registro de preventiva.</td>
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
