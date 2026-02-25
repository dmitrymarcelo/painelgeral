"use client";

import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/layout/mobile-shell";
import {
  getMaintenanceEvents,
  getMaintenanceOperationalStatus,
  MaintenanceEvent,
  subscribeMaintenanceEvents,
} from "@/lib/maintenance-store";
import { translations } from "@/lib/i18n";

type AssetCardRow = {
  id: string;
  model: string;
  plate: string;
  vehicleType: string;
  centerCost: string;
  status: "VENCIDA" | "A_VENCER" | "ATENCAO" | "CONFORME";
  nextService: string;
  totalEvents: number;
};

const parseAssetLabel = (label: string) => {
  const parts = label.split(" - ").map((part) => part.trim());
  if (parts.length >= 2) {
    return { model: parts.slice(0, -1).join(" - "), plate: parts[parts.length - 1] };
  }
  return { model: label, plate: label };
};

const inferVehicleType = (asset: string) => {
  const normalized = asset.toLowerCase();
  if (normalized.includes("volvo") || normalized.includes("fh")) return "Caminhao";
  if (normalized.includes("hilux") || normalized.includes("toyota")) return "Utilitario";
  if (normalized.includes("honda") || normalized.includes("moto")) return "Motocicleta";
  if (normalized.includes("sea ray") || normalized.includes("lancha") || normalized.includes("mar-")) {
    return "Embarcacao";
  }
  return "Veiculo";
};

const inferCenterCost = (asset: string) => {
  const normalized = asset.toLowerCase();
  if (normalized.includes("mar") || normalized.includes("sea ray")) return "Nautica";
  if (normalized.includes("volvo")) return "Logistica";
  if (normalized.includes("hilux")) return "Operacoes Campo";
  return "Suporte";
};

const formatEventDate = (event: MaintenanceEvent) =>
  `${String(event.day).padStart(2, "0")}/${String(event.month + 1).padStart(2, "0")} ${event.time}`;

export default function MobileAssetsPage() {
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const refresh = () => setEvents(getMaintenanceEvents());
    refresh();
    return subscribeMaintenanceEvents(refresh);
  }, []);

  const rows = useMemo<AssetCardRow[]>(() => {
    const grouped = new Map<string, MaintenanceEvent[]>();

    for (const event of events) {
      const parsed = parseAssetLabel(event.asset);
      const key = parsed.plate;
      const current = grouped.get(key) ?? [];
      current.push(event);
      grouped.set(key, current);
    }

    return [...grouped.entries()]
      .map(([plate, assetEvents]) => {
        const sortedByDate = [...assetEvents].sort((a, b) => {
          const ad = new Date(a.year, a.month, a.day, ...a.time.split(":").map(Number)).getTime();
          const bd = new Date(b.year, b.month, b.day, ...b.time.split(":").map(Number)).getTime();
          return ad - bd;
        });
        const first = sortedByDate[0];
        const parsed = parseAssetLabel(first.asset);
        const worstStatus = [...assetEvents]
          .map((event) => getMaintenanceOperationalStatus(event))
          .sort((a, b) => {
            const rank = (status: string) =>
              status === "VENCIDA" ? 0 : status === "A_VENCER" ? 1 : status === "ATENCAO" ? 2 : 3;
            return rank(a) - rank(b);
          })[0] as AssetCardRow["status"];

        const nextScheduled = sortedByDate.find((event) => event.status !== "completed") ?? sortedByDate.at(-1)!;

        return {
          id: plate,
          model: parsed.model,
          plate,
          vehicleType: inferVehicleType(first.asset),
          centerCost: inferCenterCost(first.asset),
          status: worstStatus,
          nextService: nextScheduled ? formatEventDate(nextScheduled) : "-",
          totalEvents: assetEvents.length,
        };
      })
      .sort((a, b) => a.model.localeCompare(b.model));
  }, [events]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      `${row.model} ${row.plate} ${row.vehicleType} ${row.centerCost}`.toLowerCase().includes(needle),
    );
  }, [rows, search]);

  const summary = useMemo(() => {
    return {
      total: filteredRows.length,
      overdue: filteredRows.filter((row) => row.status === "VENCIDA").length,
      dueSoon: filteredRows.filter((row) => row.status === "A_VENCER").length,
      compliant: filteredRows.filter((row) => row.status === "CONFORME").length,
    };
  }, [filteredRows]);

  return (
    <MobileShell title={translations.assetManagement} freeScroll>
      <div className="space-y-3 pb-24">
        <div className="grid grid-cols-2 gap-3">
          <div className="card border-l-4 border-l-slate-400 bg-gradient-to-b from-white to-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Ativos</p>
            <p className="text-4xl font-black text-slate-900">{summary.total}</p>
            <p className="text-[10px] text-slate-500">Filtrados</p>
          </div>
          <div className="card border-l-4 border-l-red-500 bg-gradient-to-b from-white to-rose-50/30 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-red-700">Vencidas</p>
            <p className="text-4xl font-black text-red-700">{summary.overdue}</p>
            <p className="text-[10px] text-slate-500">Prioridade critica</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="card border-l-4 border-l-amber-500 bg-gradient-to-b from-white to-amber-50/30 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">A vencer</p>
            <p className="text-4xl font-black text-amber-700">{summary.dueSoon}</p>
            <p className="text-[10px] text-slate-500">Planejamento</p>
          </div>
          <div className="card border-l-4 border-l-emerald-500 bg-gradient-to-b from-white to-emerald-50/30 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">Conforme</p>
            <p className="text-4xl font-black text-emerald-700">{summary.compliant}</p>
            <p className="text-[10px] text-slate-500">Em dia</p>
          </div>
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Central de Filtros</p>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">
              {filteredRows.length}
            </span>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Buscar por placa, modelo, tipo ou centro..."
          />
        </div>

        <div className="space-y-2">
          {filteredRows.map((row) => (
            <div key={row.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-slate-900">{row.model}</p>
                  <p className="text-xs font-mono text-slate-500">{row.plate}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                    row.status === "VENCIDA"
                      ? "bg-red-100 text-red-700"
                      : row.status === "A_VENCER"
                        ? "bg-amber-100 text-amber-700"
                        : row.status === "ATENCAO"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {row.status === "VENCIDA"
                    ? translations.overdueStatus
                    : row.status === "A_VENCER"
                      ? translations.nearDueStatus
                      : row.status === "ATENCAO"
                        ? translations.attention
                        : translations.compliant}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-slate-500">Tipo</p>
                  <p className="font-bold text-slate-900">{row.vehicleType}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-slate-500">Centro</p>
                  <p className="font-bold text-slate-900">{row.centerCost}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-slate-500">Prox. preventiva</p>
                  <p className="font-bold text-slate-900">{row.nextService}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-slate-500">Historico</p>
                  <p className="font-bold text-slate-900">{row.totalEvents} registro(s)</p>
                </div>
              </div>
            </div>
          ))}
          {filteredRows.length === 0 && (
            <div className="card p-4 text-sm text-slate-500">Nenhum ativo encontrado com o filtro informado.</div>
          )}
        </div>
      </div>
    </MobileShell>
  );
}

