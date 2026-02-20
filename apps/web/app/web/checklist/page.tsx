"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { WebShell } from "@/components/layout/web-shell";
import { apiRequest } from "@/lib/api-client";
import { getChecklistRuns as getOfflineChecklistRuns } from "@/lib/offline-db";
import {
  getMaintenanceDueDate,
  getMaintenanceEvents,
  MaintenanceEvent,
  markAssetMaintenanceCompleted,
  markMaintenanceEventCompletedById,
  markMaintenanceEventInProgressById,
  subscribeMaintenanceEvents,
} from "@/lib/maintenance-store";
import { getActiveTechnicianNames } from "@/lib/technicians-store";
import {
  createPreventiveChecklistItems,
} from "@/lib/preventive-checklists";
import { translations } from "@/lib/i18n";

type RunStatus = "pending" | "synced" | "failed";
type VerificationStatus = "VENCIDA" | "A_VENCER" | "EM_CURSO" | "CONCLUIDO_FECHADO";

type VerificationChecklistItem = {
  id: string;
  group: string;
  label: string;
  done: boolean;
};

type VerificationRow = {
  id: string;
  eventId?: string;
  plate: string;
  asset: string;
  action: string;
  reference: string;
  owner: string;
  status: VerificationStatus;
  runStatus: RunStatus;
  scheduled: boolean;
  checklistItems: VerificationChecklistItem[];
  notes: string;
  technician: string;
  completedAt?: string;
};

type ChecklistRun = {
  id?: string | number;
  checklistId: string;
  asset: string;
  type: string;
  reference: string;
  technician: string;
  completedItems: number;
  totalItems: number;
  notes: string;
  completedAt: string;
  status: string;
};

const TENANT = "frota-pro";
const LOCAL_SYNC_RUNS_KEY = "frota-pro.synced-checklist-runs";
const CHECKLIST_ROWS_KEY = "frota-pro.web-checklist.rows";
const CLOSED_STATUS: VerificationStatus = "CONCLUIDO_FECHADO";

const runIdentity = (run: ChecklistRun) => `${run.checklistId}::${run.completedAt}`;

const parseAssetLabel = (assetLabel: string) => {
  const parts = assetLabel.split(" - ").map((part) => part.trim());
  if (parts.length >= 2) {
    return {
      asset: parts.slice(0, -1).join(" - "),
      plate: parts[parts.length - 1],
    };
  }

  return { asset: assetLabel, plate: "SEM-PLACA" };
};

const mapEventStatusToVerificationStatus = (event: MaintenanceEvent): VerificationStatus => {
  if (event.status === "completed") return "CONCLUIDO_FECHADO";
  if (event.status === "in_progress") return "EM_CURSO";
  return getMaintenanceDueDate(event).getTime() < Date.now() ? "VENCIDA" : "A_VENCER";
};

const mapEventToRow = (event: MaintenanceEvent, previous?: VerificationRow): VerificationRow => {
  const parsed = parseAssetLabel(event.asset);
  const baseItems = createPreventiveChecklistItems(event.asset).map((item) => ({
    id: item.id,
    group: item.group,
    label: item.label,
    done: false,
  }));

  const currentItems =
    previous && previous.checklistItems.length > 0 ? previous.checklistItems : baseItems;

  const dateLabel = `${String(event.day).padStart(2, "0")}/${String(event.month + 1).padStart(
    2,
    "0",
  )}/${event.year}`;

  return {
    id: `event:${event.id}`,
    eventId: event.id,
    plate: parsed.plate,
    asset: parsed.asset,
    action: event.title || "Manutencao Preventiva",
    reference: `${dateLabel} ${event.time}`,
    owner: previous?.owner || "Oficina Norte",
    status: mapEventStatusToVerificationStatus(event),
    runStatus: event.status === "completed" ? "synced" : previous?.runStatus || "pending",
    scheduled: true,
    checklistItems: currentItems,
    notes: previous?.notes || event.description || "",
    technician: previous?.technician || event.technician || "",
    completedAt: event.completedAt || previous?.completedAt,
  };
};

function readBridgeRuns(): ChecklistRun[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(LOCAL_SYNC_RUNS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ChecklistRun[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item?.checklistId && item?.completedAt);
  } catch {
    return [];
  }
}

function writeBridgeRuns(runs: ChecklistRun[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_SYNC_RUNS_KEY, JSON.stringify(runs.slice(0, 500)));
}

