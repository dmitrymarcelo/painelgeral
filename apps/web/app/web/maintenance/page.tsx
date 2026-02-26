"use client";

/**
 * RESPONSABILIDADE:
 * Visao Web de Ordens de Servico (OS) derivadas dos agendamentos de manutencao.
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - Converte eventos do `maintenance-store` em linhas de OS para operacao e gestao.
 * - Compartilha semantica de status com calendario e dashboard.
 *
 * CONTRATO BACKEND: quando a API de O.S. estiver ativa, esta tela deve consumir `work_orders`
 * reais (com `createdAt`, `startedAt`, `completedAt`, responsaveis e status`) em vez de inferir.
 */
import { useEffect, useMemo, useState } from "react";
import { WebShell } from "@/components/layout/web-shell";
import { translations } from "@/lib/i18n";
import {
  getMaintenanceDueDate,
  getMaintenanceEvents,
  MaintenanceEvent,
  MaintenanceStatus,
  subscribeMaintenanceEvents,
} from "@/lib/maintenance-store";

type CompletionKind = "on_time" | "late" | null;

type OsRow = {
  code: string;
  asset: string;
  plate: string;
  vehicleType: string;
  fleetResponsible: string;
  schedulingResponsible: string;
  openedAt: string;
  mttr: string;
  status: MaintenanceStatus;
  statusLabel: "Agendada" | "Em andamento" | "Pendente" | "Concluida" | "Nao Compareceu" | "Em tolerancia";
  completionKind: CompletionKind;
};

const formatDue = (event: MaintenanceEvent) => {
  const day = String(event.day).padStart(2, "0");
  const month = String(event.month + 1).padStart(2, "0");
  return `${day}/${month} ${event.time}`;
};

const getEventDate = (event: MaintenanceEvent) => {
  const [hour, minute] = event.time.split(":").map(Number);
  return new Date(event.year, event.month, event.day, hour, minute, 0, 0);
};

const parseAssetLabel = (label: string) => {
  const parts = label.split(" - ").map((part) => part.trim());
  if (parts.length >= 2) {
    return { model: parts.slice(0, -1).join(" - "), plate: parts[parts.length - 1] };
  }
  return { model: label, plate: label };
};

const inferVehicleType = (asset: string) => {
  const normalized = asset
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (normalized.includes("volvo") || normalized.includes("fh") || normalized.includes("caminhao")) {
    return "Caminhao";
  }
  if (normalized.includes("toyota") || normalized.includes("hilux") || normalized.includes("utilitario")) {
    return "Utilitario";
  }
  if (normalized.includes("honda") || normalized.includes("cb ") || normalized.includes("mot")) {
    return "Motocicleta";
  }
  if (normalized.includes("sea ray") || normalized.includes("mar")) {
    return "Embarcacao";
  }
  return "Veiculo";
};

const FLEET_RESPONSIBLE_BY_PLATE: Record<string, string> = {
  "ABC-1234": "Marcos Silva",
  "XYZ-9876": "Carlos Mecanico",
  "MOT-2024": "Ricardo Eletro",
  "MAR-005": "Juliana Costa",
};

const getFleetResponsible = (plate: string) => FLEET_RESPONSIBLE_BY_PLATE[plate] ?? "Nao informado";

