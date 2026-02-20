"use client";

export type TechnicianRecord = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
};

const STORAGE_KEY = "frota-pro.technicians";

const defaultTechnicians: TechnicianRecord[] = [
  { id: "tec-1", name: "Carlos Mecanico", active: true, createdAt: new Date().toISOString() },
  { id: "tec-2", name: "Ricardo Eletro", active: true, createdAt: new Date().toISOString() },
  { id: "tec-3", name: "Marcos Silva", active: true, createdAt: new Date().toISOString() },
];

const sortByName = (items: TechnicianRecord[]) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

export function getTechnicians(): TechnicianRecord[] {
  if (typeof window === "undefined") return sortByName(defaultTechnicians);
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultTechnicians));
    return sortByName(defaultTechnicians);
  }

  try {
    const parsed = JSON.parse(raw) as TechnicianRecord[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultTechnicians));
      return sortByName(defaultTechnicians);
    }
    return sortByName(parsed);
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultTechnicians));
    return sortByName(defaultTechnicians);
  }
}

export function saveTechnicians(records: TechnicianRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sortByName(records)));
}

export function getActiveTechnicianNames(): string[] {
  return getTechnicians()
    .filter((item) => item.active)
    .map((item) => item.name);
}
