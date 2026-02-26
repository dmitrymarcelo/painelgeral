"use client";

/**
 * RESPONSABILIDADE:
 * Gestao de Preventivas (visao por ativo) com filtros, status de prioridade e detalhes historicos.
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - Cruza dados mock de ativos/servicos com eventos de manutencao do `maintenance-store`.
 * - Funciona como prototipo da futura visao consolidada de ativos + preventivas.
 *
 * CONTRATO BACKEND: backend deve expor ativos, historico de manutencao, agendamentos e
 * execucoes por placa/modelo para compor os indicadores exibidos nesta tela.
 */
import { useEffect, useMemo, useState } from "react";
import { WebShell } from "@/components/layout/web-shell";
import { translations } from "@/lib/i18n";
import {
  getMaintenanceEvents,
  MaintenanceEvent,
  subscribeMaintenanceEvents,
} from "@/lib/maintenance-store";

type ChecklistItem = {
  item: string;
  ok: boolean;
  note?: string;
};

type ServiceRecord = {
  id: string;
  service: string;
  scheduledAt: string;
  dueType: "KM" | "Tempo";
  programmedDueDate: string;
  plannedKm: number;
  executedAt?: string | null;
  executedKm?: number | null;
  technician?: string;
  checklist: ChecklistItem[];
};

type AssetRow = {
  id: string;
  type: string;
  code: string;
  model: string;
  centerCost: string;
  lastKm: number;
  currentKm: number;
  nextKm: number;
  status: string;
  services: ServiceRecord[];
};

type SyncedChecklistRun = {
  checklistId?: string;
  asset?: string;
  completedAt?: string;
  status?: string;
};

const LOCAL_SYNC_RUNS_KEY = "frota-pro.synced-checklist-runs";

const rows: AssetRow[] = [
  {
    id: "asset-1",
    type: "Caminhao",
    code: "XYZ-9876",
    model: "Volvo FH 540",
    centerCost: "Logistica Norte",
    lastKm: 110000,
    currentKm: 124500,
    nextKm: 125000,
    status: translations.attention,
    services: [
      {
        id: "srv-1",
        service: "Troca de oleo e filtros",
        scheduledAt: "2026-02-14T09:00:00",
        dueType: "KM",
        programmedDueDate: "2026-02-14",
        plannedKm: 123000,
        executedAt: "2026-02-15T11:10:00",
        executedKm: 124500,
        technician: "Carlos Mecanico",
        checklist: [
          { item: "Troca filtro de oleo", ok: true },
          { item: "Troca filtro de ar", ok: true },
          { item: "Aperto geral", ok: true },
        ],
      },
      {
        id: "srv-2",
        service: "Revisao de freios",
        scheduledAt: "2026-02-18T10:00:00",
        dueType: "Tempo",
        programmedDueDate: "2026-02-18",
        plannedKm: 124700,
        executedAt: null,
        executedKm: null,
        technician: "Ricardo Eletro",
        checklist: [
          { item: "Verificar pastilhas", ok: false, note: "Aguardando ativo no box" },
          { item: "Teste de eficiencia", ok: false },
        ],
      },
    ],
  },
  {
    id: "asset-2",
    type: "Utilitario",
    code: "ABC-1234",
    model: "Toyota Hilux",
    centerCost: "Operacoes Campo",
    lastKm: 40000,
    currentKm: 51240,
    nextKm: 60000,
    status: translations.compliant,
    services: [
      {
        id: "srv-3",
        service: "Revisao 50k",
        scheduledAt: "2026-02-10T08:30:00",
        dueType: "KM",
        programmedDueDate: "2026-02-10",
        plannedKm: 50000,
        executedAt: "2026-02-12T09:00:00",
        executedKm: 51240,
        technician: "Marcos Silva",
        checklist: [
          { item: "Nivel de oleo", ok: true },
          { item: "Sistema de freio", ok: true },
          { item: "Suspensao e bandejas", ok: true },
          { item: "Scanner de falhas", ok: true },
        ],
      },
      {
        id: "srv-4",
        service: "Troca de pneus",
        scheduledAt: "2026-02-16T14:00:00",
        dueType: "KM",
        programmedDueDate: "2026-02-16",
        plannedKm: 51000,
        executedAt: null,
        executedKm: null,
        technician: "Nao atribuido",
        checklist: [
          { item: "Conferencia de pneus", ok: false, note: "Nao compareceu ao servico" },
        ],
      },
    ],
  },
  {
    id: "asset-3",
    type: "Motocicleta",
    code: "MOT-2024",
    model: "Honda CB 500X",
    centerCost: "Suporte Tecnico",
    lastKm: 1000,
    currentKm: 9550,
    nextKm: 10000,
    status: translations.nearDueStatus,
    services: [
      {
        id: "srv-5",
        service: "Troca kit relacao",
        scheduledAt: "2026-02-17T13:00:00",
        dueType: "KM",
        programmedDueDate: "2026-02-17",
        plannedKm: 9300,
        executedAt: "2026-02-17T15:10:00",
        executedKm: 9550,
        technician: "Carlos Mecanico",
        checklist: [
          { item: "Troca corrente", ok: true },
          { item: "Troca coroa e pinhao", ok: true },
          { item: "Lubrificacao final", ok: true },
        ],
      },
    ],
  },
];

