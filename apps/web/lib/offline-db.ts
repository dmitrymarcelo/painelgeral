import Dexie, { Table } from "dexie";

/**
 * RESPONSABILIDADE:
 * Banco local (IndexedDB/Dexie) para fila offline e registros de checklist executados.
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - Telas operacionais salvam localmente quando a API/Internet nao estao disponiveis.
 * - Um sincronizador futuro deve consumir `queue` e enviar os payloads pendentes.
 *
 * CONTRATO BACKEND: `queue.payload` deve respeitar o DTO do endpoint informado em `endpoint`.
 * O backend deve suportar reprocessamento idempotente para evitar duplicidade em retries.
 */

export type OfflineActionStatus = "pending" | "synced" | "failed";

export type OfflineAction = {
  id?: number;
  endpoint: string;
  method: "POST" | "PATCH";
  payload: unknown;
  tenantId: string;
  createdAt: string;
  status: OfflineActionStatus;
  retries: number;
};

// Tipos para Checklist Runs
export type ChecklistRunStatus = "pending" | "synced" | "failed";

export type ChecklistRun = {
  id?: number;
  checklistId: string;
  asset: string;
  type: string;
  reference: string;
  technician: string;
  completedItems: number;
  totalItems: number;
  notes: string;
  completedAt: string;
  status: ChecklistRunStatus;
};

class OfflineStore extends Dexie {
  queue!: Table<OfflineAction, number>;
  checklistRuns!: Table<ChecklistRun, number>;

  constructor() {
    super("frota-pro-offline");
    // Versionamento Dexie: manter historico de schemas evita quebrar IndexedDB local.
    this.version(1).stores({
      queue: "++id, status, createdAt, endpoint",
    });
    this.version(2).stores({
      queue: "++id, status, createdAt, endpoint",
      checklistRuns: "++id, status, completedAt, checklistId, asset",
    });
  }
}

export const offlineStore = new OfflineStore();

export async function queueOfflineAction(action: Omit<OfflineAction, "id" | "createdAt" | "status" | "retries">) {
  // Toda acao offline entra como pending para sincronizacao posterior.
  // CONTRATO BACKEND: recomendado incluir `clientRequestId` no payload em integrações reais.
  return offlineStore.queue.add({
    ...action,
    createdAt: new Date().toISOString(),
    status: "pending",
    retries: 0,
  });
}

export async function listPendingActions() {
  return offlineStore.queue.where("status").equals("pending").toArray();
}

export async function markActionSynced(id: number) {
  await offlineStore.queue.update(id, { status: "synced" });
}

export async function markActionFailed(id: number) {
  const current = await offlineStore.queue.get(id);
  if (!current) return;
  await offlineStore.queue.update(id, {
    status: "failed",
    retries: current.retries + 1,
  });
}

// Funções para Checklist Runs
export async function saveChecklistRun(run: Omit<ChecklistRun, "id">) {
  // CONTRATO BACKEND: corresponde conceitualmente a `POST /checklists/runs`.
  return offlineStore.checklistRuns.add({
    ...run,
    status: "pending",
  });
}

export async function getChecklistRuns() {
  return offlineStore.checklistRuns.orderBy("completedAt").reverse().toArray();
}

export async function getChecklistRunById(id: number) {
  return offlineStore.checklistRuns.get(id);
}

export async function updateChecklistRunStatus(id: number, status: ChecklistRunStatus) {
  await offlineStore.checklistRuns.update(id, { status });
}

export async function updateChecklistRunStatusByKey(
  checklistId: string,
  completedAt: string,
  status: ChecklistRunStatus,
) {
  // Atualiza por chave funcional (checklistId + completedAt) para deduplicar execucoes.
  // Regra de negocio: o mesmo checklist pode rodar varias vezes; `completedAt` diferencia execucoes.
  await offlineStore.checklistRuns
    .where("checklistId")
    .equals(checklistId)
    .and((run) => run.completedAt === completedAt)
    .modify({ status });
}
