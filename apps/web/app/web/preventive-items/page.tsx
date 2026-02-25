"use client";

import { useMemo, useState } from "react";
import { WebShell } from "@/components/layout/web-shell";
import { translations } from "@/lib/i18n";

type PreventiveItemRow = {
  id: string;
  partMaterial: string;
  usefulLifeKm: string;
  usefulLifeTime: string;
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

const STORAGE_KEY = "frota-pro.preventive-items-registration:last";

const emptyItem = (): PreventiveItemRow => ({
  id: crypto.randomUUID(),
  partMaterial: "",
  usefulLifeKm: "",
  usefulLifeTime: "",
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
  Boolean(item.partMaterial.trim() && item.usefulLifeKm.trim() && item.usefulLifeTime.trim());

export default function WebPreventiveItemsPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [savedMessage, setSavedMessage] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [itemCompletenessFilter, setItemCompletenessFilter] = useState<"all" | "complete" | "pending">("all");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [items, setItems] = useState<PreventiveItemRow[]>([emptyItem()]);

  const stepMeta = [
    {
      id: 1 as const,
      title: "Identificacao do Veiculo",
      subtitle: "Modelo, marca, tipo, operacao e centro de custo",
    },
    {
      id: 2 as const,
      title: "Formula e Itens Preventivos",
      subtitle: "Formula tecnica e lista de pecas/material com vida util",
    },
  ];

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

  const completedStep1Fields = useMemo(
    () =>
      [
        form.vehicleModel,
        form.vehicleBrand,
        form.vehicleType,
        form.operationType,
        form.centerCost,
      ].filter((value) => String(value).trim()).length,
    [form],
  );

  const averageUsefulLifeKm = useMemo(() => {
    const values = items
      .map((item) => Number(item.usefulLifeKm))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }, [items]);

  const filteredItems = useMemo(() => {
    const needle = itemSearch.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !needle ||
        item.partMaterial.toLowerCase().includes(needle) ||
        item.usefulLifeKm.toLowerCase().includes(needle) ||
        item.usefulLifeTime.toLowerCase().includes(needle);

      const complete = isItemComplete(item);
      const matchesCompleteness =
        itemCompletenessFilter === "all" ||
        (itemCompletenessFilter === "complete" && complete) ||
        (itemCompletenessFilter === "pending" && !complete);

      return matchesSearch && matchesCompleteness;
    });
  }, [itemCompletenessFilter, itemSearch, items]);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSavedMessage("");
  };

  const updateItem = (id: string, key: keyof PreventiveItemRow, value: string) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
    setSavedMessage("");
  };

  const addItem = () => {
    setItems((current) => [...current, emptyItem()]);
    setSavedMessage("");
  };

  const removeItem = (id: string) => {
    setItems((current) => (current.length > 1 ? current.filter((item) => item.id !== id) : current));
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
      alert("Preencha os campos obrigatorios da etapa 2 e todos os itens.");
      return;
    }

    const payload = {
      createdAt: new Date().toISOString(),
      form,
      items,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setSavedMessage("Cadastro de itens de preventiva salvo localmente com sucesso.");
  };

  const resetAll = () => {
    setStep(1);
    setForm(emptyForm());
    setItems([emptyItem()]);
    setSavedMessage("");
    setItemSearch("");
    setItemCompletenessFilter("all");
  };

  return (
    <WebShell title={translations.preventiveItemsRegister} subtitle="Cadastro em 2 etapas">
      <div className="space-y-5">
        <div className="card p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900">
                Cadastro de Itens de Preventiva
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-500">
                Monte o plano preventivo por veiculo com dados de identificacao, formula tecnica e
                itens de pecas/material com vida util por quilometragem e tempo.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {form.operationType && (
                  <span className="rounded-full bg-blue-100 px-3 py-1 font-bold text-blue-700">
                    Operacao: {form.operationType}
                  </span>
                )}
                {form.vehicleType && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700">
                    Tipo: {form.vehicleType}
                  </span>
                )}
                {form.centerCost && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-700">
                    Centro: {form.centerCost}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => alert("Importacao de modelos sera conectada ao backend/API depois.")}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Importar Modelo
              </button>
              <button
                type="button"
                onClick={resetAll}
                className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-emerald-600"
              >
                Novo Plano de Veiculo
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="card p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Etapa 1</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{completedStep1Fields}/5</p>
            <p className="mt-1 text-xs text-slate-500">Campos preenchidos</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Itens preventivos</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{items.length}</p>
            <p className="mt-1 text-xs text-slate-500">Linhas cadastradas</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Vida util media (KM)</p>
            <p className="mt-2 text-3xl font-black text-slate-900">
              {averageUsefulLifeKm ? averageUsefulLifeKm.toLocaleString("pt-BR") : "--"}
            </p>
            <p className="mt-1 text-xs text-slate-500">Media entre itens com KM preenchido</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Pronto para salvar</p>
            <p className={`mt-2 text-3xl font-black ${canSave ? "text-emerald-700" : "text-amber-600"}`}>
              {canSave ? "SIM" : "NAO"}
            </p>
            <p className="mt-1 text-xs text-slate-500">Validacao final da etapa 2</p>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Fluxo de cadastro
              </p>
              <h3 className="mt-1 text-base font-black">
                {stepMeta.find((item) => item.id === step)?.title}
              </h3>
              <p className="text-sm text-slate-500">
                {stepMeta.find((item) => item.id === step)?.subtitle}
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black uppercase text-slate-600">
              Etapa {step} de 2
            </span>
          </div>

          <div className="mt-4">
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[var(--color-brand)] transition-all duration-300 ease-out"
                style={{ width: step === 1 ? "50%" : "100%" }}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {stepMeta.map((meta) => {
                const active = meta.id === step;
                const completed = meta.id < step;
                return (
                  <button
                    key={meta.id}
                    type="button"
                    onClick={() => {
                      if (meta.id === 1 || canAdvanceToStep2) setStep(meta.id);
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]/25 shadow-sm"
                        : completed
                          ? "border-emerald-200 bg-emerald-50/70"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 grid h-8 w-8 place-items-center rounded-full text-xs font-black ${
                          active
                            ? "bg-[var(--color-brand)] text-white"
                            : completed
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {completed ? "OK" : meta.id}
                      </div>
                      <div>
                        <p className="text-sm font-black">{meta.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{meta.subtitle}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {step === 1 && (
          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="card p-5">
              <h3 className="text-lg font-black">Etapa 1 - Identificacao do Veiculo e Operacao</h3>
              <p className="mt-1 text-sm text-slate-500">
                Defina as informacoes-base que serao usadas no plano preventivo.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                    Modelo do Veiculo *
                  </label>
                  <input
                    value={form.vehicleModel}
                    onChange={(e) => updateForm("vehicleModel", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    placeholder="Ex.: Hilux SRX 2.8"
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
                    placeholder="Ex.: Toyota"
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
                    placeholder="Ex.: Utilitario"
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
                    placeholder="Ex.: Operacoes Campo"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-xl bg-[var(--color-brand)] px-5 py-3 text-sm font-black uppercase text-white"
                >
                  Avancar para Etapa 2
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <div className="card p-5">
                <h4 className="text-sm font-black uppercase tracking-[0.12em] text-slate-600">
                  Preview do plano
                </h4>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Modelo</span>
                    <span className="font-semibold text-slate-800">{form.vehicleModel || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Marca</span>
                    <span className="font-semibold text-slate-800">{form.vehicleBrand || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Tipo</span>
                    <span className="font-semibold text-slate-800">{form.vehicleType || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Operacao</span>
                    <span className="font-semibold text-slate-800">{form.operationType || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Centro de custo</span>
                    <span className="font-semibold text-slate-800">{form.centerCost || "-"}</span>
                  </div>
                </div>
              </div>

              <div className="card p-5">
                <h4 className="text-sm font-black uppercase tracking-[0.12em] text-slate-600">
                  Regras de cadastro
                </h4>
                <div className="mt-3 space-y-2 text-xs text-slate-600">
                  <p>Todos os campos da etapa 1 sao obrigatorios para avancar.</p>
                  <p>Marca e tipo sao reaproveitados automaticamente na etapa 2.</p>
                  <p>O centro de custo define a alocacao do plano preventivo.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <>
            <div className="card p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black">Etapa 2 - Formula e Itens Preventivos</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Defina a formula do veiculo e os itens preventivos com vida util por KM/tempo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black uppercase text-slate-600"
                >
                  Voltar para Etapa 1
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                    Descricao do veiculo *
                  </label>
                  <textarea
                    value={form.vehicleDescription}
                    onChange={(e) => updateForm("vehicleDescription", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    rows={3}
                    placeholder="Descreva aplicacao, configuracao, caracteristicas e observacoes."
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
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-mono"
                    rows={3}
                    placeholder="Ex.: km_base x fator_operacao + intervalo_tempo"
                  />
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                    Buscar item (peca/material)
                  </label>
                  <input
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    placeholder="Ex.: filtro, oleo, correia..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                    Status do item
                  </label>
                  <select
                    value={itemCompletenessFilter}
                    onChange={(e) =>
                      setItemCompletenessFilter(e.target.value as "all" | "complete" | "pending")
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  >
                    <option value="all">Todos</option>
                    <option value="complete">Completos</option>
                    <option value="pending">Pendentes</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={addItem}
                    className="w-full rounded-xl bg-slate-900 px-4 py-3 text-xs font-black uppercase text-white"
                  >
                    Adicionar item
                  </button>
                </div>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h4 className="text-sm font-black uppercase tracking-[0.12em] text-slate-700">
                    Itens Preventivos
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Cadastre pecas/material com vida util por KM e por tempo.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                  {filteredItems.length} item(ns)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Pecas/material</th>
                      <th className="px-4 py-3">Vida util (km)</th>
                      <th className="px-4 py-3">Vida util (tempo)</th>
                      <th className="px-4 py-3 text-right">Acao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const complete = isItemComplete(item);
                      return (
                        <tr
                          key={item.id}
                          className={`border-t border-slate-100 ${complete ? "bg-white" : "bg-amber-50/40"}`}
                        >
                          <td className="px-4 py-3">
                            <input
                              value={item.partMaterial}
                              onChange={(e) => updateItem(item.id, "partMaterial", e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                              placeholder="Ex.: Filtro de oleo"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min={0}
                              value={item.usefulLifeKm}
                              onChange={(e) => updateItem(item.id, "usefulLifeKm", e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                              placeholder="Ex.: 10000"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              value={item.usefulLifeTime}
                              onChange={(e) => updateItem(item.id, "usefulLifeTime", e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                              placeholder="Ex.: 6 meses"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                                  complete
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {complete ? "Completo" : "Pendente"}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                disabled={items.length === 1}
                                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-black uppercase text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Remover
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                          Nenhum item encontrado com os filtros selecionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Resumo do cadastro
                  </p>
                  <p className="text-sm text-slate-600">
                    {items.length} item(ns) cadastrados para {form.vehicleModel || "veiculo"}.
                  </p>
                  {savedMessage && (
                    <p className="mt-1 text-sm font-semibold text-emerald-700">{savedMessage}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-black uppercase text-slate-600"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="rounded-xl bg-[var(--color-brand)] px-5 py-3 text-sm font-black uppercase text-white"
                  >
                    Salvar cadastro
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </WebShell>
  );
}