const getOsOpenedAt = (event: MaintenanceEvent) => {
  // O evento atual nao possui createdAt; usamos uma data de abertura estimada baseada no agendamento.
  // CONTRATO BACKEND: substituir por `workOrder.createdAt` real assim que existir.
  const dueDate = getEventDate(event);
  const opened = new Date(dueDate);
  opened.setDate(opened.getDate() - 1);
  return opened.toISOString();
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const formatMttr = (openedAt: string, event: MaintenanceEvent) => {
  if (event.status === "scheduled") return "-";
  const start = new Date(openedAt).getTime();
  const end = event.status === "completed" && event.completedAt
    ? new Date(event.completedAt).getTime()
    : Date.now();
  const diffMs = Math.max(end - start, 0);
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
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

const getOsStatusLabel = (event: MaintenanceEvent): OsRow["statusLabel"] => {
  if (event.status === "no_show") return "Nao Compareceu";
  if (event.status === "tolerance") return "Em tolerancia";
  if (event.status === "in_progress") return "Em andamento";
  if (event.status === "completed") return "Concluida";
  const dueDate = getEventDate(event).getTime();
  return dueDate < Date.now() ? "Pendente" : "Agendada";
};

export default function WebMaintenancePage() {
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [filterResponsible, setFilterResponsible] = useState("");
  const [filterVehicleType, setFilterVehicleType] = useState("");
  const [filterOpenedDate, setFilterOpenedDate] = useState("");
  const [filterPlate, setFilterPlate] = useState("");
  const [filterOs, setFilterOs] = useState("");
  const [filterOsStatus, setFilterOsStatus] = useState("");

  useEffect(() => {
    const refresh = () => setEvents(getMaintenanceEvents());
    refresh();
    return subscribeMaintenanceEvents(refresh);
  }, []);

  const rows = useMemo<OsRow[]>(() => {
    return events.map((event, index) => {
      const { plate } = parseAssetLabel(event.asset);
      const openedAt = getOsOpenedAt(event);
      return {
        code: normalizeCode(event, index),
        asset: event.asset,
        plate,
        vehicleType: inferVehicleType(event.asset),
        fleetResponsible: getFleetResponsible(plate),
        schedulingResponsible: event.schedulerName
          ? `${event.schedulerName}${event.schedulerMatricula ? ` (${event.schedulerMatricula})` : ""}`
          : "Nao informado",
        openedAt,
        mttr: formatMttr(openedAt, event),
        status: event.status,
        statusLabel: getOsStatusLabel(event),
        completionKind: getCompletionKind(event),
      };
    });
  }, [events]);

  const filteredRows = useMemo(() => {
    const norm = (v: string) =>
      v
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    return rows.filter((row) => {
      const matchesResponsible =
        !filterResponsible || norm(row.fleetResponsible) === norm(filterResponsible);
      const matchesVehicleType =
        !filterVehicleType || norm(row.vehicleType) === norm(filterVehicleType);
      const matchesOpenedDate = !filterOpenedDate || row.openedAt.slice(0, 10) === filterOpenedDate;
      const matchesPlate = !filterPlate || norm(row.plate).includes(norm(filterPlate));
      const matchesOs = !filterOs || norm(row.code).includes(norm(filterOs));
      const matchesStatus = !filterOsStatus || row.statusLabel === filterOsStatus;
      return (
        matchesResponsible &&
        matchesVehicleType &&
        matchesOpenedDate &&
        matchesPlate &&
        matchesOs &&
        matchesStatus
      );
    });
  }, [
    filterOpenedDate,
    filterOs,
    filterOsStatus,
    filterPlate,
    filterResponsible,
    filterVehicleType,
    rows,
  ]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const totalOsCount = rows.length;
  const inProgressCount = rows.filter((row) => row.statusLabel === "Em andamento").length;
  const scheduledCount = rows.filter((row) => row.statusLabel === "Agendada").length;
  const pendingCount = rows.filter((row) => row.statusLabel === "Pendente").length;
  const completedThisMonthCount = events.filter((event) => {
    if (event.status !== "completed" || !event.completedAt) return false;
    const completedDate = new Date(event.completedAt);
    return completedDate.getFullYear() === currentYear && completedDate.getMonth() === currentMonth;
  }).length;

  return (
    <WebShell title={translations.serviceOrders} subtitle={translations.activityManagement}>
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="kpi-card border-l-4 border-l-slate-400 bg-gradient-to-b from-white to-slate-50">
            <div className="flex items-center justify-between">
              <p className="stat-label">Total de OS</p>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">
                Geral
              </span>
            </div>
            <p className="text-4xl font-black">{totalOsCount}</p>
          </div>
          <div className="kpi-card border-l-4 border-l-amber-500 bg-gradient-to-b from-white to-amber-50/30">
            <div className="flex items-center justify-between">
              <p className="stat-label">OSs em andamento</p>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-700">
                Oficina
              </span>
            </div>
            <p className="text-4xl font-black">{inProgressCount}</p>
          </div>
          <div className="kpi-card border-l-4 border-l-sky-500 bg-gradient-to-b from-white to-sky-50/30">
            <div className="flex items-center justify-between">
              <p className="stat-label">OSs agendada</p>
              <span className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-black uppercase text-sky-700">
                Agenda
              </span>
            </div>
            <p className="text-4xl font-black">{scheduledCount}</p>
          </div>
          <div className="kpi-card border-l-4 border-l-red-500 bg-gradient-to-b from-white to-rose-50/30">
            <div className="flex items-center justify-between">
              <p className="stat-label">OSs pendentes</p>
              <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-black uppercase text-red-700">
                Prioridade
              </span>
            </div>
            <p className="text-4xl font-black">{pendingCount}</p>
          </div>
          <div className="kpi-card border-l-4 border-l-emerald-500 bg-gradient-to-b from-white to-emerald-50/30">
            <div className="flex items-center justify-between">
              <p className="stat-label">Concluidas mes</p>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase text-emerald-700">
                Resultado
              </span>
            </div>
            <p className="text-4xl font-black">{completedThisMonthCount}</p>
          </div>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Central de Filtros</p>
              <p className="text-sm text-slate-500">Consulte OS por responsavel, tipo, data de abertura e status.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">
              {filteredRows.length}/{rows.length} OS
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Responsavel</label>
              <select
                value={filterResponsible}
                onChange={(event) => setFilterResponsible(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                {[...new Set(rows.map((row) => row.fleetResponsible))].map((responsible) => (
                  <option key={responsible} value={responsible}>
                    {responsible}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Tipo de veiculo</label>
              <select
                value={filterVehicleType}
                onChange={(event) => setFilterVehicleType(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                {[...new Set(rows.map((row) => row.vehicleType))].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Data de abertura</label>
              <input
                type="date"
                value={filterOpenedDate}
                onChange={(event) => setFilterOpenedDate(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Placa</label>
              <input
                value={filterPlate}
                onChange={(event) => setFilterPlate(event.target.value)}
                placeholder="Ex.: ABC-1234"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">OS</label>
              <input
                value={filterOs}
                onChange={(event) => setFilterOs(event.target.value)}
                placeholder="Ex.: OS-2026..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Status da OS</label>
              <select
                value={filterOsStatus}
                onChange={(event) => setFilterOsStatus(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                <option value="Agendada">Agendada</option>
                <option value="Em andamento">Em andamento</option>
                <option value="Pendente">Pendente</option>
                <option value="Concluida">Concluida</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Ordens de Servico ({filteredRows.length})
          </div>
          <table className="w-full text-sm">
            <thead className="table-head text-left">
              <tr>
                <th className="table-head-cell">{translations.id}</th>
                <th className="table-head-cell">Placa</th>
                <th className="table-head-cell">Tipo de veiculo</th>
                <th className="table-head-cell">Responsavel</th>
                <th className="table-head-cell">Responsavel Agendamento</th>
                <th className="table-head-cell">Data de abertura da OS</th>
                <th className="table-head-cell">MTTR</th>
                <th className="table-head-cell">{translations.status}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.code} className="border-b border-slate-100">
                  <td className="table-cell font-mono font-bold">{row.code}</td>
                  <td className="table-cell font-mono font-semibold">{row.plate}</td>
                  <td className="table-cell">{row.vehicleType}</td>
                  <td className="table-cell">{row.fleetResponsible}</td>
                  <td className="table-cell">{row.schedulingResponsible}</td>
                  <td className="table-cell">{formatDateTime(row.openedAt)}</td>
                  <td className="table-cell font-semibold">{row.mttr}</td>
                  <td className="table-cell">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                        row.statusLabel === "Agendada"
                          ? "bg-sky-100 text-sky-700"
                          : row.statusLabel === "Em andamento"
                            ? "bg-amber-100 text-amber-700"
                            : row.statusLabel === "Pendente"
                              ? "bg-red-100 text-red-700"
                              : row.completionKind === "on_time"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {row.statusLabel === "Concluida" && row.completionKind === "on_time"
                        ? "Concluida no prazo"
                        : row.statusLabel}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td className="table-cell text-sm text-slate-500" colSpan={8}>
                    Nenhuma OS encontrada com os filtros selecionados.
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
