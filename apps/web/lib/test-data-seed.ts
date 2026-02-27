"use client";

/**
 * RESPONSABILIDADE:
 * Utilitario de reset e popular dados locais de demonstracao/teste (localStorage) para
 * validar fluxos nas telas Web/App sem backend completo.
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - Alimenta stores locais de calendario/OS, usuarios, responsaveis de agendamento e
 *   cadastro de planos preventivos.
 * - Pode ser acionado pela tela `Usuarios de Acesso` (somente Administrador).
 *
 * CONTRATO BACKEND: este arquivo nao substitui o backend. Ele apenas emula massa de dados
 * local para QA. As entidades refletidas aqui sugerem tabelas/colecoes:
 * `users`, `calendar_events`, `scheduling_responsibles`, `maintenance_plans`, `maintenance_plan_items`.
 */

import { saveMaintenanceEvents, type MaintenanceEvent } from "@/lib/maintenance-store";
import {
  saveSchedulingResponsibles,
  setSchedulingResponsibleSession,
  type SchedulingResponsibleRecord,
} from "@/lib/scheduling-responsible-store";

const AUTH_USERS_KEY = "frota-pro.auth-users";
const AUTH_SESSION_KEY = "frota-pro.auth-session";
const AUTH_MODE_KEY = "frota-pro.auth-mode";
const PREVENTIVE_LAST_KEY = "frota-pro.preventive-items-registration:last";
const PREVENTIVE_LIST_KEY = "frota-pro.preventive-items-registrations";
const SEED_MARKER_KEY = "frota-pro.test-seed.version";

const TEST_SEED_VERSION = "2026-02-27.v2";

const id = (prefix: string, n: number) => `${prefix}-${n.toString().padStart(3, "0")}`;

const assetCatalog = [
  "Toyota Hilux SRX - ABC-1234",
  "Volvo FH 540 - XYZ-9876",
  "Sea Ray 250 - MAR-005",
  "Honda CB 500X - MOT-2024",
  "Mercedes Sprinter - SPR-0X00",
  "Scania R450 - CAM-4520",
  "Fiat Toro Ranch - TOR-2244",
  "L200 Triton - L2O-8890",
  "Yamaha 250 - MTO-7788",
  "Lancha Azimut 60 - AZM-6060",
];

const technicians = [
  "Carlos Tecnico",
  "Marcos Silva",
  "Juliana Lima",
  "Paulo Mendes",
  "Bianca Costa",
];

const schedulers = [
  { matricula: "1001", name: "Ana Paula" },
  { matricula: "1002", name: "Joao Santos" },
  { matricula: "1003", name: "Ricardo Almeida" },
  { matricula: "1004", name: "Fernanda Souza" },
  { matricula: "1005", name: "Caio Barbosa" },
];

const timeSlots = ["07:30", "09:00", "10:30", "13:00", "14:30", "16:00"];
const priorities: Array<NonNullable<MaintenanceEvent["priority"]>> = ["Alta", "Media", "Baixa"];

const eventDateParts = (date: Date) => ({
  day: date.getDate(),
  month: date.getMonth(),
  year: date.getFullYear(),
});

const addDays = (base: Date, days: number) => {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
};