function mergeRuns(lists: ChecklistRun[][]): ChecklistRun[] {
  const merged = new Map<string, ChecklistRun>();
  for (const list of lists) {
    for (const run of list) {
      const key = runIdentity(run);
      if (!merged.has(key)) {
        merged.set(key, run);
      }
    }
  }

  return [...merged.values()].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );
}

function readPersistedRows(): VerificationRow[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(CHECKLIST_ROWS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as VerificationRow[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function statusLabel(status: VerificationStatus) {
  if (status === "VENCIDA") return "Vencida";
  if (status === "A_VENCER") return "A vencer";
  if (status === "EM_CURSO") return "Em curso";
  return "Concluido e fechado";
}

function statusChipClass(status: VerificationStatus) {
  if (status === "VENCIDA") return "bg-red-100 text-red-600";
  if (status === "A_VENCER") return "bg-amber-100 text-amber-700";
  if (status === "EM_CURSO") return "bg-blue-100 text-blue-700";
  return "bg-emerald-100 text-emerald-700";
}

const syncRowsWithEvents = (rows: VerificationRow[], events: MaintenanceEvent[]) => {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const activeEventRowIds = new Set<string>();

  for (const event of events) {
    if (event.type !== "preventive") continue;
    const rowId = `event:${event.id}`;
    activeEventRowIds.add(rowId);

    const previous = byId.get(rowId);
    const nextRow = mapEventToRow(event, previous);
    byId.set(rowId, nextRow);
  }

  const reconciled: VerificationRow[] = [];
  for (const row of byId.values()) {
    const isEventRow = row.id.startsWith("event:");
    if (isEventRow && !activeEventRowIds.has(row.id) && row.status !== CLOSED_STATUS) {
      continue;
    }
    reconciled.push(row);
  }

  reconciled.sort((a, b) => {
    const rank = (status: VerificationStatus) => {
      if (status === "VENCIDA") return 0;
      if (status === "A_VENCER") return 1;
      if (status === "EM_CURSO") return 2;
      return 3;
    };

    const statusDiff = rank(a.status) - rank(b.status);
    if (statusDiff !== 0) return statusDiff;
    return a.asset.localeCompare(b.asset);
  });

  return reconciled;
};

export default function WebChecklistPage() {
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [checklistRuns, setChecklistRuns] = useState<ChecklistRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [technicianOptions, setTechnicianOptions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const pushRunToSyncFlow = (run: ChecklistRun) => {
    setChecklistRuns((current) => mergeRuns([[run], current]));
    const merged = mergeRuns([[run], readBridgeRuns()]);
    writeBridgeRuns(merged);
  };

  useEffect(() => {
    setRows(readPersistedRows());
    setTechnicianOptions(getActiveTechnicianNames());
    void loadChecklistRuns();

    const onStorage = (event: StorageEvent) => {
      if (event.key === LOCAL_SYNC_RUNS_KEY) {
        void loadChecklistRuns();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CHECKLIST_ROWS_KEY, JSON.stringify(rows));
  }, [rows]);

  useEffect(() => {
    const refresh = () => {
      const events = getMaintenanceEvents();
      setRows((current) => syncRowsWithEvents(current, events));
    };

    refresh();
    return subscribeMaintenanceEvents(refresh);
  }, []);

  const loadChecklistRuns = async () => {
    const apiRuns: ChecklistRun[] = [];
    let offlineRuns: ChecklistRun[] = [];
    let bridgeRuns: ChecklistRun[] = [];

    try {
      setLoadingRuns(true);
      const response = await apiRequest<ChecklistRun[]>("/checklists/runs", {
        method: "GET",
        tenantId: TENANT,
      });
      if (Array.isArray(response)) {
        apiRuns.push(...response);
      }
    } catch {
      // fallback local only
    }

    try {
      const localRuns = await getOfflineChecklistRuns();
      offlineRuns = localRuns
        .filter((item) => item.status === "synced")
        .map((item) => ({
          id: item.id,
          checklistId: item.checklistId,
          asset: item.asset,
          type: item.type,
          reference: item.reference,
          technician: item.technician,
          completedItems: item.completedItems,
          totalItems: item.totalItems,
          notes: item.notes,
          completedAt: item.completedAt,
          status: item.status,
        }));
    } catch {
      offlineRuns = [];
    }

    bridgeRuns = readBridgeRuns();
    const consolidated = mergeRuns([apiRuns, offlineRuns, bridgeRuns]);
    setChecklistRuns(consolidated);
    writeBridgeRuns(mergeRuns([bridgeRuns, offlineRuns, apiRuns]));
    setLoadingRuns(false);
  };

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const selectedIsLocked = selected?.status === CLOSED_STATUS;

  const pendingRows = useMemo(
    () => rows.filter((row) => row.status !== CLOSED_STATUS),
    [rows],
  );

  const overdueCount = useMemo(
    () => rows.filter((row) => row.status === "VENCIDA").length,
    [rows],
  );

  const nearDueCount = useMemo(
    () => rows.filter((row) => row.status === "A_VENCER").length,
    [rows],
  );

  const completedCount = useMemo(
    () => rows.filter((row) => row.status === CLOSED_STATUS).length,
    [rows],
  );

  const filteredRows = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "completed") return rows.filter((row) => row.status === CLOSED_STATUS);
    return rows.filter((row) => row.status !== CLOSED_STATUS);
  }, [rows, filter]);

  const updateSelected = (patch: Partial<VerificationRow>) => {
    if (!selected) return;
    setRows((current) =>
      current.map((row) => (row.id === selected.id ? { ...row, ...patch } : row)),
    );
  };

  const toggleItem = (itemId: string) => {
    if (!selected || selectedIsLocked) return;
    setRows((current) =>
      current.map((row) => {
        if (row.id !== selected.id) return row;
        return {
          ...row,
          checklistItems: row.checklistItems.map((item) =>
            item.id === itemId ? { ...item, done: !item.done } : item,
          ),
        };
      }),
    );
  };

  const finalizeSelected = async () => {
    if (!selected || selectedIsLocked) return;
    if (!selected.technician) {
      alert("Selecione um tecnico responsavel antes de finalizar.");
      return;
    }

    setSaving(true);
    const completedAt = new Date().toISOString();
    const completedItems = selected.checklistItems.filter((item) => item.done).length;

    setRows((current) =>
      current.map((row) =>
        row.id === selected.id
          ? {
              ...row,
              status: CLOSED_STATUS,
              runStatus: "synced",
              completedAt,
            }
          : row,
      ),
    );

    const run: ChecklistRun = {
      checklistId: selected.eventId || selected.id,
      asset: `${selected.asset} - ${selected.plate}`,
      type: "Checklist Preventiva",
      reference: selected.reference,
      technician: selected.technician,
      completedItems,
      totalItems: selected.checklistItems.length,
      notes: selected.notes,
      completedAt,
      status: "synced",
    };

    try {
      await apiRequest(`/checklists/runs/${selected.id}/submit`, {
        method: "POST",
        tenantId: TENANT,
        body: {
          notes: selected.notes,
          technician: selected.technician,
          completedAt,
          checklistItems: selected.checklistItems,
        },
      });
    } catch {
      // local flow permanece
    } finally {
      pushRunToSyncFlow(run);
      if (selected.eventId) {
        markMaintenanceEventCompletedById(selected.eventId, selected.technician);
      } else {
        markAssetMaintenanceCompleted(selected.asset, selected.technician);
      }
      setSaving(false);
      setSelectedId(null);
    }
  };

  return (
    <WebShell title={translations.preventiveMaintenanceChecklist} subtitle={translations.operationsControl}>
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="kpi-card">
            <p className="stat-label">{translations.totalPending}</p>
            <p className="text-4xl font-black">{pendingRows.length}</p>
          </div>
          <div className="kpi-card border border-red-200">
            <p className="stat-label text-red-500">{translations.overdueShort}</p>
            <p className="text-4xl font-black text-red-600">{overdueCount}</p>
          </div>
          <div className="kpi-card border border-amber-200">
            <p className="stat-label text-amber-600">{translations.nearDueShort}</p>
            <p className="text-4xl font-black text-amber-600">{nearDueCount}</p>
          </div>
          <div className="kpi-card border border-emerald-200">
            <p className="stat-label text-emerald-600">{translations.completedToday}</p>
            <p className="text-4xl font-black text-emerald-600">{completedCount + checklistRuns.length}</p>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-lg font-black">Checklists sincronizados do App</h3>
            <button
              onClick={() => void loadChecklistRuns()}
              className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600"
            >
              {translations.synchronize}
            </button>
          </div>
          <div className="px-6 py-4 text-sm text-slate-600">
            {loadingRuns ? "Carregando..." : `${checklistRuns.length} checklists recebidos do modo App`}
          </div>
          {!loadingRuns && checklistRuns.length > 0 && (
            <div className="grid gap-3 border-t border-slate-100 px-6 py-4 md:grid-cols-2">
              {checklistRuns.slice(0, 12).map((run) => (
                <div key={runIdentity(run)} className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black text-emerald-800">{run.asset}</p>
                    <span className="rounded bg-blue-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                      Sincronizado
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    {run.completedItems}/{run.totalItems} itens | {run.technician}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(run.completedAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-lg font-black">{translations.verificationDatabase}</h3>
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as "all" | "pending" | "completed")}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-black"
              >
                <option value="all">{translations.all}</option>
                <option value="pending">{translations.pending}</option>
                <option value="completed">Concluidos</option>
              </select>
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-black uppercase text-white">
                {translations.exportChecklist}
              </button>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-6 py-4">{translations.vehiclePlate}</th>
                <th className="px-6 py-4">{translations.action}</th>
                <th className="px-6 py-4">{translations.reference}</th>
                <th className="px-6 py-4">{translations.status}</th>
                <th className="px-6 py-4">{translations.responsible}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelectedId(row.id)}
                  className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50"
                >
                  <td className="px-6 py-4 font-semibold">
                    <p>{row.asset}</p>
                    <p className="text-xs text-slate-500">{row.plate}</p>
                  </td>
                  <td className="px-6 py-4">{row.action}</td>
                  <td className="px-6 py-4 font-bold text-[var(--color-danger)]">{row.reference}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${statusChipClass(row.status)}`}>
                      {statusLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {row.technician || row.owner}
                    {row.status === CLOSED_STATUS ? (
                      <p className="text-xs text-emerald-700">Fechado - sem edicao</p>
                    ) : (
                      <p className="text-xs text-slate-500">Clique para editar/finalizar</p>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td className="px-6 py-6 text-sm text-slate-500" colSpan={5}>
                    Nenhum checklist nesta visao.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Base de dados de verificacao</p>
                <h3 className="text-2xl font-black">{selected.asset}</h3>
                <p className="text-sm text-slate-600">
                  {selected.plate} | {selected.action} | {selected.reference}
                </p>
              </div>
              <button onClick={() => setSelectedId(null)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black uppercase">
                Fechar
              </button>
            </div>

            {selected.scheduled && selected.status !== CLOSED_STATUS && (
              <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                Ativo em agendamento. Abra o fluxo de &quot;Checklists disponiveis&quot; para continuar a execucao.
                <div className="mt-2">
                  <Link
                    href={`/app/checklist?asset=${encodeURIComponent(selected.asset)}&plate=${encodeURIComponent(selected.plate)}`}
                    className="inline-flex rounded-lg bg-blue-600 px-3 py-2 text-xs font-black uppercase text-white"
                  >
                    Abrir fluxo Checklists disponiveis
                  </Link>
                </div>
              </div>
            )}

            {selectedIsLocked ? (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                Checklist realizado e fechado. Edicao bloqueada para manter rastreabilidade.
              </div>
            ) : (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Checklist nao finalizado. Edicao e finalizacao liberadas no WEB.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Tecnico responsavel</label>
                <select
                  disabled={selectedIsLocked}
                  value={selected.technician}
                  onChange={(event) => updateSelected({ technician: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
                >
                  <option value="">Selecione</option>
                  {technicianOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Status operacional</label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold">
                  {statusLabel(selected.status)}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Descricao e detalhes adicionais</label>
              <textarea
                disabled={selectedIsLocked}
                value={selected.notes}
                onChange={(event) => updateSelected({ notes: event.target.value })}
                className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
                placeholder="Registre observacoes da preventiva"
              />
            </div>

            <div className="mt-6">
              <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">Itens de checklist preventiva</p>
              <div className="grid gap-3 md:grid-cols-2">
                {selected.checklistItems.map((item) => (
                  <label key={item.id} className={`flex gap-3 rounded-xl border p-3 text-sm ${item.done ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                    <input
                      type="checkbox"
                      checked={item.done}
                      disabled={selectedIsLocked}
                      onChange={() => toggleItem(item.id)}
                      className="mt-0.5 h-4 w-4"
                    />
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">{item.group}</p>
                      <p className="font-medium text-slate-800">{item.label}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => setSelectedId(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-black uppercase text-slate-700"
              >
                Cancelar
              </button>
              <button
                disabled={selectedIsLocked || saving}
                onClick={() => {
                  updateSelected({ status: "EM_CURSO", runStatus: "synced" });
                  if (selected.eventId) {
                    markMaintenanceEventInProgressById(selected.eventId, selected.technician);
                  }
                }}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black uppercase text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Salvar edicao
              </button>
              <button
                disabled={selectedIsLocked || saving}
                onClick={() => void finalizeSelected()}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Finalizando..." : "Finalizar e baixar preventiva"}
              </button>
            </div>
          </div>
        </div>
      )}
    </WebShell>
  );
}
