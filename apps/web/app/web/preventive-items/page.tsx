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

const emptyItem = (): PreventiveItemRow => ({
  id: crypto.randomUUID(),
  partMaterial: "",
  usefulLifeKm: "",
  usefulLifeTime: "",
});

export default function WebPreventiveItemsPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [savedMessage, setSavedMessage] = useState("");
  const [form, setForm] = useState<FormState>({
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
  const [items, setItems] = useState<PreventiveItemRow[]>([emptyItem()]);

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
          items.every(
            (item) =>
              item.partMaterial.trim() &&
              item.usefulLifeKm.trim() &&
              item.usefulLifeTime.trim(),
          ),
      ),
    [form, items],
  );

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

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSavedMessage("");
  };

  const updateItem = (id: string, key: keyof PreventiveItemRow, value: string) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    );
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
      alert("Preencha todos os campos obrigatorios da Tela 1.");
      return;
    }
    syncStep1ToStep2();
    setStep(2);
  };

  const handleSave = () => {
    if (!canSave) {
      alert("Preencha os campos obrigatorios da Tela 2 e todos os itens.");
      return;
    }

    // Persistencia local simples para a UI funcionar sem backend.
    const payload = {
      createdAt: new Date().toISOString(),
      form,
      items,
    };
    window.localStorage.setItem("frota-pro.preventive-items-registration:last", JSON.stringify(payload));
    setSavedMessage("Cadastro de itens de preventiva salvo localmente com sucesso.");
  };

  return (
    <WebShell title={translations.preventiveItemsRegister} subtitle="Cadastro em 2 telas">
      <div className="space-y-5">
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
              {stepMeta.map((item) => {
                const isActive = item.id === step;
                const isCompleted = item.id < step;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === 1 || canAdvanceToStep2) setStep(item.id);
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      isActive
                        ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]/30 shadow-sm"
                        : isCompleted
                          ? "border-emerald-200 bg-emerald-50/70"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 grid h-8 w-8 place-items-center rounded-full text-xs font-black ${
                          isActive
                            ? "bg-[var(--color-brand)] text-white"
                            : isCompleted
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isCompleted ? "OK" : item.id}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {step === 1 && (
          <div className="card p-5 transition-all duration-300 ease-out">
            <h3 className="text-lg font-black">Etapa 1 - Identificacao do Veiculo e Operacao</h3>
            <p className="mt-1 text-sm text-slate-500">
              Cadastre a base do veiculo e contexto operacional para os itens de preventiva.
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
                Avancar para Tela 2
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <>
            <div className="card p-5 transition-all duration-300 ease-out">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black">Etapa 2 - Formula e Itens Preventivos</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Defina a formula do veiculo e os itens preventivos com vida util por km/tempo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black uppercase text-slate-600"
                >
                  Voltar para Tela 1
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

            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h4 className="text-sm font-black uppercase tracking-[0.12em] text-slate-700">
                    Itens tela 2
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Cadastre Peças/material com vida util por KM e por tempo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase text-white"
                >
                  Adicionar item
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Peças/material</th>
                      <th className="px-4 py-3">Vida util (km)</th>
                      <th className="px-4 py-3">Vida util (tempo)</th>
                      <th className="px-4 py-3 text-right">Acao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
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
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            disabled={items.length === 1}
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-black uppercase text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                    Resumo
                  </p>
                  <p className="text-sm text-slate-600">
                    {items.length} item(ns) cadastrado(s) para {form.vehicleModel || "veiculo"}.
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