const buildSeedMaintenanceEvents = (): MaintenanceEvent[] => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const events: MaintenanceEvent[] = [];
  let counter = 1;

  // Regra de negocio: massa precisa cobrir estados, passado/presente/futuro e volume
  // suficiente para estressar dashboard, calendario, filtros, ativos e ordens.
  for (let offset = -30; offset <= 45; offset += 1) {
    const date = addDays(now, offset);
    const itemsPerDay = offset % 5 === 0 ? 4 : offset % 2 === 0 ? 3 : 2;
    for (let i = 0; i < itemsPerDay; i += 1) {
      const asset = assetCatalog[(counter + i) % assetCatalog.length];
      const scheduler = schedulers[(counter + i) % schedulers.length];
      const slot = timeSlots[(counter + i) % timeSlots.length];
      const priority = priorities[(counter + i) % priorities.length];

      // Regra de negocio: distribuicao de status para exercitar toda a matriz de telas.
      let status: MaintenanceEvent["status"] = "scheduled";
      if (offset <= -8) {
        status = (["completed", "completed", "in_progress", "no_show", "scheduled"][
          (counter + i) % 5
        ] ?? "scheduled") as MaintenanceEvent["status"];
      } else if (offset <= -1) {
        status = (["completed", "in_progress", "no_show", "scheduled"][
          (counter + i) % 4
        ] ?? "scheduled") as MaintenanceEvent["status"];
      } else if (offset === 0) {
        status = (["scheduled", "in_progress", "tolerance", "scheduled"][
          (counter + i) % 4
        ] ?? "scheduled") as MaintenanceEvent["status"];
      } else {
        status = (["scheduled", "scheduled", "in_progress"][
          (counter + i) % 3
        ] ?? "scheduled") as MaintenanceEvent["status"];
      }

      const isCompleted = status === "completed";
      const isInProgress = status === "in_progress";
      const plannedAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), ...slot.split(":").map(Number));
      const completedAt =
        isCompleted
          ? new Date(plannedAt.getTime() + (45 + ((counter % 4) * 25)) * 60 * 1000).toISOString()
          : null;
      const currentMaintenanceKm =
        isCompleted || isInProgress ? 85000 + counter * 123 + i * 17 : null;

      // Regra de negocio: anexa historico textual para testar render de auditoria no modal.
      const justificationSnippet =
        offset <= -1 && (counter + i) % 6 === 0
          ? `\n\n[JUSTIFICATIVA REAGENDAMENTO ${todayStart.toLocaleDateString("pt-BR")} 09:20:00]\n[REAGENDAMENTO] Mudanca operacional de patio.`
          : "";

      events.push({
        id: id("evt", counter),
        ...eventDateParts(date),
        type: "preventive",
        title: "Manutencao Preventiva",
        asset,
        time: slot,
        description:
          counter % 5 === 0
            ? `Preventiva programada com troca de filtros e verificacao de fluido. Prioridade operacional: ${priority}.${justificationSnippet}`
            : `Preventiva programada conforme plano e gatilhos de manutencao. Prioridade operacional: ${priority}.${justificationSnippet}`,
        technician: technicians[counter % technicians.length] ?? "Definido no checklist",
        schedulerName: scheduler.name,
        schedulerMatricula: scheduler.matricula,
        priority,
        status,
        completedAt,
        currentMaintenanceKm,
      });

      counter += 1;
    }
  }

  return events;
};

type SeedPreventiveItem = {
  id: string;
  partMaterial: string;
  triggerKmValue: string;
  triggerHourmeterValue: string;
  triggerTemporalMonthsValue: string;
  usefulLifeKm: string;
  usefulLifeHourmeter: string;
  usefulLifeTime: string;
  triggerApplied: boolean;
  triggerLinked: boolean;
  inheritsKmTrigger: boolean;
  inheritsHourmeterTrigger: boolean;
  inheritsTemporalTrigger: boolean;
};

type SeedPreventiveRegistration = {
  registrationId: string;
  createdAt: string;
  updatedAt: string;
  vehicleBindingContext: {
    vehicleModel: string;
    vehicleBrand: string;
    vehicleType: string;
    operationType: "Severo" | "Normal" | "Leve";
    centerCost: string;
  };
  form: {
    vehicleModel: string;
    vehicleBrand: string;
    vehicleType: string;
    operationType: "Severo" | "Normal" | "Leve";
    centerCost: string;
    vehicleDescription: string;
    vehicleBrandStep2: string;
    vehicleTypeStep2: string;
    vehicleFormula: string;
  };
  triggerConfig: {
    quilometragemKm: number;
    horimetroHrs: number;
    temporalMeses: number;
  };
  items: SeedPreventiveItem[];
};

const buildPreventiveRegistration = (
  n: number,
  model: string,
  brand: string,
  type: string,
  operationType: "Severo" | "Normal" | "Leve",
  centerCost: string,
): SeedPreventiveRegistration => {
  const createdAt = addDays(new Date(), -n * 2).toISOString();
  const updatedAt = addDays(new Date(), -n).toISOString();
  const triggerKm = operationType === "Severo" ? 12000 : operationType === "Leve" ? 25000 : 20000;
  const triggerHour = operationType === "Severo" ? 350 : operationType === "Leve" ? 700 : 500;
  const triggerMonths = operationType === "Severo" ? 4 : operationType === "Leve" ? 8 : 6;
  const baseItems = [
    "Filtro de Oleo Lubrificante",
    "Oleo Motor 15W40 Sintetico",
    "Filtro de Combustivel",
    "Filtro de Ar",
  ];

  const items: SeedPreventiveItem[] = baseItems.map((partMaterial, index) => ({
    id: `${n}-${index + 1}`,
    partMaterial,
    triggerKmValue: String(triggerKm),
    triggerHourmeterValue: String(triggerHour),
    triggerTemporalMonthsValue: String(triggerMonths),
    usefulLifeKm: String(triggerKm + index * 1000),
    usefulLifeHourmeter: String(triggerHour + index * 25),
    usefulLifeTime: `${triggerMonths + (index % 2)} meses`,
    triggerApplied: true,
    triggerLinked: true,
    inheritsKmTrigger: true,
    inheritsHourmeterTrigger: true,
    inheritsTemporalTrigger: true,
  }));

  const form = {
    vehicleModel: model,
    vehicleBrand: brand,
    vehicleType: type,
    operationType,
    centerCost,
    vehicleDescription: `${model} - plano preventivo padrao ${operationType.toLowerCase()}.`,
    vehicleBrandStep2: brand,
    vehicleTypeStep2: type,
    vehicleFormula: "KM + Horimetro + Tempo (o que vencer primeiro)",
  };

  return {
    registrationId: `plan-${n}`,
    createdAt,
    updatedAt,
    vehicleBindingContext: {
      vehicleModel: model,
      vehicleBrand: brand,
      vehicleType: type,
      operationType,
      centerCost,
    },
    form,
    triggerConfig: {
      quilometragemKm: triggerKm,
      horimetroHrs: triggerHour,
      temporalMeses: triggerMonths,
    },
    items,
  };
};