const formatKm = (value: number) => `${value.toLocaleString("pt-BR")} KM`;
const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const formatDateOnly = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("pt-BR") : "-";

const getServiceAttendanceStatus = (service: ServiceRecord) => {
  if (service.executedAt) return "Compareceu";
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (new Date(service.scheduledAt) < todayStart) return "Nao compareceu ao servico";
  return "Agendado";
};

const getKmExecutionStatus = (service: ServiceRecord) => {
  if (!service.executedAt || !service.executedKm) return "Sem execucao";
  if (service.executedKm > service.plannedKm) {
    const diff = service.executedKm - service.plannedKm;
    return `Executada em atraso (+${diff.toLocaleString("pt-BR")} km)`;
  }
  return "Executada no prazo";
};

const normalizeValue = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const parseAssetLabel = (label: string) => {
  const parts = label.split(" - ").map((part) => part.trim());
  if (parts.length >= 2) {
    return { model: parts.slice(0, -1).join(" - "), code: parts[parts.length - 1] };
  }
  return { model: label, code: label };
};

const loadSyncedRunsFromStorage = (): SyncedChecklistRun[] => {
  // CONTRATO BACKEND: em producao, este dado deve vir de `/checklists/runs` sincronizados.
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(LOCAL_SYNC_RUNS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SyncedChecklistRun[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item?.asset && item?.completedAt && item?.status === "synced");
  } catch {
    return [];
  }
};

type AssetPriorityStatus = "Alta" | "Media" | "Baixa";
type AssetSchedulingStatus =
  | "Agendado p/ Hoje"
  | "Agendado"
  | "Nao Agendado"
  | "Concluido";
type AssetPresenceStatus = "Compareceu" | "Nao Compareceu" | "Sem registro";

type AssetComputedRow = AssetRow & {
  priorityStatus: AssetPriorityStatus;
  schedulingStatus: AssetSchedulingStatus;
  lastMaintenanceDate: string | null;
  presenceStatus: AssetPresenceStatus;
  kmProgress: {
    ratioPercent: number;
    kmGap: number;
    label: string;
    tone: "good" | "warning" | "danger";
  };
};

const getEventDate = (event: MaintenanceEvent) =>
  new Date(event.year, event.month, event.day, ...event.time.split(":").map(Number));

