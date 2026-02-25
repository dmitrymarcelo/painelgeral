"use client";

export type MaintenanceType = "preventive";
export type MaintenanceStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "no_show"
  | "tolerance";

export type MaintenanceEvent = {
  id: string;
  day: number;
  month: number;
  year: number;
  type: MaintenanceType;
  title: string;
  asset: string;
  time: string;
  description: string;
  technician: string;
  schedulerName?: string | null;
  schedulerMatricula?: string | null;
  status: MaintenanceStatus;
  completedAt?: string | null;
  currentMaintenanceKm?: number | null;
};

export type MaintenanceOperationalStatus =
  | "CONFORME"
  | "ATENCAO"
  | "A_VENCER"
  | "VENCIDA";

const STORAGE_KEY = "frota-pro.maintenance-events";
const CHANGED_EVENT = "frota-pro:maintenance-events:changed";

const toEventDateParts = (date: Date) => ({
  day: date.getDate(),
  month: date.getMonth(),
  year: date.getFullYear(),
});

const withDaysOffset = (base: Date, days: number) => {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
};

const compareEvents = (a: MaintenanceEvent, b: MaintenanceEvent) => {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  if (a.day !== b.day) return a.day - b.day;
  return a.time.localeCompare(b.time);
};

const getEventDateTime = (event: MaintenanceEvent) => {
  const [hour, minute] = event.time.split(":").map(Number);
  return new Date(event.year, event.month, event.day, hour, minute, 0, 0);
};

export function getEffectiveMaintenanceStatus(
  event: MaintenanceEvent,
  now: Date = new Date(),
): MaintenanceStatus {
  if (event.status !== "scheduled") return event.status;

  const scheduledAt = getEventDateTime(event);
  const sameDay =
    scheduledAt.getFullYear() === now.getFullYear() &&
    scheduledAt.getMonth() === now.getMonth() &&
    scheduledAt.getDate() === now.getDate();

  if (!sameDay) return event.status;

  const diffMs = now.getTime() - scheduledAt.getTime();
  if (diffMs < 0) return "scheduled";
  if (diffMs <= 15 * 60 * 1000) return "tolerance";
  return "no_show";
}

const sortEvents = (events: MaintenanceEvent[]) => [...events].sort(compareEvents);

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const isMaintenanceEventArray = (value: unknown): value is MaintenanceEvent[] => {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as MaintenanceEvent).id === "string" &&
        typeof (item as MaintenanceEvent).asset === "string" &&
        typeof (item as MaintenanceEvent).time === "string",
    )
  );
};

const buildDefaultEvents = (): MaintenanceEvent[] => {
  // Seeds locais para a UI funcionar mesmo sem API/banco.
  const now = new Date();
  const yesterday = withDaysOffset(now, -1);
  const today = withDaysOffset(now, 0);
  const tomorrow = withDaysOffset(now, 1);
  const afterTomorrow = withDaysOffset(now, 2);

  return [
    {
      id: "seed-1",
      ...toEventDateParts(yesterday),
      type: "preventive",
      title: "Troca de Oleo",
      asset: "Toyota Hilux SRX - ABC-1234",
      time: "09:00",
      description: "Troca de oleo e filtros",
      technician: "Marcos Silva",
      schedulerName: "Ana Paula",
      schedulerMatricula: "1001",
      status: "completed",
      completedAt: new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate(),
        8,
        50,
      ).toISOString(),
    },
    {
      id: "seed-2",
      ...toEventDateParts(today),
      type: "preventive",
      title: "Revisao de Freios",
      asset: "Volvo FH 540 - XYZ-9876",
      time: "10:30",
      description: "Revisao do sistema de freio",
      technician: "Definido no checklist",
      schedulerName: "Joao Santos",
      schedulerMatricula: "1002",
      status: "in_progress",
      completedAt: null,
    },
    {
      id: "seed-3",
      ...toEventDateParts(tomorrow),
      type: "preventive",
      title: "Preventiva de Moto",
      asset: "Honda CB 500X - MOT-2024",
      time: "13:00",
      description: "Checklist preventivo de motocicleta",
      technician: "Definido no checklist",
      schedulerName: "Ricardo Almeida",
      schedulerMatricula: "1003",
      status: "scheduled",
      completedAt: null,
    },
    {
      id: "seed-4",
      ...toEventDateParts(afterTomorrow),
      type: "preventive",
      title: "Preventiva de Lancha",
      asset: "Sea Ray 250 - MAR-005",
      time: "14:30",
      description: "Checklist preventivo nautico",
      technician: "Definido no checklist",
      schedulerName: "Ana Paula",
      schedulerMatricula: "1001",
      status: "scheduled",
      completedAt: null,
    },
  ];
};

function emitChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

const readEvents = (): MaintenanceEvent[] => {
  // Este store e frontend-only: persiste em localStorage e reidrata com fallback.
  if (typeof window === "undefined") {
    return sortEvents(buildDefaultEvents());
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const defaults = sortEvents(buildDefaultEvents());
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!isMaintenanceEventArray(parsed)) {
      const defaults = sortEvents(buildDefaultEvents());
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    return sortEvents(parsed);
  } catch {
    const defaults = sortEvents(buildDefaultEvents());
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }
};

const writeEvents = (events: MaintenanceEvent[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sortEvents(events)));
  emitChanged();
};

const mutateEvents = (updater: (events: MaintenanceEvent[]) => MaintenanceEvent[]) => {
  // Centraliza escrita para manter ordenacao e disparar notificacao de mudanca.
  const current = readEvents();
  const next = updater(current);
  writeEvents(next);
  return next;
};

export function getMaintenanceEvents(): MaintenanceEvent[] {
  return readEvents();
}

export function saveMaintenanceEvents(events: MaintenanceEvent[]) {
  writeEvents(events);
}

export function subscribeMaintenanceEvents(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;

  // Escuta tanto mudancas de outra aba (storage) quanto da aba atual (evento custom).
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      onChange();
    }
  };

  const onCustom = () => onChange();

  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGED_EVENT, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGED_EVENT, onCustom);
  };
}

export function getMaintenanceDueDate(event: MaintenanceEvent) {
  const [hour, minute] = event.time.split(":").map((value) => Number(value));
  return new Date(event.year, event.month, event.day, hour || 0, minute || 0, 0, 0);
}

export function getMaintenanceDayStart(event: MaintenanceEvent) {
  return new Date(event.year, event.month, event.day, 0, 0, 0, 0);
}

export function isPastMaintenanceDay(event: MaintenanceEvent, baseDate = new Date()) {
  const base = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0, 0);
  return getMaintenanceDayStart(event).getTime() < base.getTime();
}

export function getMaintenanceOperationalStatus(
  event: MaintenanceEvent,
  baseDate = new Date(),
): MaintenanceOperationalStatus {
  const now = baseDate.getTime();
  const due = getMaintenanceDueDate(event).getTime();

  if (event.status === "completed") {
    if (!event.completedAt) return "CONFORME";
    return new Date(event.completedAt).getTime() <= due ? "CONFORME" : "ATENCAO";
  }

  if (event.status === "in_progress") return "ATENCAO";

  if (due < now) return "VENCIDA";

  const twoDays = 48 * 60 * 60 * 1000;
  if (due - now <= twoDays) return "A_VENCER";

  return "CONFORME";
}

export function updateMaintenanceEventById(
  eventId: string,
  patch: Partial<MaintenanceEvent>,
) {
  mutateEvents((events) =>
    events.map((event) => (event.id === eventId ? { ...event, ...patch } : event)),
  );
}

export function markMaintenanceEventInProgressById(eventId: string, technician?: string) {
  updateMaintenanceEventById(eventId, {
    status: "in_progress",
    technician: technician || "Definido no checklist",
    completedAt: null,
  });
}

export function markMaintenanceEventCompletedById(eventId: string, technician?: string) {
  updateMaintenanceEventById(eventId, {
    status: "completed",
    technician: technician || "Definido no checklist",
    completedAt: new Date().toISOString(),
  });
}

export function markAssetMaintenanceCompleted(assetLike: string, technician?: string) {
  const needle = normalizeText(assetLike);
  mutateEvents((events) => {
    const index = events.findIndex((event) => {
      if (event.status === "completed") return false;
      const hay = normalizeText(event.asset);
      return hay.includes(needle) || needle.includes(hay);
    });

    if (index < 0) return events;

    const next = [...events];
    next[index] = {
      ...next[index],
      status: "completed",
      technician: technician || next[index].technician,
      completedAt: new Date().toISOString(),
    };
    return next;
  });
}

export function markAssetMaintenanceInProgress(assetLike: string, technician?: string) {
  const needle = normalizeText(assetLike);
  mutateEvents((events) => {
    const index = events.findIndex((event) => {
      if (event.status === "completed") return false;
      const hay = normalizeText(event.asset);
      return hay.includes(needle) || needle.includes(hay);
    });

    if (index < 0) return events;

    const next = [...events];
    next[index] = {
      ...next[index],
      status: "in_progress",
      technician: technician || next[index].technician,
      completedAt: null,
    };
    return next;
  });
}