const buildSeedPreventiveRegistrations = (): SeedPreventiveRegistration[] => {
  return [
    buildPreventiveRegistration(1, "Hilux SRX", "Toyota", "Caminhonete", "Normal", "Operacoes Campo"),
    buildPreventiveRegistration(2, "FH 540", "Volvo", "Caminhao", "Severo", "Logistica Norte"),
    buildPreventiveRegistration(3, "CB 500X", "Honda", "Moto", "Leve", "Suporte Tecnico"),
    buildPreventiveRegistration(4, "Sprinter", "Mercedes", "Van", "Normal", "Transporte Pessoal"),
    buildPreventiveRegistration(5, "Azimut 60", "Azimut", "Embarcacao", "Severo", "Operacao Nautica"),
    buildPreventiveRegistration(6, "Scania R450", "Scania", "Caminhao", "Severo", "Logistica Sul"),
  ];
};

const buildSeedUsers = () => [
  { username: "admin", password: "admin123", name: "Administrador", role: "Administrador" },
  { username: "operacoes", password: "123456", name: "Equipe de Operacoes", role: "Operacoes" },
  { username: "gestor", password: "123456", name: "Gestor da Frota", role: "Gestor" },
  { username: "tecnico", password: "123456", name: "Tecnico de Oficina", role: "Tecnico" },
  { username: "analista", password: "123456", name: "Analista de Planejamento", role: "Gestor" },
];

const buildSeedResponsibles = (): SchedulingResponsibleRecord[] =>
  schedulers.map((scheduler, index) => ({
    id: `resp-${index + 1}`,
    matricula: scheduler.matricula,
    name: scheduler.name,
    active: true,
    createdAt: addDays(new Date(), -(index + 1)).toISOString(),
  }));

export function clearLocalDemoData() {
  if (typeof window === "undefined") return;

  // Regra de negocio: limpeza focada nas stores demo usadas pelo frontend atual.
  const keysToRemove = [
    AUTH_USERS_KEY,
    AUTH_SESSION_KEY,
    AUTH_MODE_KEY,
    PREVENTIVE_LAST_KEY,
    PREVENTIVE_LIST_KEY,
    SEED_MARKER_KEY,
    "frota-pro.maintenance-events",
    "frota-pro.scheduling-responsibles",
    "frota-pro.scheduling-responsible.session",
  ];

  for (const key of keysToRemove) {
    window.localStorage.removeItem(key);
  }
}

export function resetAndSeedLocalDemoData() {
  if (typeof window === "undefined") return { ok: false as const, message: "Ambiente sem navegador." };

  clearLocalDemoData();

  // CONTRATO BACKEND: em producao este seed deve ser substituido por fixtures/migrations no banco.
  const users = buildSeedUsers();
  window.localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
  window.localStorage.setItem(AUTH_MODE_KEY, "local");
  window.localStorage.setItem(
    AUTH_SESSION_KEY,
    JSON.stringify({
      authMode: "local",
      username: "admin",
      name: "Administrador",
      role: "Administrador",
      loginAt: new Date().toISOString(),
    }),
  );

  saveSchedulingResponsibles(buildSeedResponsibles());
  setSchedulingResponsibleSession({
    matricula: "1001",
    name: "Ana Paula",
    selectedAt: new Date().toISOString(),
  });

  const events = buildSeedMaintenanceEvents();
  saveMaintenanceEvents(events);

  const preventiveRegistrations = buildSeedPreventiveRegistrations();
  window.localStorage.setItem(PREVENTIVE_LIST_KEY, JSON.stringify(preventiveRegistrations));
  window.localStorage.setItem(PREVENTIVE_LAST_KEY, JSON.stringify(preventiveRegistrations[0]));
  window.localStorage.setItem(SEED_MARKER_KEY, TEST_SEED_VERSION);

  return {
    ok: true as const,
    message: `Base local resetada e populada (${events.length} agendamentos, ${preventiveRegistrations.length} planos, ${users.length} usuarios).`,
  };
}

export function getLocalDemoSeedInfo() {
  if (typeof window === "undefined") return null;
  return {
    version: window.localStorage.getItem(SEED_MARKER_KEY),
    hasSeed: Boolean(window.localStorage.getItem(SEED_MARKER_KEY)),
  };
}