const getPriorityStatus = (row: AssetRow): AssetPriorityStatus => {
  const kmGap = row.nextKm - row.currentKm;
  const latestExecutedService = row.services
    .filter((service) => service.executedAt)
    .sort((a, b) => new Date(b.executedAt ?? 0).getTime() - new Date(a.executedAt ?? 0).getTime())[0];
  const daysSinceLastExecution = latestExecutedService?.executedAt
    ? Math.floor((Date.now() - new Date(latestExecutedService.executedAt).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (kmGap <= 0 || daysSinceLastExecution >= 180) return "Alta";
  if (kmGap <= 5000 || daysSinceLastExecution >= 120) return "Media";
  return "Baixa";
};

const getPresenceStatusFromRow = (row: AssetRow): AssetPresenceStatus => {
  const latestBySchedule = [...row.services].sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
  )[0];
  if (!latestBySchedule) return "Sem registro";
  const attendance = getServiceAttendanceStatus(latestBySchedule);
  if (attendance === "Compareceu") return "Compareceu";
  if (attendance === "Nao compareceu ao servico") return "Nao Compareceu";
  return "Sem registro";
};

const getLastMaintenanceDateFromRow = (
  row: AssetRow,
  relatedEvents: MaintenanceEvent[],
): string | null => {
  const serviceDates = row.services
    .map((service) => service.executedAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime());
  const completedEventDates = relatedEvents
    .filter((event) => event.status === "completed")
    .map((event) => getEventDate(event).getTime());
  const latest = Math.max(0, ...serviceDates, ...completedEventDates);
  return latest > 0 ? new Date(latest).toISOString() : null;
};

const getSchedulingStatusFromEvents = (relatedEvents: MaintenanceEvent[]): AssetSchedulingStatus => {
  if (relatedEvents.length === 0) return "Nao Agendado";
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();

  const hasTodayScheduled = relatedEvents.some((event) => {
    if (event.status !== "scheduled") return false;
    const time = getEventDate(event).getTime();
    return time >= todayStart && time < tomorrowStart;
  });
  if (hasTodayScheduled) return "Agendado p/ Hoje";

  const hasFutureScheduled = relatedEvents.some((event) => {
    if (event.status !== "scheduled" && event.status !== "in_progress") return false;
    return getEventDate(event).getTime() >= todayStart;
  });
  if (hasFutureScheduled) return "Agendado";

  const hasCompleted = relatedEvents.some((event) => event.status === "completed");
  return hasCompleted ? "Concluido" : "Nao Agendado";
};

const getKmProgress = (row: AssetRow): AssetComputedRow["kmProgress"] => {
  // Regra de negocio: progresso compara KM atual com KM da proxima preventiva para indicar
  // quanto falta (ou passou) para o gatilho de manutencao. A barra usa a faixa entre ultima e proxima.
  const interval = Math.max(1, row.nextKm - row.lastKm);
  const traveledInInterval = row.currentKm - row.lastKm;
  const ratioPercent = Math.max(0, Math.min(100, Math.round((traveledInInterval / interval) * 100)));
  const kmGap = row.nextKm - row.currentKm;

  if (kmGap < 0) {
    return {
      ratioPercent: 100,
      kmGap,
      label: `Atrasado ${Math.abs(kmGap).toLocaleString("pt-BR")} km`,
      tone: "danger",
    };
  }
  if (kmGap === 0) {
    return {
      ratioPercent: 100,
      kmGap,
      label: "No gatilho",
      tone: "warning",
    };
  }
  if (kmGap <= 3000) {
    return {
      ratioPercent,
      kmGap,
      label: `Faltam ${kmGap.toLocaleString("pt-BR")} km`,
      tone: "warning",
    };
  }
  return {
    ratioPercent,
    kmGap,
    label: `Faltam ${kmGap.toLocaleString("pt-BR")} km`,
    tone: "good",
  };
};

export default function WebAssetsPage() {
  const [syncedRuns, setSyncedRuns] = useState<SyncedChecklistRun[]>([]);
  const [maintenanceEvents, setMaintenanceEvents] = useState<MaintenanceEvent[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState(rows[0]?.id ?? "");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterCenterCost, setFilterCenterCost] = useState("");
  const [filterPlate, setFilterPlate] = useState("");
  const [filterVehicleType, setFilterVehicleType] = useState("");
  const [filterPriorityStatus, setFilterPriorityStatus] = useState("");
  const [filterExecutionDate, setFilterExecutionDate] = useState("");
  const [filterPresence, setFilterPresence] = useState("");

  useEffect(() => {
    const refreshSyncedRuns = () => {
      setSyncedRuns(loadSyncedRunsFromStorage());
    };

    refreshSyncedRuns();
    window.addEventListener("focus", refreshSyncedRuns);
    window.addEventListener("storage", refreshSyncedRuns);
    return () => {
      window.removeEventListener("focus", refreshSyncedRuns);
      window.removeEventListener("storage", refreshSyncedRuns);
    };
  }, []);

  useEffect(() => {
    const refresh = () => setMaintenanceEvents(getMaintenanceEvents());
    refresh();
    return subscribeMaintenanceEvents(refresh);
  }, []);

  const rowsWithOrchestration = useMemo(() => {
    if (syncedRuns.length === 0 && maintenanceEvents.length === 0) return rows;

    return rows.map((row) => {
      const rowModel = normalizeValue(row.model);
      const rowCode = normalizeValue(row.code);
      const hasSyncedRun = syncedRuns.some((run) => {
        const runAsset = normalizeValue(run.asset ?? "");
        return (
          runAsset.includes(rowModel) ||
          rowModel.includes(runAsset) ||
          runAsset.includes(rowCode)
        );
      });
      const relatedEvents = maintenanceEvents.filter((event) => {
        const eventAsset = normalizeValue(event.asset);
        return eventAsset.includes(rowModel) || eventAsset.includes(rowCode);
      });
      const hasCompletedEvent = relatedEvents.some((event) => event.status === "completed");
      const hasInProgressEvent = relatedEvents.some((event) => event.status === "in_progress");
      const hasScheduledEvent = relatedEvents.some((event) => event.status === "scheduled");

      if (hasSyncedRun || hasCompletedEvent) {
        return { ...row, status: translations.compliant };
      }
      if (hasInProgressEvent) {
        return { ...row, status: translations.attention };
      }
      if (hasScheduledEvent) {
        return { ...row, status: translations.nearDueStatus };
      }
      return row;
    });
  }, [syncedRuns, maintenanceEvents]);

  const rowsWithComputedColumns = useMemo<AssetComputedRow[]>(() => {
    return rowsWithOrchestration.map((row) => {
      const rowModel = normalizeValue(row.model);
      const rowCode = normalizeValue(row.code);
      const relatedEvents = maintenanceEvents.filter((event) => {
        const eventAsset = normalizeValue(event.asset);
        return eventAsset.includes(rowModel) || eventAsset.includes(rowCode);
      });

      return {
        ...row,
        priorityStatus: getPriorityStatus(row),
        schedulingStatus: getSchedulingStatusFromEvents(relatedEvents),
        lastMaintenanceDate: getLastMaintenanceDateFromRow(row, relatedEvents),
        presenceStatus: getPresenceStatusFromRow(row),
        kmProgress: getKmProgress(row),
      };
    });
  }, [rowsWithOrchestration, maintenanceEvents]);

  const filteredRows = useMemo(() => {
    const normalizedPlateFilter = normalizeValue(filterPlate);

    return rowsWithComputedColumns.filter((row) => {
      const matchesCenterCost =
        !filterCenterCost || normalizeValue(row.centerCost) === normalizeValue(filterCenterCost);
      const matchesPlate =
        !normalizedPlateFilter || normalizeValue(row.code).includes(normalizedPlateFilter);
      const matchesVehicleType =
        !filterVehicleType || normalizeValue(row.type) === normalizeValue(filterVehicleType);
      const matchesPriority = !filterPriorityStatus || row.priorityStatus === filterPriorityStatus;
      const matchesPresence = !filterPresence || row.presenceStatus === filterPresence;
      const matchesExecutionDate =
        !filterExecutionDate ||
        row.services.some((service) =>
          service.executedAt ? service.executedAt.slice(0, 10) === filterExecutionDate : false,
        );

      return (
        matchesCenterCost &&
        matchesPlate &&
        matchesVehicleType &&
        matchesPriority &&
        matchesPresence &&
        matchesExecutionDate
      );
    });
  }, [
    filterCenterCost,
    filterExecutionDate,
    filterPlate,
    filterPresence,
    filterPriorityStatus,
    filterVehicleType,
    rowsWithComputedColumns,
  ]);

  const selectedAsset = useMemo(
    () => rowsWithOrchestration.find((row) => row.id === selectedAssetId) ?? rowsWithOrchestration[0],
    [rowsWithOrchestration, selectedAssetId],
  );

  const relatedMaintenanceEvents = useMemo(() => {
    if (!selectedAsset) return [];
    const modelNeedle = normalizeValue(selectedAsset.model);
    const codeNeedle = normalizeValue(selectedAsset.code);

    return maintenanceEvents
      .filter((event) => {
        const parsed = parseAssetLabel(event.asset);
        const eventModel = normalizeValue(parsed.model);
        const eventCode = normalizeValue(parsed.code);
        return (
          eventModel.includes(modelNeedle) ||
          modelNeedle.includes(eventModel) ||
          eventCode.includes(codeNeedle) ||
          codeNeedle.includes(eventCode)
        );
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        if (a.month !== b.month) return b.month - a.month;
        if (a.day !== b.day) return b.day - a.day;
        return b.time.localeCompare(a.time);
      });
  }, [maintenanceEvents, selectedAsset]);

  const assetsSummary = useMemo(() => {
    const total = filteredRows.length;
    const highPriority = filteredRows.filter((row) => row.priorityStatus === "Alta").length;
    const scheduledToday = filteredRows.filter((row) => row.schedulingStatus === "Agendado p/ Hoje").length;
    const noShow = filteredRows.filter((row) => row.presenceStatus === "Nao Compareceu").length;
    return { total, highPriority, scheduledToday, noShow };
  }, [filteredRows]);

  return (
    <WebShell title={translations.fleetAssetManagement} subtitle={translations.totalAssets}>
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="kpi-card border-l-4 border-l-slate-400 bg-gradient-to-b from-white to-slate-50">
            <div className="flex items-center justify-between">
              <p className="stat-label">Ativos filtrados</p>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">
                Lista
              </span>
            </div>
            <p className="mt-2 text-4xl font-black text-slate-900">{assetsSummary.total}</p>
            <p className="text-xs font-semibold text-slate-500">Central de filtros aplicada</p>
          </div>
          <div className="kpi-card border-l-4 border-l-red-500 bg-gradient-to-b from-white to-rose-50/30">
            <div className="flex items-center justify-between">
              <p className="stat-label">Prioridade Alta</p>
              <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-black uppercase text-red-700">
                Acao
              </span>
            </div>
            <p className="mt-2 text-4xl font-black text-red-700">{assetsSummary.highPriority}</p>
            <p className="text-xs font-semibold text-slate-500">Risco por KM/tempo</p>
          </div>
          <div className="kpi-card border-l-4 border-l-blue-500 bg-gradient-to-b from-white to-blue-50/30">
            <div className="flex items-center justify-between">
              <p className="stat-label">Agendados Hoje</p>
              <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black uppercase text-blue-700">
                Hoje
              </span>
            </div>
            <p className="mt-2 text-4xl font-black text-blue-700">{assetsSummary.scheduledToday}</p>
            <p className="text-xs font-semibold text-slate-500">Status de agendamento</p>
          </div>
          <div className="kpi-card border-l-4 border-l-amber-500 bg-gradient-to-b from-white to-amber-50/30">
            <div className="flex items-center justify-between">
              <p className="stat-label">Nao Compareceu</p>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-700">
                Presenca
              </span>
            </div>
            <p className="mt-2 text-4xl font-black text-amber-700">{assetsSummary.noShow}</p>
            <p className="text-xs font-semibold text-slate-500">Ultimos registros filtrados</p>
          </div>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Central de Filtros</p>
              <p className="text-sm text-slate-500">Use filtros para consultar preventivas por status, presenca e execucao.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">
              {filteredRows.length} resultado{filteredRows.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Centro Custo</label>
              <select
                value={filterCenterCost}
                onChange={(event) => setFilterCenterCost(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                {[...new Set(rowsWithComputedColumns.map((row) => row.centerCost))].map((centerCost) => (
                  <option key={centerCost} value={centerCost}>
                    {centerCost}
                  </option>
                ))}
              </select>
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
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Tipo de veiculo</label>
              <select
                value={filterVehicleType}
                onChange={(event) => setFilterVehicleType(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                {[...new Set(rowsWithComputedColumns.map((row) => row.type))].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Status Prioridade</label>
              <select
                value={filterPriorityStatus}
                onChange={(event) => setFilterPriorityStatus(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baixa">Baixa</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Data de execucao</label>
              <input
                type="date"
                value={filterExecutionDate}
                onChange={(event) => setFilterExecutionDate(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Presenca</label>
              <select
                value={filterPresence}
                onChange={(event) => setFilterPresence(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                <option value="Compareceu">Compareceu</option>
                <option value="Nao Compareceu">Nao Compareceu</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="table-head-cell">{translations.plateId}</th>
                <th className="table-head-cell">Tipo</th>
                <th className="table-head-cell">Centro Custo</th>
                <th className="table-head-cell">{translations.modelType}</th>
                <th className="table-head-cell">Ultima MT</th>
                <th className="table-head-cell">KM Atual</th>
                <th className="table-head-cell">Proxima</th>
                <th className="table-head-cell">Progresso</th>
                <th className="table-head-cell">Prioridade</th>
                <th className="table-head-cell">Agendamento</th>
                <th className="table-head-cell">Presenca</th>
                <th className="table-head-cell">{translations.status}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => {
                    setSelectedAssetId(row.id);
                    setDetailsOpen(true);
                  }}
                  className={`cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 ${
                    row.id === selectedAsset?.id ? "bg-[var(--color-brand-soft)]/40" : ""
                  }`}
                >
                  <td className="table-cell font-mono font-bold">{row.code}</td>
                  <td className="table-cell font-semibold">{row.type}</td>
                  <td className="table-cell">{row.centerCost}</td>
                  <td className="table-cell">{row.model}</td>
                  <td className="table-cell text-slate-600">{formatDateOnly(row.lastMaintenanceDate)}</td>
                  <td className="table-cell font-bold">{formatKm(row.currentKm)}</td>
                  <td className="table-cell font-bold text-[var(--color-danger)]">{formatKm(row.nextKm)}</td>
                  <td className="table-cell">
                    <div className="min-w-[160px]">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            row.kmProgress.tone === "danger"
                              ? "bg-red-500"
                              : row.kmProgress.tone === "warning"
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                          style={{ width: `${row.kmProgress.ratioPercent}%` }}
                        />
                      </div>
                      <p
                        className={`mt-1 text-[11px] font-bold ${
                          row.kmProgress.tone === "danger"
                            ? "text-red-700"
                            : row.kmProgress.tone === "warning"
                              ? "text-amber-700"
                              : "text-slate-600"
                        }`}
                      >
                        {row.kmProgress.label}
                      </p>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                        row.priorityStatus === "Alta"
                          ? "bg-red-100 text-red-700"
                          : row.priorityStatus === "Media"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {row.priorityStatus}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                        row.schedulingStatus === "Agendado p/ Hoje"
                          ? "bg-blue-100 text-blue-700"
                          : row.schedulingStatus === "Agendado"
                            ? "bg-sky-100 text-sky-700"
                            : row.schedulingStatus === "Concluido"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {row.schedulingStatus}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                        row.presenceStatus === "Compareceu"
                          ? "bg-emerald-100 text-emerald-700"
                          : row.presenceStatus === "Nao Compareceu"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {row.presenceStatus}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                        row.status === translations.critical
                          ? "bg-red-100 text-red-600"
                          : row.status === translations.attention
                            ? "bg-amber-100 text-amber-700"
                            : row.status === translations.compliant
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td className="table-cell text-sm text-slate-500" colSpan={12}>
                    Nenhum registro encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detailsOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-6" onClick={() => setDetailsOpen(false)}>
          <div className="h-[90vh] w-full max-w-7xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Detalhes do ativo</p>
                <h3 className="text-xl font-black">{selectedAsset.model} - {selectedAsset.code}</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-slate-500">KM atual</p>
                  <p className="text-lg font-black">{formatKm(selectedAsset.currentKm)}</p>
                </div>
                <button
                  onClick={() => setDetailsOpen(false)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black uppercase text-slate-600 hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="h-[calc(90vh-80px)] overflow-auto p-5">
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Tipo de vencimento</th>
                      <th className="px-4 py-3">Data programada</th>
                      <th className="px-4 py-3">Agendamento</th>
                      <th className="px-4 py-3">Presenca</th>
                      <th className="px-4 py-3">KM programada</th>
                      <th className="px-4 py-3">KM executada</th>
                      <th className="px-4 py-3">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAsset.services.map((service) => {
                      const attendance = getServiceAttendanceStatus(service);
                      const kmStatus = getKmExecutionStatus(service);
                      const okCount = service.checklist.filter((item) => item.ok).length;
                      const totalCount = service.checklist.length;
                      const checklistPercent = totalCount > 0 ? Math.round((okCount / totalCount) * 100) : 0;

                      return (
                        <tr key={service.id} className="border-t border-slate-100 align-top">
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                                service.dueType === "KM"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-violet-100 text-violet-700"
                              }`}
                            >
                              {service.dueType}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold">
                              {new Date(service.programmedDueDate).toLocaleDateString("pt-BR")}
                            </p>
                            <p className="text-xs text-slate-500">Vencimento preventiva</p>
                          </td>
                          <td className="px-4 py-3">
                            <p>{formatDateTime(service.scheduledAt)}</p>
                            {service.executedAt && (
                              <p className="text-xs text-slate-500">Executado: {formatDateTime(service.executedAt)}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                                attendance === "Compareceu"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : attendance === "Nao compareceu ao servico"
                                    ? "bg-red-100 text-red-600"
                                    : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {attendance}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold">{formatKm(service.plannedKm)}</td>
                          <td className="px-4 py-3 font-semibold">
                            {service.executedKm ? formatKm(service.executedKm) : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold">{service.service}</p>
                            <p className="text-xs text-slate-500">Tecnico: {service.technician ?? "Nao informado"}</p>
                            <p
                              className={`mt-1 font-semibold ${
                                kmStatus.startsWith("Executada em atraso")
                                  ? "text-red-600"
                                  : kmStatus === "Executada no prazo"
                                    ? "text-emerald-700"
                                    : "text-slate-500"
                              }`}
                            >
                              {kmStatus}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Checklist: {okCount}/{totalCount} ({checklistPercent}%)
                            </p>
                            <div className="mt-2 space-y-1">
                              {service.checklist.map((item) => (
                                <p key={item.item} className="text-xs text-slate-600">
                                  - {item.item}: {item.ok ? "ok" : "pendente"}
                                  {item.note ? ` (${item.note})` : ""}
                                </p>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Log de rastreabilidade de agendamento
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-white text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Data/Hora</th>
                      <th className="px-4 py-3">Servico</th>
                      <th className="px-4 py-3">Responsavel Agendamento</th>
                      <th className="px-4 py-3">Matricula</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedMaintenanceEvents.map((event) => (
                      <tr key={event.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 text-slate-600">
                          {String(event.day).padStart(2, "0")}/{String(event.month + 1).padStart(2, "0")}/{event.year} {event.time}
                        </td>
                        <td className="px-4 py-3 font-semibold">{event.title}</td>
                        <td className="px-4 py-3">{event.schedulerName || "Nao informado"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{event.schedulerMatricula || "-"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                              event.status === "completed"
                                ? "bg-emerald-100 text-emerald-700"
                                : event.status === "in_progress"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {event.status === "completed"
                              ? "Concluido"
                              : event.status === "in_progress"
                                ? "Em andamento"
                                : "Agendado"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {relatedMaintenanceEvents.length === 0 && (
                      <tr>
                        <td className="px-4 py-4 text-sm text-slate-500" colSpan={5}>
                          Nenhum agendamento rastreado para este ativo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </WebShell>
  );
}

