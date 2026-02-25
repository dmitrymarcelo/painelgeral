"use client";

/**
 * RESPONSABILIDADE:
 * Cadastro e gestao local de Planos de Manutencao Preventiva (identificacao do veiculo,
 * formula, itens/pecas e gatilhos por item), incluindo lista de cadastros salvos na mesma tela.
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - Alimenta a futura base de planos preventivos que sera usada por calendario, OS e gestao de preventivas.
 * - Hoje persiste em `localStorage` para validacao de UX e regras de negocio.
 *
 * CONTRATO BACKEND: o payload `PreventiveRegistrationPayload` representa um candidato direto
 * para DTO de `maintenance-plans` + `maintenance-rules` + itens de plano.
 */

import { useEffect, useMemo, useState } from "react";
import { WebShell } from "@/components/layout/web-shell";
import { translations } from "@/lib/i18n";

type PreventiveItemRow = {
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

type FormState = {
  vehicleModel: string;
  vehicleBrand: string;
  vehicleType: string;
  operationType: "Severo" | "Normal" | "Leve" | "";
  centerCost: string;
  vehicleDescription: string;
  vehicleBrandStep2: string;
  vehicleTypeStep2: string;
  vehicleFormula: string;
};

type PreventiveRegistrationPayload = {
  registrationId: string;
  createdAt: string;
  updatedAt?: string;
  vehicleBindingContext: {
    vehicleModel: string;
    vehicleBrand: string;
    vehicleType: string;
    operationType: FormState["operationType"];
    centerCost: string;
  };
  form: FormState;
  triggerConfig: {
    quilometragemKm: number;
    horimetroHrs: number;
    temporalMeses: number;
  };
  items: PreventiveItemRow[];
};
// CONTRATO BACKEND: este payload sugere as entidades:
// - maintenance_plan (cabecalho/contexto do veiculo)
// - maintenance_rule (gatilhos de referencia)
// - maintenance_plan_item (pecas/insumos + vidas uteis por gatilho)

const STORAGE_KEY = "frota-pro.preventive-items-registration:last";
const STORAGE_LIST_KEY = "frota-pro.preventive-items-registrations";
const DEFAULT_TRIGGER_KM = "20000";
const DEFAULT_TRIGGER_HOURMETER = "500";
const DEFAULT_TRIGGER_TEMPORAL_MONTHS = "6";

const emptyItem = (): PreventiveItemRow => ({
  id: crypto.randomUUID(),
  partMaterial: "",
  triggerKmValue: DEFAULT_TRIGGER_KM,
  triggerHourmeterValue: DEFAULT_TRIGGER_HOURMETER,
  triggerTemporalMonthsValue: DEFAULT_TRIGGER_TEMPORAL_MONTHS,
  usefulLifeKm: "",
  usefulLifeHourmeter: "",
  usefulLifeTime: "",
  triggerApplied: false,
  triggerLinked: true,
  inheritsKmTrigger: true,
  inheritsHourmeterTrigger: true,
  inheritsTemporalTrigger: true,
});

const emptyForm = (): FormState => ({
  vehicleModel: "",
  vehicleBrand: "",
  vehicleType: "",
  operationType: "",
  centerCost: "",
  vehicleDescription: "",
  vehicleBrandStep2: "",
  vehicleTypeStep2: "",
  vehicleFormula: "",
});

const isItemComplete = (item: PreventiveItemRow) =>
  Boolean(
    item.partMaterial.trim() &&
      item.usefulLifeKm.trim() &&
      item.usefulLifeHourmeter.trim() &&
      item.usefulLifeTime.trim(),
  );

const normalizeItem = (raw: Partial<PreventiveItemRow> | null | undefined): PreventiveItemRow => ({
  ...emptyItem(),
  ...(raw ?? {}),
  id: raw?.id || crypto.randomUUID(),
  partMaterial: raw?.partMaterial ?? "",
  triggerKmValue: raw?.triggerKmValue ?? "20000",
  triggerHourmeterValue: raw?.triggerHourmeterValue ?? "500",
  triggerTemporalMonthsValue: raw?.triggerTemporalMonthsValue ?? "6",
  usefulLifeKm: raw?.usefulLifeKm ?? "",
  usefulLifeHourmeter: raw?.usefulLifeHourmeter ?? "",
  usefulLifeTime: raw?.usefulLifeTime ?? "",
  triggerApplied: Boolean(raw?.triggerApplied),
  triggerLinked: raw?.triggerLinked ?? true,
  inheritsKmTrigger: raw?.inheritsKmTrigger ?? true,
  inheritsHourmeterTrigger: raw?.inheritsHourmeterTrigger ?? true,
  inheritsTemporalTrigger: raw?.inheritsTemporalTrigger ?? true,
});

const normalizeRegistration = (raw: unknown): PreventiveRegistrationPayload | null => {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const vehicleBindingContext =
    (source.vehicleBindingContext as Partial<PreventiveRegistrationPayload["vehicleBindingContext"]> | undefined) ??
    {};
  const triggerConfig =
    (source.triggerConfig as Partial<PreventiveRegistrationPayload["triggerConfig"]> | undefined) ?? {};
  const form = { ...emptyForm(), ...((source.form as Partial<FormState> | undefined) ?? {}) } as FormState;
  return {
    registrationId: String(source.registrationId || crypto.randomUUID()),
    createdAt: String(source.createdAt || new Date().toISOString()),
    updatedAt: source.updatedAt ? String(source.updatedAt) : undefined,
    vehicleBindingContext: {
      vehicleModel: String(vehicleBindingContext.vehicleModel ?? form.vehicleModel ?? ""),
      vehicleBrand: String(vehicleBindingContext.vehicleBrand ?? form.vehicleBrand ?? ""),
      vehicleType: String(vehicleBindingContext.vehicleType ?? form.vehicleType ?? ""),
      operationType:
        vehicleBindingContext.operationType === "Severo" ||
        vehicleBindingContext.operationType === "Normal" ||
        vehicleBindingContext.operationType === "Leve"
          ? vehicleBindingContext.operationType
          : (form.operationType ?? ""),
      centerCost: String(vehicleBindingContext.centerCost ?? form.centerCost ?? ""),
    },
    form,
    triggerConfig: {
      quilometragemKm: Number(triggerConfig.quilometragemKm) || 0,
      horimetroHrs: Number(triggerConfig.horimetroHrs) || 0,
      temporalMeses: Number(triggerConfig.temporalMeses) || 0,
    },
    items: Array.isArray(source.items)
      ? (source.items as unknown[]).map((item) => normalizeItem(item as Partial<PreventiveItemRow>))
      : [],
  };
};

export default function WebPreventiveItemsPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [savedMessage, setSavedMessage] = useState("");
  const [editingAppliedItemId, setEditingAppliedItemId] = useState<string | null>(null);
  const [editingRegistrationId, setEditingRegistrationId] = useState<string | null>(null);
  const [savedRegistrations, setSavedRegistrations] = useState<PreventiveRegistrationPayload[]>([]);
  const [registrationSearch, setRegistrationSearch] = useState("");
  const [registrationOperationFilter, setRegistrationOperationFilter] = useState<
    FormState["operationType"] | "all"
  >("all");
  const [registrationVehicleTypeFilter, setRegistrationVehicleTypeFilter] = useState<string>("all");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [items, setItems] = useState<PreventiveItemRow[]>([emptyItem()]);
  const [itemSearch, setItemSearch] = useState("");

  const canAdvanceToStep2 = useMemo(
    () =>
      Boolean(
        form.vehicleModel.trim() &&
          form.vehicleBrand.trim() &&
          form.vehicleType.trim() &&
          form.operationType &&
          form.centerCost.trim(),
      ),
    [form],
  );

  const canSave = useMemo(
    () =>
      Boolean(
        form.vehicleDescription.trim() &&
          form.vehicleBrandStep2.trim() &&
          form.vehicleTypeStep2.trim() &&
          form.vehicleFormula.trim() &&
          items.length > 0 &&
          items.every(isItemComplete),
      ),
    [form, items],
  );

  const filteredItems = useMemo(() => {
    const needle = itemSearch.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.partMaterial.toLowerCase().includes(needle));
  }, [items, itemSearch]);

  const averageUsefulLifeKm = useMemo(() => {
    const kmValues = items
      .map((item) => Number(item.usefulLifeKm))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (kmValues.length === 0) return 0;
    return Math.round(kmValues.reduce((sum, value) => sum + value, 0) / kmValues.length);
  }, [items]);

  const averageItemTriggerKm = useMemo(() => {
    const values = items
      .map((item) => Number(item.triggerKmValue))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }, [items]);

  const averageItemTriggerHourmeter = useMemo(() => {
    const values = items
      .map((item) => Number(item.triggerHourmeterValue))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }, [items]);

  const minimumItemTriggerTemporalMonths = useMemo(() => {
    const values = items
      .map((item) => Number(item.triggerTemporalMonthsValue))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (values.length === 0) return 0;
    return Math.min(...values);
  }, [items]);

  const estimatedInvestment = useMemo(() => {
    const base = items.length * 145;
    const opFactor = form.operationType === "Severo" ? 1.35 : form.operationType === "Leve" ? 0.9 : 1;
    return Math.round(base * opFactor);
  }, [items.length, form.operationType]);

  const suggestedTriggerHourmeter =
    form.operationType === "Severo" ? 350 : form.operationType === "Leve" ? 700 : 500;
  const suggestedTriggerTemporalMonths = useMemo(() => {
    const monthValues = items
      .map((item) => item.usefulLifeTime.toLowerCase())
      .map((text) => {
        const match = text.match(/(\d+)/);
        return match ? Number(match[1]) : null;
      })
      .filter((value): value is number => value != null && value > 0);
    return monthValues.length > 0 ? Math.min(...monthValues) : 6;
  }, [items]);

  const triggerReferenceSummary = useMemo(
    () => ({
      quilometragemKm: averageItemTriggerKm || Number(DEFAULT_TRIGGER_KM),
      horimetroHrs: averageItemTriggerHourmeter || suggestedTriggerHourmeter,
      temporalMeses: minimumItemTriggerTemporalMonths || suggestedTriggerTemporalMonths,
    }),
    [
      averageItemTriggerHourmeter,
      averageItemTriggerKm,
      minimumItemTriggerTemporalMonths,
      suggestedTriggerHourmeter,
      suggestedTriggerTemporalMonths,
    ],
  );

  const registrationsSummary = useMemo(() => {
    const uniqueGroups = new Set(
      savedRegistrations.map(
        (registration) =>
          `${registration.form.vehicleModel || "-"}::${registration.form.operationType || "-"}`,
      ),
    );
    const totalPieces = savedRegistrations.reduce(
      (sum, registration) => sum + (Array.isArray(registration.items) ? registration.items.length : 0),
      0,
    );
    const lastUpdated = savedRegistrations[0]?.updatedAt || savedRegistrations[0]?.createdAt || null;
    return {
      total: savedRegistrations.length,
      groups: uniqueGroups.size,
      totalPieces,
      lastUpdated,
    };
  }, [savedRegistrations]);

  const registrationFilterOptions = useMemo(() => {
    const operationTypes = Array.from(
      new Set(savedRegistrations.map((registration) => registration.form.operationType).filter(Boolean)),
    ) as FormState["operationType"][];
    const vehicleTypes = Array.from(
      new Set(savedRegistrations.map((registration) => registration.form.vehicleType).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));

    return { operationTypes, vehicleTypes };
  }, [savedRegistrations]);

  const filteredRegistrations = useMemo(() => {
    const needle = registrationSearch.trim().toLowerCase();

    return savedRegistrations.filter((registration) => {
      const matchesSearch =
        !needle ||
        [
          registration.form.vehicleModel,
          registration.form.vehicleBrand,
          registration.form.vehicleType,
          registration.form.centerCost,
          registration.form.vehicleFormula,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);

      const matchesOperation =
        registrationOperationFilter === "all" ||
        registration.form.operationType === registrationOperationFilter;

      const matchesVehicleType =
        registrationVehicleTypeFilter === "all" ||
        registration.form.vehicleType === registrationVehicleTypeFilter;

      return matchesSearch && matchesOperation && matchesVehicleType;
    });
  }, [
    savedRegistrations,
    registrationSearch,
    registrationOperationFilter,
    registrationVehicleTypeFilter,
  ]);

  useEffect(() => {
    // CONTRATO BACKEND: enquanto nao houver API, esta lista representa a "colecao de planos"
    // persistida localmente. `normalizeRegistration` garante retrocompatibilidade de payload.
    try {
      const raw = window.localStorage.getItem(STORAGE_LIST_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      const normalized = Array.isArray(parsed)
        ? parsed.map(normalizeRegistration).filter((value): value is PreventiveRegistrationPayload => Boolean(value))
        : [];
      setSavedRegistrations(normalized);
    } catch {
      setSavedRegistrations([]);
    }
  }, []);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setItems((current) => current.map((item) => ({ ...item, triggerApplied: false })));
    setSavedMessage("");
  };

  const updateItem = <K extends keyof PreventiveItemRow>(
    id: string,
    key: K,
    value: PreventiveItemRow[K],
  ) => {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const nextItem = { ...item, [key]: value } as PreventiveItemRow;
        if (!nextItem.triggerLinked) return nextItem;

        const isInheritanceKey =
          key === "inheritsKmTrigger" ||
          key === "inheritsHourmeterTrigger" ||
          key === "inheritsTemporalTrigger";
        const isTriggerValueKey =
          key === "triggerKmValue" ||
          key === "triggerHourmeterValue" ||
          key === "triggerTemporalMonthsValue";

        if (!isInheritanceKey && !isTriggerValueKey) return nextItem;
        if (isTriggerValueKey) {
          return {
            ...nextItem,
            triggerApplied: false,
          };
        }

        const expected = getExpectedValuesForItem(nextItem);
        return {
          ...nextItem,
          usefulLifeKm: expected.usefulLifeKm,
          usefulLifeTime: expected.usefulLifeTime,
          usefulLifeHourmeter: expected.usefulLifeHourmeter,
          triggerApplied: false,
        };
      }),
    );
    setSavedMessage("");
  };

  const updateItemLifecycleField = (
    id: string,
    key: "usefulLifeKm" | "usefulLifeHourmeter" | "usefulLifeTime",
    value: string,
  ) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]: value,
              // Regra de negocio:
              // Edicao manual descola a peca da heranca automatica para preservar ajuste fino.
              triggerApplied: false,
              triggerLinked: false,
            }
          : item,
      ),
    );
    setSavedMessage("");
  };

  const getExpectedValuesForItem = (item: PreventiveItemRow) => {
    const nextKm = item.inheritsKmTrigger ? item.triggerKmValue : item.usefulLifeKm;
    const nextHourmeter = item.inheritsHourmeterTrigger
      ? item.triggerHourmeterValue
      : item.usefulLifeHourmeter;
    const nextTime = item.inheritsTemporalTrigger
      ? `${item.triggerTemporalMonthsValue} meses`
      : item.usefulLifeTime;

    return {
      usefulLifeKm: nextKm,
      usefulLifeHourmeter: nextHourmeter,
      usefulLifeTime: nextTime,
    };
  };

  const isItemSyncedWithTrigger = (item: PreventiveItemRow) => {
    const expected = getExpectedValuesForItem(item);
    return (
      item.usefulLifeKm === expected.usefulLifeKm &&
      item.usefulLifeHourmeter === expected.usefulLifeHourmeter &&
      item.usefulLifeTime === expected.usefulLifeTime
    );
  };

  const applyTriggerToItem = (id: string) => {
    // Regra de negocio: "Aplicar gatilho" congela o snapshot atual dos gatilhos da peca
    // nas vidas uteis, marcando a linha como aplicada. Qualquer alteracao posterior reabre pendencia.
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const expected = getExpectedValuesForItem(item);
        return {
          ...item,
          inheritsKmTrigger: true,
          inheritsHourmeterTrigger: true,
          inheritsTemporalTrigger: true,
          usefulLifeKm: expected.usefulLifeKm,
          usefulLifeHourmeter: expected.usefulLifeHourmeter,
          usefulLifeTime: expected.usefulLifeTime,
          triggerApplied: true,
          triggerLinked: true,
        };
      }),
    );
    setEditingAppliedItemId(null);
    setSavedMessage("");
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      {
        ...emptyItem(),
        triggerKmValue: String(triggerReferenceSummary.quilometragemKm || Number(DEFAULT_TRIGGER_KM)),
        triggerHourmeterValue: String(triggerReferenceSummary.horimetroHrs || suggestedTriggerHourmeter),
        triggerTemporalMonthsValue: String(
          triggerReferenceSummary.temporalMeses || suggestedTriggerTemporalMonths,
        ),
      },
    ]);
    setSavedMessage("");
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    setEditingAppliedItemId((current) => (current === id ? null : current));
    setSavedMessage("");
  };

  const syncStep1ToStep2 = () => {
    setForm((current) => ({
      ...current,
      vehicleBrandStep2: current.vehicleBrandStep2 || current.vehicleBrand,
      vehicleTypeStep2: current.vehicleTypeStep2 || current.vehicleType,
    }));
  };

  const handleNext = () => {
    if (!canAdvanceToStep2) {
      alert("Preencha todos os campos obrigatorios da etapa 1.");
      return;
    }
    syncStep1ToStep2();
    setStep(2);
  };

  const handleSave = () => {
    if (!canSave) {
      alert("Preencha os campos obrigatorios da etapa 2 e todos os itens obrigatorios.");
      return;
    }

    const existing = editingRegistrationId
      ? savedRegistrations.find((registration) => registration.registrationId === editingRegistrationId)
      : null;
    const payload: PreventiveRegistrationPayload = {
      registrationId: existing?.registrationId || crypto.randomUUID(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      vehicleBindingContext: {
        vehicleModel: form.vehicleModel,
        vehicleBrand: form.vehicleBrand,
        vehicleType: form.vehicleType,
        operationType: form.operationType,
        centerCost: form.centerCost,
      },
      form,
      triggerConfig: {
        // Regra de negocio: resumo do plano e derivado dos gatilhos por peca.
        // Isso evita inconsistencias quando nao existe mais um bloco global de gatilhos.
        quilometragemKm: triggerReferenceSummary.quilometragemKm,
        horimetroHrs: triggerReferenceSummary.horimetroHrs,
        temporalMeses: triggerReferenceSummary.temporalMeses,
      },
      items,
    };
    // CONTRATO BACKEND: persistencia local temporaria. Em API real, este payload deve ser
    // quebrado em cabecalho do plano + regras + itens relacionados.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    try {
      // CONTRATO BACKEND: na integracao real isso vira `POST/PATCH /maintenance-plans`.
      // A lista local continua como cache de consulta/edicao rapida.
      const next = existing
        ? savedRegistrations.map((registration) =>
            registration.registrationId === payload.registrationId ? payload : registration,
          )
        : [payload, ...savedRegistrations];
      window.localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify(next));
      setSavedRegistrations(next);
    } catch {
      // Mantem pelo menos o "last" salvo, mesmo se a lista falhar.
    }
    const successMessage = existing
      ? "Plano de manutencao preventivo atualizado localmente com sucesso."
      : "Plano de manutencao preventivo salvo localmente com sucesso.";

    // Ao finalizar um cadastro (novo ou editado), limpa o formulario para iniciar outro.
    setEditingRegistrationId(null);
    setEditingAppliedItemId(null);
    setStep(1);
    setForm(emptyForm());
    setItems([emptyItem()]);
    setItemSearch("");
    setSavedMessage(successMessage);
  };

  const resetAll = () => {
    setStep(1);
    setEditingRegistrationId(null);
    setForm(emptyForm());
    setItems([emptyItem()]);
    setItemSearch("");
    setSavedMessage("");
  };

  const handleEditRegistration = (registrationId: string) => {
    const selected = savedRegistrations.find((registration) => registration.registrationId === registrationId);
    if (!selected) return;
    // Regra de negocio: a edicao reidrata exatamente o payload salvo para evitar perda de
    // parametrizacao individual de gatilhos por peca.
    setEditingRegistrationId(selected.registrationId);
    setForm({ ...emptyForm(), ...selected.form });
    setItems(selected.items.length > 0 ? selected.items.map((item) => normalizeItem(item)) : [emptyItem()]);
    setStep(2);
    setSavedMessage("Cadastro carregado para edicao.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const completedStep1Count = [
    form.vehicleModel,
    form.vehicleBrand,
    form.vehicleType,
    form.operationType,
    form.centerCost,
  ].filter((value) => String(value).trim()).length;

  const stepperItems = [
    { num: "01", label: "Identificacao", active: step === 1, done: step > 1 },
    { num: "02", label: "Intervalos", active: step === 2, done: false },
  ];

  return (
    <WebShell title={translations.preventiveItemsRegister} subtitle="Plano preventivo">
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Configuracoes &gt; Planos de Manutencao &gt; Novo Plano
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-900">
                Cadastro de Planos de Manutencao
              </h2>
              <p className="mt-2 text-base text-slate-500">
                Crie uma rotina inteligente para disponibilidade da frota sem perder os itens
                obrigatorios de preventiva.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              {stepperItems.map((item, index) => (
                <div key={item.num} className="relative">
                  {index < stepperItems.length - 1 && (
                    <div className="absolute left-[58%] top-5 hidden h-[2px] w-[90%] bg-slate-200 md:block" />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (item.num === "01") setStep(1);
                      if (item.num === "02" && canAdvanceToStep2) {
                        syncStep1ToStep2();
                        setStep(2);
                      }
                    }}
                    className="relative z-10 flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left"
                  >
                    <span
                      className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black ${
                        item.done
                          ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300"
                          : item.active
                            ? "bg-blue-100 text-blue-700 ring-2 ring-blue-300"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.done ? "OK" : item.num}
                    </span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-700">
                        {item.label}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {item.num === "01"
                          ? "Base do veiculo"
                          : item.num === "02"
                            ? "Formula + itens"
                            : "Etapa futura"}
                      </p>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.9fr_0.95fr]">
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Cadastros</p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">
                    Base local
                  </span>
                </div>
                <p className="mt-2 text-3xl font-black text-slate-900">{registrationsSummary.total}</p>
                <p className="text-xs text-slate-500">Planos salvos nesta tela</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Grupos</p>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black uppercase text-blue-700">
                    Modelo + Operacao
                  </span>
                </div>
                <p className="mt-2 text-3xl font-black text-blue-700">{registrationsSummary.groups}</p>
                <p className="text-xs text-slate-500">Logicas preventivas agrupadas</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Pecas</p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">
                    Acumulado
                  </span>
                </div>
                <p className="mt-2 text-3xl font-black text-slate-900">{registrationsSummary.totalPieces}</p>
                <p className="text-xs text-slate-500">Itens cadastrados em planos</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Ultima atualizacao</p>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                      canSave ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {canSave ? "Pronto" : "Edicao"}
                  </span>
                </div>
                <p className="mt-2 text-sm font-black text-emerald-700">
                  {registrationsSummary.lastUpdated
                    ? new Date(registrationsSummary.lastUpdated).toLocaleString("pt-BR")
                    : "--"}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {canSave ? "Plano atual pode ser salvo" : "Complete os campos para salvar"}
                </p>
              </div>
            </div>

            {step === 1 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                      Etapa 01 • Identificacao
                    </p>
                    <h3 className="text-2xl font-black text-slate-900">Configuracoes Base</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Campos obrigatorios da Etapa 1 para identificar o veiculo e a operacao.
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700">
                    Etapa 01
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                      Modelo do Veiculo *
                    </label>
                    <input
                      value={form.vehicleModel}
                      onChange={(e) => updateForm("vehicleModel", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder="Ex.: Volvo FH 540 6x4"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                      Marca do Veiculo *
                    </label>
                    <input
                      value={form.vehicleBrand}
                      onChange={(e) => updateForm("vehicleBrand", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder="Ex.: Volvo"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                      Tipo de Veiculo *
                    </label>
                    <input
                      value={form.vehicleType}
                      onChange={(e) => updateForm("vehicleType", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder="Ex.: Caminhao"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                      Tipo de operacao *
                    </label>
                    <select
                      value={form.operationType}
                      onChange={(e) =>
                        updateForm("operationType", e.target.value as FormState["operationType"])
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    >
                      <option value="">Selecione...</option>
                      <option value="Severo">Severo</option>
                      <option value="Normal">Normal</option>
                      <option value="Leve">Leve</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                      Centro de custo *
                    </label>
                    <input
                      value={form.centerCost}
                      onChange={(e) => updateForm("centerCost", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder="Ex.: Logistica Sul / Operacoes Campo"
                    />
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Resumo rapido da etapa
                    </p>
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase text-slate-600">
                      {completedStep1Count}/5 preenchidos
                    </span>
                  </div>
                  <div className="grid gap-2 text-xs md:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      Modelo: <span className="font-bold text-slate-900">{form.vehicleModel || "-"}</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      Operacao: <span className="font-bold text-slate-900">{form.operationType || "-"}</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      Centro: <span className="font-bold text-slate-900">{form.centerCost || "-"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetAll}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                  >
                    Limpar Cadastro
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700"
                  >
                    Continuar para Intervalos
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Etapa 02 • Intervalos e formula
                      </p>
                      <h3 className="text-2xl font-black text-slate-900">Configuracao de Intervalos</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Campos obrigatorios da Etapa 2 e formula tecnica do veiculo.
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700">
                      Etapa 02
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                        Descricao do veiculo *
                      </label>
                      <textarea
                        value={form.vehicleDescription}
                        onChange={(e) => updateForm("vehicleDescription", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                        rows={3}
                        placeholder="Descricao detalhada do veiculo, uso e observacoes."
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                        Marca do Veiculo *
                      </label>
                      <input
                        value={form.vehicleBrandStep2}
                        onChange={(e) => updateForm("vehicleBrandStep2", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                        Tipo de Veiculo *
                      </label>
                      <input
                        value={form.vehicleTypeStep2}
                        onChange={(e) => updateForm("vehicleTypeStep2", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                        Formula de veiculo *
                      </label>
                      <textarea
                        value={form.vehicleFormula}
                        onChange={(e) => updateForm("vehicleFormula", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm"
                        rows={3}
                        placeholder="Ex.: km_base x fator_operacao + intervalo_tempo"
                      />
                    </div>
                  </div>

                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Itens vinculados ao plano
                      </p>
                      <h4 className="text-xl font-black text-slate-900">Pecas e Insumos Obrigatorios</h4>
                      <p className="mt-1 text-sm text-slate-500">
                        Itens obrigatorios da preventiva: peca/material + vida util (km) + vida util (tempo).
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <input
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        className="w-64 rounded-xl border border-slate-200 px-4 py-3 text-sm"
                        placeholder="Buscar peca/material..."
                      />
                      <button
                        type="button"
                        onClick={addItem}
                        className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700"
                      >
                        Adicionar Peca
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {filteredItems.map((item) => {
                      const complete = isItemComplete(item);
                      const synced = isItemSyncedWithTrigger(item);
                      const applied = item.triggerApplied && item.triggerLinked && synced;
                      const editingApplied = editingAppliedItemId === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`rounded-2xl border p-4 ${complete ? "border-slate-200" : "border-amber-200 bg-amber-50/40"}`}
                        >
                          <div className="grid gap-3 lg:grid-cols-[1.4fr_auto_1fr] lg:items-end">
                            <div>
                              <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                                Peças/material *
                              </label>
                              <input
                                value={item.partMaterial}
                                onChange={(e) => updateItem(item.id, "partMaterial", e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                                placeholder="Ex.: Filtro de oleo, Correia, Oleo 15W40"
                              />
                            </div>

                            {applied ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled
                                  className="rounded-xl border border-slate-300 bg-slate-100 px-3 py-3 text-xs font-black uppercase text-slate-500"
                                >
                                  Aplicado
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingAppliedItemId((current) =>
                                      current === item.id ? null : item.id,
                                    )
                                  }
                                  className="rounded-xl border border-blue-200 px-3 py-3 text-xs font-black uppercase text-blue-700 hover:bg-blue-50"
                                >
                                  Editar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => applyTriggerToItem(item.id)}
                                className="rounded-xl border border-blue-200 px-3 py-3 text-xs font-black uppercase text-blue-700 hover:bg-blue-50"
                              >
                                Aplicar gatilho
                              </button>
                            )}

                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="relative z-10 rounded-xl border border-red-200 px-3 py-3 text-xs font-black uppercase text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Remover
                              </button>
                            </div>
                          </div>

                          {(!applied || editingApplied) && (
                          <div className="mt-3 rounded-xl border border-slate-100 bg-white/80 p-3">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-slate-500">
                                {applied ? "Editar gatilho aplicado para esta peca" : "Configurar gatilhos da peca"}
                              </span>
                              {applied && editingApplied && (
                                <button
                                  type="button"
                                  onClick={() => setEditingAppliedItemId(null)}
                                  className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-700"
                                >
                                  Fechar
                                </button>
                              )}
                            </div>
                            <div>
                              <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                                Gatilhos de Manutencao (individual por peca)
                              </p>
                              <div className="grid gap-3 lg:grid-cols-3">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                  <div className="mb-2 flex items-center justify-between">
                                    <span className="text-[11px] font-black uppercase tracking-[0.1em] text-blue-700">
                                      Quilometragem
                                    </span>
                                    <span
                                      className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                                        item.inheritsKmTrigger
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-slate-100 text-slate-600"
                                      }`}
                                    >
                                      {item.inheritsKmTrigger ? "Herdar" : "Manual"}
                                    </span>
                                  </div>
                                  <div className="flex items-end gap-2">
                                    <input
                                      type="number"
                                      min={0}
                                      value={item.triggerKmValue}
                                      onChange={(e) => updateItem(item.id, "triggerKmValue", e.target.value)}
                                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xl font-black text-slate-900"
                                      placeholder="20000"
                                    />
                                    <span className="pb-1 text-sm font-black text-slate-400">KM</span>
                                  </div>
                                  <div className="mt-2">
                                    <label className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                                      Vida util (km) *
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={item.usefulLifeKm}
                                      onChange={(e) => updateItemLifecycleField(item.id, "usefulLifeKm", e.target.value)}
                                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                      placeholder="20000"
                                    />
                                  </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                  <div className="mb-2 flex items-center justify-between">
                                    <span className="text-[11px] font-black uppercase tracking-[0.1em] text-amber-700">
                                      Horimetro
                                    </span>
                                    <span
                                      className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                                        item.inheritsHourmeterTrigger
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-slate-100 text-slate-600"
                                      }`}
                                    >
                                      {item.inheritsHourmeterTrigger ? "Herdar" : "Manual"}
                                    </span>
                                  </div>
                                  <div className="flex items-end gap-2">
                                    <input
                                      type="number"
                                      min={0}
                                      value={item.triggerHourmeterValue}
                                      onChange={(e) => updateItem(item.id, "triggerHourmeterValue", e.target.value)}
                                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xl font-black text-slate-900"
                                      placeholder="500"
                                    />
                                    <span className="pb-1 text-sm font-black text-slate-400">HRS</span>
                                  </div>
                                  <div className="mt-2">
                                    <label className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                                      Vida util (horimetro) *
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={item.usefulLifeHourmeter}
                                      onChange={(e) =>
                                        updateItemLifecycleField(item.id, "usefulLifeHourmeter", e.target.value)
                                      }
                                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                      placeholder="500"
                                    />
                                  </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                  <div className="mb-2 flex items-center justify-between">
                                    <span className="text-[11px] font-black uppercase tracking-[0.1em] text-emerald-700">
                                      Temporal
                                    </span>
                                    <span
                                      className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                                        item.inheritsTemporalTrigger
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-slate-100 text-slate-600"
                                      }`}
                                    >
                                      {item.inheritsTemporalTrigger ? "Herdar" : "Manual"}
                                    </span>
                                  </div>
                                  <div className="flex items-end gap-2">
                                    <input
                                      type="number"
                                      min={1}
                                      value={item.triggerTemporalMonthsValue}
                                      onChange={(e) => updateItem(item.id, "triggerTemporalMonthsValue", e.target.value)}
                                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xl font-black text-slate-900"
                                      placeholder="6"
                                    />
                                    <span className="pb-1 text-sm font-black text-slate-400">MESES</span>
                                  </div>
                                  <div className="mt-2">
                                    <label className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                                      Vida util (tempo) *
                                    </label>
                                    <input
                                      value={item.usefulLifeTime}
                                      onChange={(e) => updateItemLifecycleField(item.id, "usefulLifeTime", e.target.value)}
                                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                      placeholder="6 meses"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          )}
                        </div>
                      );
                    })}

                    {filteredItems.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                        Nenhum item encontrado para o filtro informado.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-600 p-5 text-white shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black uppercase tracking-[0.12em] opacity-90">Dica Pro</p>
                <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em]">
                  Operacao {form.operationType || "Normal"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed">
                Para operacao <strong>{form.operationType || "Normal"}</strong>, priorize itens com
                vida util combinada (KM + tempo) e horimetro, usando o menor vencimento como referencia.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-lg bg-white/10 px-2 py-2">
                  <p className="opacity-80">KM</p>
                  <p className="font-black">{triggerReferenceSummary.quilometragemKm}</p>
                </div>
                <div className="rounded-lg bg-white/10 px-2 py-2">
                  <p className="opacity-80">HRS</p>
                  <p className="font-black">{triggerReferenceSummary.horimetroHrs}</p>
                </div>
                <div className="rounded-lg bg-white/10 px-2 py-2">
                  <p className="opacity-80">MESES</p>
                  <p className="font-black">{triggerReferenceSummary.temporalMeses}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-slate-900">Checklist de Validacao</p>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">
                  Passo {step === 1 ? "01" : "02"}
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {[
                  {
                    label: "Campos base obrigatorios preenchidos",
                    ok: canAdvanceToStep2,
                  },
                  {
                    label: "Formula de veiculo definida",
                    ok: Boolean(form.vehicleFormula.trim()),
                  },
                  {
                    label: "Itens com KM e tempo cadastrados",
                    ok: items.length > 0 && items.every(isItemComplete),
                  },
                ].map((check) => (
                  <div
                    key={check.label}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      check.ok
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    {check.ok ? "OK" : "Pendente"} - {check.label}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Proximo passo</p>
                <p className="mt-1 text-sm text-slate-700">
                  {step === 1
                    ? "Preencha os campos base e avance para configurar formula e itens."
                    : canSave
                      ? "Plano validado. Salve e gerencie os registros na mesma pagina."
                      : "Finalize formula e itens obrigatorios para habilitar o salvamento."}
                </p>
              </div>
            </div>
          </aside>
        </section>

        {step === 2 && (
          <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              Voltar
            </button>

            <div className="flex flex-col items-start gap-2 md:items-end">
              {savedMessage && <p className="text-sm font-semibold text-emerald-700">{savedMessage}</p>}
              <button
                type="button"
                onClick={handleSave}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700"
              >
                Salvar Plano de Manutencao
              </button>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900">Cadastros de Preventivas</h3>
              <p className="text-sm text-slate-500">
                Todos os registros ficam nesta tela para edicao rapida, reaproveitamento e padronizacao.
              </p>
              {savedMessage && (
                <p className="mt-2 text-sm font-semibold text-emerald-700">{savedMessage}</p>
              )}
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">
              {filteredRegistrations.length}/{savedRegistrations.length} cadastro
              {filteredRegistrations.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
            <input
              value={registrationSearch}
              onChange={(e) => setRegistrationSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="Buscar por modelo, marca, tipo, centro de custo ou formula..."
            />
            <select
              value={registrationOperationFilter}
              onChange={(e) =>
                setRegistrationOperationFilter(e.target.value as FormState["operationType"] | "all")
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            >
              <option value="all">Todas operacoes</option>
              {registrationFilterOptions.operationTypes.map((operationType) => (
                <option key={operationType} value={operationType}>
                  {operationType}
                </option>
              ))}
            </select>
            <select
              value={registrationVehicleTypeFilter}
              onChange={(e) => setRegistrationVehicleTypeFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            >
              <option value="all">Todos os tipos</option>
              {registrationFilterOptions.vehicleTypes.map((vehicleType) => (
                <option key={vehicleType} value={vehicleType}>
                  {vehicleType}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 space-y-3">
            {savedRegistrations.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                Nenhum cadastro salvo ainda. Finalize um plano acima para ele aparecer aqui.
              </div>
            )}
            {savedRegistrations.length > 0 && filteredRegistrations.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                Nenhum cadastro encontrado com os filtros informados.
              </div>
            )}

            {filteredRegistrations.map((registration) => (
              <div
                key={registration.registrationId}
                className={`rounded-2xl border p-4 shadow-sm transition ${
                  editingRegistrationId === registration.registrationId
                    ? "border-amber-300 bg-amber-50/60"
                    : "border-slate-200 bg-slate-50 hover:border-blue-200 hover:bg-white"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-black text-slate-900">
                        {registration.form.vehicleModel || "Modelo nao informado"}
                      </p>
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black uppercase text-blue-700">
                        {registration.form.operationType || "Operacao"}
                      </span>
                      {editingRegistrationId === registration.registrationId && (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-700">
                          Em edicao
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      {registration.form.vehicleBrand} • {registration.form.vehicleType} • Centro:{" "}
                      {registration.form.centerCost || "-"}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                        <p className="font-black uppercase tracking-[0.08em] text-slate-400">Pecas</p>
                        <p className="mt-1 text-sm font-black text-slate-900">{registration.items.length}</p>
                      </div>
                      <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs">
                        <p className="font-black uppercase tracking-[0.08em] text-blue-500">KM</p>
                        <p className="mt-1 text-sm font-black text-blue-700">
                          {(registration.triggerConfig.quilometragemKm || 0).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs">
                        <p className="font-black uppercase tracking-[0.08em] text-amber-500">Horimetro</p>
                        <p className="mt-1 text-sm font-black text-amber-700">
                          {registration.triggerConfig.horimetroHrs || 0} h
                        </p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs">
                        <p className="font-black uppercase tracking-[0.08em] text-emerald-500">Temporal</p>
                        <p className="mt-1 text-sm font-black text-emerald-700">
                          {registration.triggerConfig.temporalMeses || 0} meses
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                        Formula: {registration.form.vehicleFormula || "-"}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                        Descricao: {registration.form.vehicleDescription || "-"}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                        Pecas: {registration.items.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Salvo em{" "}
                      {new Date(registration.updatedAt || registration.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditRegistration(registration.registrationId)}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </WebShell>
  );
}


