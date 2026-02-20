"use client";

export type SchedulingResponsibleRecord = {
  id: string;
  matricula: string;
  name: string;
  active: boolean;
  createdAt: string;
};

export type SchedulingResponsibleSession = {
  matricula: string;
  name: string;
  selectedAt: string;
};

const STORAGE_KEY = "frota-pro.scheduling-responsibles";
const SESSION_KEY = "frota-pro.scheduling-responsible.session";
const CHANGED_EVENT = "frota-pro:scheduling-responsibles:changed";

const defaultResponsibles: SchedulingResponsibleRecord[] = [
  {
    id: "resp-1",
    matricula: "1001",
    name: "Ana Paula",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "resp-2",
    matricula: "1002",
    name: "Joao Santos",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "resp-3",
    matricula: "1003",
    name: "Ricardo Almeida",
    active: true,
    createdAt: new Date().toISOString(),
  },
];

const sortByName = (records: SchedulingResponsibleRecord[]) =>
  [...records].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

const emitChanged = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGED_EVENT));
};

export function getSchedulingResponsibles(): SchedulingResponsibleRecord[] {
  if (typeof window === "undefined") return sortByName(defaultResponsibles);

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultResponsibles));
    return sortByName(defaultResponsibles);
  }

  try {
    const parsed = JSON.parse(raw) as SchedulingResponsibleRecord[];
    if (!Array.isArray(parsed)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultResponsibles));
      return sortByName(defaultResponsibles);
    }
    return sortByName(parsed);
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultResponsibles));
    return sortByName(defaultResponsibles);
  }
}

export function saveSchedulingResponsibles(records: SchedulingResponsibleRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sortByName(records)));
  emitChanged();
}

export function getActiveSchedulingResponsibles(): SchedulingResponsibleRecord[] {
  return getSchedulingResponsibles().filter((record) => record.active);
}

export function findSchedulingResponsibleByMatricula(matricula: string) {
  const normalized = matricula.replace(/\D/g, "");
  return getActiveSchedulingResponsibles().find((record) => record.matricula === normalized) || null;
}

export function getSchedulingResponsibleSession(): SchedulingResponsibleSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SchedulingResponsibleSession;
    if (!parsed?.matricula || !parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSchedulingResponsibleSession(session: SchedulingResponsibleSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  emitChanged();
}

export function clearSchedulingResponsibleSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  emitChanged();
}

export function subscribeSchedulingResponsibles(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === SESSION_KEY) {
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
