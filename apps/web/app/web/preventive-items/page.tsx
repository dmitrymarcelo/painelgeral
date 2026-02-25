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

  const estimatedInvestment = useMemo(() => {
    const base = items.length * 145;
    const opFactor = form.operationType === "Severo" ? 1.35 : form.operationType === "Leve" ? 0.9 : 1;
    return Math.round(base * opFactor);
  }, [items.length, form.operationType]);

  const triggerKm = averageUsefulLifeKm || 20000;
  const triggerHourmeter =
    form.operationType === "Severo" ? 350 : form.operationType === "Leve" ? 700 : 500;
  const triggerTemporalMonths = useMemo(() => {
    const monthValues = items
      .map((item) => item.usefulLifeTime.toLowerCase())
      .map((text) => {
        const match = text.match(/(\d+)/);
        return match ? Number(match[1]) : null;
      })
      .filter((value): value is number => value != null && value > 0);
    return monthValues.length > 0 ? Math.min(...monthValues) : 6;
  }, [items]);

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
      alert("Preencha os campos obrigatorios da etapa 2 e todos os itens obrigatorios.");
      return;
    }

    const payload = {
      createdAt: new Date().toISOString(),
      form,
      items,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setSavedMessage("Plano de manutencao preventivo salvo localmente com sucesso.");
  };

  const resetAll = () => {
    setStep(1);
    setForm(emptyForm());
    setItems([emptyItem()]);
    setItemSearch("");
    setSavedMessage("");
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
    { num: "03", label: "Checklist", active: false, done: false },
    { num: "04", label: "Revisao", active: false, done: false },
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
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Etapa 1</p>
                <p className="mt-2 text-3xl font-black">{completedStep1Count}/5</p>
                <p className="text-xs text-slate-500">Campos base preenchidos</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Itens</p>
                <p className="mt-2 text-3xl font-black">{items.length}</p>
                <p className="text-xs text-slate-500">Pecas / materiais</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">KM Medio</p>
                <p className="mt-2 text-3xl font-black">
                  {averageUsefulLifeKm ? averageUsefulLifeKm.toLocaleString("pt-BR") : "--"}
                </p>
                <p className="text-xs text-slate-500">Vida util media (km)</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Status</p>
                <p className={`mt-2 text-2xl font-black ${canSave ? "text-emerald-700" : "text-amber-600"}`}>
                  {canSave ? "Pronto" : "Em construcao"}
                </p>
                <p className="text-xs text-slate-500">Validacao do plano</p>
              </div>
            </div>

            {step === 1 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
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

                <div className="mt-6 flex justify-end">
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

                  <div className="mt-6">
                    <div className="mb-3">
                      <h4 className="text-lg font-black text-slate-900">
                        Gatilhos de Manutencao
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        A revisao ocorre pelo que atingir primeiro. Valores abaixo podem ser adaptados ao projeto.
                      </p>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-100 text-blue-700">
                            ⛽
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                            Frequencia
                          </span>
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-blue-700">
                          Quilometragem
                        </p>
                        <div className="mt-2 flex items-end gap-2">
                          <p className="text-4xl font-black text-slate-900">
                            {triggerKm.toLocaleString("pt-BR")}
                          </p>
                          <p className="pb-1 text-lg font-black text-slate-400">KM</p>
                        </div>
                        <p className="mt-3 text-xs leading-relaxed text-slate-500">
                          Troque este item ao atingir aproximadamente{" "}
                          <span className="font-bold text-slate-700">
                            {triggerKm.toLocaleString("pt-BR")} km
                          </span>{" "}
                          ou antes, conforme operacao.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-amber-700">
                            ⏱
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                            Frequencia
                          </span>
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-700">
                          Horimetro
                        </p>
                        <div className="mt-2 flex items-end gap-2">
                          <p className="text-4xl font-black text-slate-900">{triggerHourmeter}</p>
                          <p className="pb-1 text-lg font-black text-slate-400">HRS</p>
                        </div>
                        <p className="mt-3 text-xs leading-relaxed text-slate-500">
                          Ideal para maquinas ou veiculos com uso por horas. Ajuste pelo tipo de operacao.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                            📅
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                            Frequencia
                          </span>
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700">
                          Temporal
                        </p>
                        <div className="mt-2 flex items-end gap-2">
                          <p className="text-4xl font-black text-slate-900">{triggerTemporalMonths}</p>
                          <p className="pb-1 text-lg font-black text-slate-400">MESES</p>
                        </div>
                        <p className="mt-3 text-xs leading-relaxed text-slate-500">
                          Independente do uso, realizar a troca pelo limite de tempo definido.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
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
                    {filteredItems.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-2xl border p-4 ${isItemComplete(item) ? "border-slate-200" : "border-amber-200 bg-amber-50/40"}`}
                      >
                        <div className="grid gap-3 lg:grid-cols-[1.5fr_0.8fr_0.8fr_auto] lg:items-end">
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
                          <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                              Vida util (km) *
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={item.usefulLifeKm}
                              onChange={(e) => updateItem(item.id, "usefulLifeKm", e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                              placeholder="20000"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                              Vida util (tempo) *
                            </label>
                            <input
                              value={item.usefulLifeTime}
                              onChange={(e) => updateItem(item.id, "usefulLifeTime", e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                              placeholder="6 meses"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                                isItemComplete(item)
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {isItemComplete(item) ? "Completo" : "Pendente"}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              disabled={items.length === 1}
                              className="rounded-xl border border-red-200 px-3 py-3 text-xs font-black uppercase text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

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
            <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-500 p-5 text-white shadow-lg">
              <p className="text-sm font-black uppercase tracking-[0.12em] opacity-90">Dica Pro</p>
              <p className="mt-3 text-sm leading-relaxed">
                Para operacao <strong>{form.operationType || "Normal"}</strong>, priorize itens com
                vida util combinada (KM + tempo) para reduzir falhas por ociosidade e uso severo.
              </p>
              <p className="mt-3 text-xs opacity-90">
                Exemplo: filtros, lubrificantes e correias devem considerar o que ocorrer primeiro.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-500">
                Resumo do Planejamento
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs text-slate-400">Configuracao principal</p>
                  <p className="font-bold text-slate-900">
                    {(form.vehicleModel || "Modelo")} • {(form.vehicleType || "Tipo")}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                      Gatilho KM
                    </p>
                    <p className="mt-1 text-lg font-black text-blue-700">
                      {averageUsefulLifeKm ? `${averageUsefulLifeKm.toLocaleString("pt-BR")} KM` : "--"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                      Pecas
                    </p>
                    <p className="mt-1 text-lg font-black text-slate-900">{items.length} Itens</p>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-200 pt-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                    Investimento est.
                  </p>
                  <p className="mt-1 text-3xl font-black text-blue-700">
                    R$ {estimatedInvestment.toLocaleString("pt-BR")}
                  </p>
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
            </div>
          </aside>
        </section>

        <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={() => (step === 2 ? setStep(1) : resetAll())}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            {step === 2 ? "Voltar" : "Limpar Cadastro"}
          </button>

          <div className="flex flex-col items-start gap-2 md:items-end">
            {savedMessage && <p className="text-sm font-semibold text-emerald-700">{savedMessage}</p>}
            {step === 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700"
              >
                Continuar para Intervalos
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700"
              >
                Salvar Plano de Manutencao
              </button>
            )}
          </div>
        </section>
      </div>
    </WebShell>
  );
}
