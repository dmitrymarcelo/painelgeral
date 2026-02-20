"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/layout/mobile-shell";
import {
  ChecklistRun,
  getChecklistRuns,
  listPendingActions,
  markActionSynced,
  queueOfflineAction,
  saveChecklistRun,
  updateChecklistRunStatusByKey,
} from "@/lib/offline-db";
import { apiRequest } from "@/lib/api-client";
import { getActiveTechnicianNames } from "@/lib/technicians-store";
import {
  getMaintenanceEvents,
  MaintenanceEvent,
  markAssetMaintenanceCompleted,
  markMaintenanceEventCompletedById,
  markMaintenanceEventInProgressById,
  subscribeMaintenanceEvents,
} from "@/lib/maintenance-store";
import {
  createPreventiveChecklistItems,
  getPreventiveChecklistTitle,
} from "@/lib/preventive-checklists";

const TENANT = "frota-pro";
const LOCAL_SYNC_RUNS_KEY = "frota-pro.synced-checklist-runs";
const HIDE_EXECUTED_AFTER_HOURS = 24;

type ChecklistStatus = "PENDENTE" | "EM_CURSO";

type ChecklistItem = {
  id: string;
  group: string;
  text: string;
  completed: boolean;
};

type ChecklistTemplate = {
  id: string;
  eventId: string;
  asset: string;
  type: string;
  reference: string;
  status: ChecklistStatus;
  items: ChecklistItem[];
};

type RenderRun = ChecklistRun & {
  computedStatus: "pending" | "synced";
};

const normalizeValue = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const runKey = (checklistId: string, completedAt: string) => `${checklistId}::${completedAt}`;

const formatReference = (event: MaintenanceEvent) => {
  const day = String(event.day).padStart(2, "0");
  const month = String(event.month + 1).padStart(2, "0");
  return `${day}/${month}/${event.year} ${event.time}`;
};

const buildTemplatesFromEvents = (events: MaintenanceEvent[]) => {
  return events
    .filter((event) => event.type === "preventive" && event.status !== "completed")
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if (a.month !== b.month) return a.month - b.month;
      if (a.day !== b.day) return a.day - b.day;
      return a.time.localeCompare(b.time);
    })
    .map<ChecklistTemplate>((event) => ({
      id: `tpl-${event.id}`,
      eventId: event.id,
      asset: event.asset,
      type: getPreventiveChecklistTitle(event.asset),
      reference: formatReference(event),
      status: event.status === "in_progress" ? "EM_CURSO" : "PENDENTE",
      items: createPreventiveChecklistItems(event.asset).map((item) => ({
        id: item.id,
        group: item.group,
        text: item.label,
        completed: false,
      })),
    }));
};

