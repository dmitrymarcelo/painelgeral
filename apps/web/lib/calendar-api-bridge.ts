import { apiRequest } from "@/lib/api-client";
import type { MaintenanceEvent, MaintenanceStatus, MaintenanceType } from "@/lib/maintenance-store";

/**
 * RESPONSABILIDADE:
 * Ponte de integracao entre o modelo local de calendario (`MaintenanceEvent`) e a API NestJS.
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - Permite migrar o calendario do `localStorage` para backend sem reescrever a UI de uma vez.
 * - Centraliza mapeamento de enums/status e datas.
 *
 * CONTRATO BACKEND:
 * - Consome `/calendar/events`
 * - Espera enums Prisma: `PREVENTIVA|CORRETIVA|VISTORIA` e
 *   `PROGRAMADA|EM_EXECUCAO|CONCLUIDA|CANCELADA`
 */

export type ApiCalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  type: "PREVENTIVA" | "CORRETIVA" | "VISTORIA";
  status: "PROGRAMADA" | "EM_EXECUCAO" | "CONCLUIDA" | "CANCELADA";
  startAt: string;
  endAt?: string | null;
  assetId?: string | null;
  workOrderId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ApiContext = { token: string; tenantId: string };

const localTypeToApi = (_type: MaintenanceType): ApiCalendarEvent["type"] => "PREVENTIVA";

const localStatusToApi = (status: MaintenanceStatus): ApiCalendarEvent["status"] => {
  if (status === "in_progress") return "EM_EXECUCAO";
  if (status === "completed") return "CONCLUIDA";
  // `tolerance` e `no_show` ainda nao existem no enum do backend: degradamos para `PROGRAMADA`.
  return "PROGRAMADA";
};

const apiStatusToLocal = (status: ApiCalendarEvent["status"]): MaintenanceStatus => {
  if (status === "EM_EXECUCAO") return "in_progress";
  if (status === "CONCLUIDA") return "completed";
  return "scheduled";
};

const parseDateToLocalParts = (iso: string) => {
  const date = new Date(iso);
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  };
};

export const buildApiCalendarEventFromLocal = (event: MaintenanceEvent, assetId?: string) => {
  const [hour, minute] = event.time.split(":").map(Number);
  const startAt = new Date(event.year, event.month, event.day, hour || 0, minute || 0, 0, 0).toISOString();

  return {
    title: event.title || "Manutencao Preventiva",
    // CONTRATO BACKEND: enquanto `assetLabel` nao existir na entidade, serializamos no texto.
    description: `[ASSET_LABEL] ${event.asset}\n${event.description ?? ""}`.trim(),
    type: localTypeToApi(event.type),
    status: localStatusToApi(event.status),
    startAt,
    assetId,
  };
};

export const mapApiCalendarEventToLocal = (event: ApiCalendarEvent): MaintenanceEvent => {
  const { year, month, day, time } = parseDateToLocalParts(event.startAt);
  const description = event.description ?? "";
  const assetFromDescription = description.match(/^\[ASSET_LABEL\]\s*(.+)$/m)?.[1]?.trim();

  return {
    id: event.id,
    year,
    month,
    day,
    time,
    type: "preventive",
    title: event.title,
    asset: assetFromDescription || "Ativo (API)",
    description: description.replace(/^\[ASSET_LABEL\].*$/m, "").trim(),
    technician: "Definido via API",
    status: apiStatusToLocal(event.status),
    completedAt: event.status === "CONCLUIDA" ? event.updatedAt ?? null : null,
    schedulerName: null,
    schedulerMatricula: null,
    currentMaintenanceKm: null,
  };
};

export async function fetchCalendarEventsFromApi(
  ctx: ApiContext,
  range: { from: string; to: string },
): Promise<MaintenanceEvent[]> {
  const params = new URLSearchParams({
    from: range.from,
    to: range.to,
    type: "PREVENTIVA",
  });
  const events = await apiRequest<ApiCalendarEvent[]>(`/calendar/events?${params.toString()}`, {
    method: "GET",
    tenantId: ctx.tenantId,
    token: ctx.token,
  });
  return events.map(mapApiCalendarEventToLocal);
}

