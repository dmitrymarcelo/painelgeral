"use client";

import { useEffect, useMemo, useState } from "react";
import { WebShell } from "@/components/layout/web-shell";

const STORAGE_LAST_KEY = "frota-pro.preventive-items-registration:last";
const STORAGE_LIST_KEY = "frota-pro.preventive-items-registrations";

type StoredItem = {
  partMaterial?: string;
  triggerKmValue?: string;
  triggerHourmeterValue?: string;
  triggerTemporalMonthsValue?: string;
  usefulLifeKm?: string;
  usefulLifeHourmeter?: string;
  usefulLifeTime?: string;
};

type StoredRegistration = {
  registrationId?: string;
  createdAt?: string;
  vehicleBindingContext?: {
    vehicleModel?: string;
    vehicleBrand?: string;
    vehicleType?: string;
    operationType?: string;
    centerCost?: string;
  };
  form?: {
    vehicleModel?: string;
    operationType?: string;
    centerCost?: string;
    vehicleType?: string;
    vehicleFormula?: string;
  };
  items?: StoredItem[];
};

type GroupRow = {
  key: string;
  vehicleModel: string;
  operationType: string;
  vehicleType: string;
  centerCost: string;
  registrations: StoredRegistration[];
  totalPieces: number;
  avgTriggerKm: number;
  avgTriggerHourmeter: number;
  avgTriggerTemporalMonths: number;
  latestCreatedAt: string | null;
};

const toNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export default function WebPreventiveRegistrationsPage() {
  const [registrations, setRegistrations] = useState<StoredRegistration[]>([]);

  useEffect(() => {
    const load = () => {
      if (typeof window === "undefined") return;
      try {
        const listRaw = window.localStorage.getItem(STORAGE_LIST_KEY);
        const parsedList = listRaw ? (JSON.parse(listRaw) as unknown) : [];
        if (Array.isArray(parsedList) && parsedList.length > 0) {
          setRegistrations(parsedList as StoredRegistration[]);
          return;
        }

        const lastRaw = window.localStorage.getItem(STORAGE_LAST_KEY);
        if (!lastRaw) {
          setRegistrations([]);
          return;
        }
        const parsedLast = JSON.parse(lastRaw) as StoredRegistration;
        setRegistrations(parsedLast ? [parsedLast] : []);
      } catch {
        setRegistrations([]);
      }
    };

    load();
    window.addEventListener("storage", load);
    window.addEventListener("focus", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("focus", load);
    };
  }, []);

  const groups = useMemo<GroupRow[]>(() => {
    const byKey = new Map<string, GroupRow>();

    for (const registration of registrations) {
      const context = registration.vehicleBindingContext ?? {};
      const form = registration.form ?? {};
      const vehicleModel = context.vehicleModel || form.vehicleModel || "Modelo nao informado";
      const operationType = context.operationType || form.operationType || "Operacao nao informada";
      const vehicleType = context.vehicleType || form.vehicleType || "-";
      const centerCost = context.centerCost || form.centerCost || "-";
      const key = `${vehicleModel}::${operationType}`;

      const items = Array.isArray(registration.items) ? registration.items : [];
      const totalPieces = items.length;
      const avgTriggerKm =
        items.length > 0
          ? Math.round(
              items.reduce((sum, item) => sum + toNumber(item.triggerKmValue ?? item.usefulLifeKm), 0) /
                items.length,
            )
          : 0;
      const avgTriggerHourmeter =
        items.length > 0
          ? Math.round(
              items.reduce(
                (sum, item) => sum + toNumber(item.triggerHourmeterValue ?? item.usefulLifeHourmeter),
                0,
              ) / items.length,
            )
          : 0;
      const avgTriggerTemporalMonths =
        items.length > 0
          ? Math.round(
              items.reduce(
                (sum, item) => sum + toNumber(item.triggerTemporalMonthsValue ?? String(item.usefulLifeTime ?? "")),
                0,
              ) / items.length,
            )
          : 0;

      const createdAt = registration.createdAt ?? null;

      const current = byKey.get(key);
      if (!current) {
        byKey.set(key, {
          key,
          vehicleModel,
          operationType,
          vehicleType,
          centerCost,
          registrations: [registration],
          totalPieces,
          avgTriggerKm,
          avgTriggerHourmeter,
          avgTriggerTemporalMonths,
          latestCreatedAt: createdAt,
        });
        continue;
      }

      current.registrations.push(registration);
      current.totalPieces += totalPieces;
      current.avgTriggerKm = Math.round((current.avgTriggerKm + avgTriggerKm) / 2);
      current.avgTriggerHourmeter = Math.round((current.avgTriggerHourmeter + avgTriggerHourmeter) / 2);
      current.avgTriggerTemporalMonths = Math.round(
        (current.avgTriggerTemporalMonths + avgTriggerTemporalMonths) / 2,
      );
      if (createdAt && (!current.latestCreatedAt || createdAt > current.latestCreatedAt)) {
        current.latestCreatedAt = createdAt;
      }
    }

    return [...byKey.values()].sort((a, b) => a.vehicleModel.localeCompare(b.vehicleModel));
  }, [registrations]);

  const totalRegistrations = registrations.length;
  const totalGroups = groups.length;
  const totalPieces = groups.reduce((sum, group) => sum + group.totalPieces, 0);

  return (
    <WebShell title="Cadastros de Preventivas" subtitle="Agrupado por modelo e operacao">
      <div className="space-y-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">
            Cadastros de Preventivas
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Agrupamento por <strong>Modelo do Veiculo</strong> e <strong>Tipo de operacao</strong> para
            definir logicas preventivas e calculos de gatilhos reutilizaveis no sistema.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Fonte atual: dados salvos localmente no navegador (`localStorage`) pelas telas de cadastro.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Cadastros</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{totalRegistrations}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Grupos logicos</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{totalGroups}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Pecas cadastradas</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{totalPieces}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-black uppercase tracking-[0.12em] text-slate-700">
              Agrupamento de preventivas
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">Modelo do Veiculo</th>
                  <th className="px-5 py-3">Tipo de operacao</th>
                  <th className="px-5 py-3">Tipo de veiculo</th>
                  <th className="px-5 py-3">Centro de custo</th>
                  <th className="px-5 py-3">Gatilho KM (medio)</th>
                  <th className="px-5 py-3">Gatilho Horimetro (medio)</th>
                  <th className="px-5 py-3">Gatilho Temporal (medio)</th>
                  <th className="px-5 py-3">Pecas</th>
                  <th className="px-5 py-3">Ultimo cadastro</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.key} className="border-t border-slate-100">
                    <td className="px-5 py-4 font-semibold text-slate-900">{group.vehicleModel}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black uppercase text-blue-700">
                        {group.operationType}
                      </span>
                    </td>
                    <td className="px-5 py-4">{group.vehicleType}</td>
                    <td className="px-5 py-4">{group.centerCost}</td>
                    <td className="px-5 py-4 font-black text-blue-700">
                      {group.avgTriggerKm > 0 ? `${group.avgTriggerKm.toLocaleString("pt-BR")} KM` : "--"}
                    </td>
                    <td className="px-5 py-4 font-black text-amber-700">
                      {group.avgTriggerHourmeter > 0 ? `${group.avgTriggerHourmeter} HRS` : "--"}
                    </td>
                    <td className="px-5 py-4 font-black text-emerald-700">
                      {group.avgTriggerTemporalMonths > 0 ? `${group.avgTriggerTemporalMonths} meses` : "--"}
                    </td>
                    <td className="px-5 py-4 font-semibold">{group.totalPieces}</td>
                    <td className="px-5 py-4 text-slate-500">
                      {group.latestCreatedAt
                        ? new Date(group.latestCreatedAt).toLocaleString("pt-BR")
                        : "-"}
                    </td>
                  </tr>
                ))}

                {groups.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-center text-sm text-slate-500">
                      Nenhum cadastro preventivo encontrado no navegador. Salve um plano em
                      `Cadastro de Itens de Preventiva` para aparecer aqui.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </WebShell>
  );
}