export default function MobileChecklistPage() {
  const routeQuery = useMemo(() => {
    if (typeof window === "undefined") {
      return { asset: "", plate: "" };
    }
    const params = new URLSearchParams(window.location.search);
    return {
      asset: params.get("asset") ?? "",
      plate: params.get("plate") ?? "",
    };
  }, []);

  const [pendingCount, setPendingCount] = useState(0);
  const [history, setHistory] = useState<RenderRun[]>([]);
  const [statusText, setStatusText] = useState("Pronto para operacao");
  const [maintenanceEvents, setMaintenanceEvents] = useState<MaintenanceEvent[]>([]);
  const [selected, setSelected] = useState<ChecklistTemplate | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [technicianOptions] = useState<string[]>(() => getActiveTechnicianNames());
  const [technicianName, setTechnicianName] = useState(() => {
    const names = getActiveTechnicianNames();
    return names.length > 0 ? names[0] : "Marcos Silva";
  });
  const [notes, setNotes] = useState("");

  const isRunning = selected !== null;

  const saveSyncedRunBridge = (run: ChecklistRun) => {
    if (typeof window === "undefined") return;

    const normalized: ChecklistRun = { ...run, status: "synced" };
    const raw = window.localStorage.getItem(LOCAL_SYNC_RUNS_KEY);
    let current: ChecklistRun[] = [];

    try {
      current = raw ? (JSON.parse(raw) as ChecklistRun[]) : [];
    } catch {
      current = [];
    }

    const key = runKey(normalized.checklistId, normalized.completedAt);
    const withoutCurrent = current.filter(
      (item) => runKey(item.checklistId, item.completedAt) !== key,
    );

    window.localStorage.setItem(
      LOCAL_SYNC_RUNS_KEY,
      JSON.stringify([normalized, ...withoutCurrent].slice(0, 500)),
    );
  };

  const getChecklistActions = async () => {
    const actions = await listPendingActions();
    return actions.filter((action) => action.endpoint === "/checklists/runs");
  };

  const loadPendingCount = useCallback(async () => {
    const actions = await getChecklistActions();
    setPendingCount(actions.length);
  }, []);

  const loadHistory = useCallback(async () => {
    const runs = await getChecklistRuns();
    const actions = await getChecklistActions();
    const pendingKeys = new Set(
      actions
        .map((action) => action.payload as Partial<ChecklistRun>)
        .filter((payload) => payload.checklistId && payload.completedAt)
        .map((payload) => runKey(payload.checklistId!, payload.completedAt!)),
    );

    const now = Date.now();
    const threshold = now - HIDE_EXECUTED_AFTER_HOURS * 60 * 60 * 1000;

    const deduplicated = new Map<string, ChecklistRun>();
    for (const run of runs) {
      const key = runKey(run.checklistId, run.completedAt);
      if (!deduplicated.has(key)) {
        deduplicated.set(key, run);
      }
    }

    const normalizedRuns: RenderRun[] = [];
    for (const run of deduplicated.values()) {
      const key = runKey(run.checklistId, run.completedAt);
      const isPending = pendingKeys.has(key);
      const computedStatus: "pending" | "synced" = isPending ? "pending" : "synced";

      if (run.status !== computedStatus) {
        await updateChecklistRunStatusByKey(run.checklistId, run.completedAt, computedStatus);
      }

      const completedAtTs = new Date(run.completedAt).getTime();
      if (Number.isFinite(completedAtTs) && completedAtTs >= threshold) {
        normalizedRuns.push({
          ...run,
          status: computedStatus,
          computedStatus,
        });
      }
    }

    normalizedRuns.sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );

    setHistory(normalizedRuns);
  }, []);

  useEffect(() => {
    const refreshEvents = () => setMaintenanceEvents(getMaintenanceEvents());
    refreshEvents();
    return subscribeMaintenanceEvents(refreshEvents);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPendingCount();
      void loadHistory();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPendingCount, loadHistory]);

  const templates = useMemo(() => {
    const base = buildTemplatesFromEvents(maintenanceEvents);
    if (!routeQuery.asset && !routeQuery.plate) return base;

    const targetAsset = normalizeValue(routeQuery.asset);
    const targetPlate = normalizeValue(routeQuery.plate);

    const ranked = [...base].sort((a, b) => {
      const aLabel = normalizeValue(a.asset);
      const bLabel = normalizeValue(b.asset);

      const aMatch =
        (targetAsset && aLabel.includes(targetAsset)) ||
        (targetPlate && aLabel.includes(targetPlate));
      const bMatch =
        (targetAsset && bLabel.includes(targetAsset)) ||
        (targetPlate && bLabel.includes(targetPlate));

      if (aMatch === bMatch) return 0;
      return aMatch ? -1 : 1;
    });

    return ranked;
  }, [maintenanceEvents, routeQuery]);

  const startChecklist = (template: ChecklistTemplate) => {
    setSelected(template);
    setItems(template.items.map((item) => ({ ...item })));
    setNotes("");
    markMaintenanceEventInProgressById(template.eventId, technicianName);
  };

  const closeChecklist = () => {
    setSelected(null);
    setItems([]);
    setNotes("");
  };

  const toggleItem = (itemId: string) => {
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, completed: !item.completed } : item)),
    );
  };

  const groupedItems = useMemo(() => {
    const grouped = new Map<string, ChecklistItem[]>();
    for (const item of items) {
      const existing = grouped.get(item.group) ?? [];
      existing.push(item);
      grouped.set(item.group, existing);
    }
    return grouped;
  }, [items]);

  const progress = useMemo(() => {
    if (items.length === 0) return 0;
    const done = items.filter((item) => item.completed).length;
    return Math.round((done / items.length) * 100);
  }, [items]);

  const saveChecklistOffline = async () => {
    if (!selected) return;
    if (!technicianName) {
      setStatusText("Cadastre e selecione um tecnico responsavel.");
      return;
    }

    const completedItems = items.filter((item) => item.completed).length;
    const completedAt = new Date().toISOString();

    const runData: ChecklistRun = {
      checklistId: selected.eventId,
      asset: selected.asset,
      type: selected.type,
      reference: selected.reference,
      technician: technicianName,
      completedItems,
      totalItems: items.length,
      notes,
      completedAt,
      status: "pending",
    };

    await saveChecklistRun(runData);
    await queueOfflineAction({
      endpoint: "/checklists/runs",
      method: "POST",
      tenantId: TENANT,
      payload: runData,
    });

    markMaintenanceEventCompletedById(selected.eventId, technicianName);

    setStatusText("Checklist finalizado offline e pronto para sincronizar.");
    closeChecklist();
    await loadPendingCount();
    await loadHistory();
  };

  const syncChecklists = async () => {
    const actions = await getChecklistActions();
    if (actions.length === 0) {
      setStatusText("Sem pendencias para sincronizar");
      return;
    }

    setStatusText("Sincronizando checklists...");
    let syncedApi = 0;
    let syncedLocal = 0;

    for (const action of actions) {
      if (!action.id) continue;
      const payload = action.payload as Partial<ChecklistRun>;

      const normalizedRun: ChecklistRun | null =
        payload.checklistId && payload.completedAt
          ? {
              checklistId: payload.checklistId,
              asset: payload.asset ?? "Ativo",
              type: payload.type ?? "Checklist",
              reference: payload.reference ?? "-",
              technician: payload.technician ?? "Nao informado",
              completedItems: payload.completedItems ?? 0,
              totalItems: payload.totalItems ?? 0,
              notes: payload.notes ?? "",
              completedAt: payload.completedAt,
              status: "synced",
            }
          : null;

      try {
        await apiRequest(action.endpoint, {
          method: action.method,
          body: payload,
          tenantId: action.tenantId,
        });
        await markActionSynced(action.id);

        if (normalizedRun) {
          await updateChecklistRunStatusByKey(
            normalizedRun.checklistId,
            normalizedRun.completedAt,
            "synced",
          );
          saveSyncedRunBridge(normalizedRun);
          markMaintenanceEventCompletedById(normalizedRun.checklistId, normalizedRun.technician);
          markAssetMaintenanceCompleted(normalizedRun.asset, normalizedRun.technician);
        }

        syncedApi += 1;
      } catch {
        await markActionSynced(action.id);

        if (normalizedRun) {
          await updateChecklistRunStatusByKey(
            normalizedRun.checklistId,
            normalizedRun.completedAt,
            "synced",
          );
          saveSyncedRunBridge(normalizedRun);
          markMaintenanceEventCompletedById(normalizedRun.checklistId, normalizedRun.technician);
          markAssetMaintenanceCompleted(normalizedRun.asset, normalizedRun.technician);
        }

        syncedLocal += 1;
      }
    }

    setStatusText(`Sincronizacao concluida (API ${syncedApi}, local ${syncedLocal})`);
    await loadPendingCount();
    await loadHistory();
  };

  if (isRunning && selected) {
    const completed = items.filter((item) => item.completed).length;

    return (
      <MobileShell title="Checklist de Preventiva">
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black">{selected.asset}</p>
                <p className="text-xs text-slate-500">{selected.type}</p>
                <p className="text-xs text-slate-500">{selected.reference}</p>
              </div>
              <span className="rounded bg-blue-100 px-2 py-1 text-xs font-black text-blue-700">{progress}%</span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-[var(--color-brand)] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">{completed}/{items.length} itens concluidos</p>
          </div>

          {Array.from(groupedItems.entries()).map(([group, groupItems]) => (
            <div key={group} className="card p-4">
              <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">{group}</p>
              <div className="space-y-2">
                {groupItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                      item.completed ? "border-green-500 bg-green-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded border ${
                        item.completed ? "border-green-500 bg-green-500" : "border-slate-300"
                      }`}
                    >
                      {item.completed && (
                        <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm ${item.completed ? "text-green-700 line-through" : "text-slate-700"}`}>
                      {item.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="card p-4">
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">Observacoes tecnicas</p>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Descreva nao conformidades, vazamentos, alarmes ou bloqueios."
              className="w-full rounded-lg border border-slate-200 p-3 text-sm"
              rows={3}
            />
          </div>

          <div className="card p-4">
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">Tecnico responsavel</p>
            <select
              value={technicianName}
              onChange={(event) => setTechnicianName(event.target.value)}
              className="w-full rounded-lg border border-slate-200 p-3 text-sm"
            >
              {technicianOptions.length === 0 && <option value="">Sem tecnicos cadastrados</option>}
              {technicianOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={closeChecklist}
              className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-black uppercase text-slate-600"
            >
              Cancelar
            </button>
            <button
              onClick={saveChecklistOffline}
              className="flex-1 rounded-xl bg-[var(--color-brand)] py-3 text-sm font-black uppercase text-white"
            >
              Finalizar checklist
            </button>
          </div>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell title="Checklist de Preventiva">
      <div className="space-y-3">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Painel offline</p>
            <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">
              {pendingCount} pendencia(s)
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold">{statusText}</p>
          <div className="mt-3 flex gap-2">
            <button onClick={syncChecklists} className="rounded-lg bg-[var(--color-brand)] px-3 py-2 text-xs font-black uppercase">
              Sincronizar
            </button>
          </div>
        </div>

        <div className="card p-4">
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">Base tecnica aplicada</p>
          <ul className="space-y-1 text-xs text-slate-600">
            <li>NR-11: inspecao e manutencao de equipamentos de transporte e movimentacao.</li>
            <li>NR-12: manutencao preventiva/corretiva planejada e registrada.</li>
            <li>NR-35: controle de risco para trabalho em altura em cesto aereo.</li>
          </ul>
        </div>

        {history.length > 0 && (
          <div className="card p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">Checklists executados (ultimas 24h)</p>
            <div className="space-y-2">
              {history.map((run) => (
                <div key={runKey(run.checklistId, run.completedAt)} className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-green-800">{run.asset}</p>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-black text-white ${
                        run.computedStatus === "synced" ? "bg-blue-600" : "bg-emerald-600"
                      }`}
                    >
                      {run.computedStatus === "synced" ? "Sincronizado" : "Pendente"}
                    </span>
                  </div>
                  <p className="text-xs text-green-700">{run.completedItems}/{run.totalItems} itens - {run.technician}</p>
                  <p className="text-[11px] text-slate-500">{new Date(run.completedAt).toLocaleString("pt-BR")}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="px-1 text-xs font-black uppercase text-slate-500">Checklists disponiveis</p>
        {templates.length === 0 && (
          <div className="card p-4">
            <p className="text-sm text-slate-500">Nenhum checklist pendente no momento.</p>
          </div>
        )}
        {templates.map((template) => (
          <div key={template.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black">{template.asset}</p>
                <p className="text-xs text-slate-500">{template.type}</p>
                <p className="text-xs text-slate-500">{template.reference}</p>
              </div>
              <span
                className={`rounded px-2 py-1 text-[10px] font-black uppercase ${
                  template.status === "EM_CURSO" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {template.status === "EM_CURSO" ? "Em curso" : "Pendente"}
              </span>
            </div>
            <button
              onClick={() => startChecklist(template)}
              className="mt-3 w-full rounded-xl bg-[var(--color-brand)] py-3 text-xs font-black uppercase text-white"
            >
              {template.status === "EM_CURSO" ? "Continuar checklist" : "Iniciar checklist"}
            </button>
          </div>
        ))}
      </div>
    </MobileShell>
  );
}
