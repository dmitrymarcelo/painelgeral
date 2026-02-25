"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/layout/mobile-shell";
import { apiRequest } from "@/lib/api-client";
import { queueOfflineAction } from "@/lib/offline-db";
import {
  getMaintenanceEvents,
  MaintenanceEvent,
  MaintenanceType,
  saveMaintenanceEvents,
  subscribeMaintenanceEvents,
} from "@/lib/maintenance-store";
import { getSchedulingResponsibleSession } from "@/lib/scheduling-responsible-store";

type OsForm = {
  assetId: string | null;
  asset: string;
  type: MaintenanceType;
  time: string;
  description: string;
};

type AssetOption = {
  id: string;
  code: string;
  plate: string | null;
  model: string;
};

const TENANT = "frota-pro";
const fallbackAssets: AssetOption[] = [
  { id: "fallback-1", code: "FRO-012", plate: "ABC-1234", model: "Toyota Hilux SRX" },
  { id: "fallback-2", code: "LOG-450", plate: "XYZ-9876", model: "Volvo FH 540" },
  { id: "fallback-3", code: "NAU-882", plate: "MAR-005", model: "Sea Ray 250" },
];

const months = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const timeSlots = ["07:30", "09:00", "10:30", "13:00", "14:30", "16:00"];
const MAX_ORDERS_PER_SLOT = 2;

const typeColors: Record<MaintenanceType, { bg: string; border: string; text: string; label: string }> = {
  preventive: { bg: "bg-blue-50", border: "border-l-blue-500", text: "text-blue-700", label: "Preventiva" },
};

export default function MobileAgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showNewOs, setShowNewOs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [allAssets, setAllAssets] = useState<AssetOption[]>([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [form, setForm] = useState<OsForm>({
    assetId: null,
    asset: "",
    type: "preventive",
    time: "07:30",
    description: "",
  });

  useEffect(() => {
    const refresh = () => setEvents(getMaintenanceEvents());
    refresh();
    return subscribeMaintenanceEvents(refresh);
  }, []);

  const updateEvents = (
    updater: MaintenanceEvent[] | ((current: MaintenanceEvent[]) => MaintenanceEvent[]),
  ) => {
    setEvents((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      saveMaintenanceEvents(next);
      return next;
    });
  };

  const loadAssets = async () => {
    setAssetLoading(true);
    try {
      const data = await apiRequest<AssetOption[]>("/assets", {
        method: "GET",
        tenantId: TENANT,
      });
      setAllAssets(data);
    } catch {
      setSyncMessage("API indisponivel no momento. Usando lista local de placas.");
      setAllAssets(fallbackAssets);
    } finally {
      setAssetLoading(false);
    }
  };

  useEffect(() => {
    if (!showNewOs) return;
    void loadAssets();
  }, [showNewOs]);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const targetFormDay = selectedDay ?? Math.min(new Date().getDate(), daysInMonth);

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i += 1) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i += 1) calendarDays.push(i);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDay(null);
  };

  const handleDayClick = (day: number | null) => {
    if (!day) return;
    setSelectedDay((prev) => (prev === day ? null : day));
  };

  const getEventsForDay = useCallback(
    (day: number) =>
      events.filter(
        (event) => event.day === day && event.month === currentMonth && event.year === currentYear,
      ),
    [events, currentMonth, currentYear],
  );

  const getOrdersInSlot = (day: number, time: string, excludeEventId?: string) => {
    return events.filter((event) => {
      const sameDay = event.day === day && event.month === currentMonth && event.year === currentYear;
      const sameTime = event.time === time;
      const notExcluded = !excludeEventId || event.id !== excludeEventId;
      return sameDay && sameTime && notExcluded;
    }).length;
  };

  const validateSlotCapacity = (day: number, time: string, excludeEventId?: string) => {
    return getOrdersInSlot(day, time, excludeEventId) < MAX_ORDERS_PER_SLOT;
  };

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return getEventsForDay(selectedDay).sort((a, b) => a.time.localeCompare(b.time));
  }, [getEventsForDay, selectedDay]);

  const visibleEvents = useMemo(() => {
    if (selectedDay) {
      return selectedDayEvents;
    }
    return events
      .filter((event) => event.month === currentMonth && event.year === currentYear)
      .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
  }, [events, selectedDay, selectedDayEvents, currentMonth, currentYear]);

  const selectableAssets = allAssets.length > 0 ? allAssets : fallbackAssets;

  const updateForm = <K extends keyof OsForm>(field: K, value: OsForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const createWorkOrder = async () => {
    const targetDay = targetFormDay;
    if (!form.asset || !targetDay) {
      setSyncMessage("Preencha os campos obrigatorios.");
      return;
    }

    if (!validateSlotCapacity(targetDay, form.time)) {
      setSyncMessage("Este horario ja atingiu o limite de 2 agendamentos para o dia.");
      return;
    }

    setSaving(true);
    setSyncMessage("");

    const eventDate = new Date(currentYear, currentMonth, targetDay);
    const schedulerSession = getSchedulingResponsibleSession();
    const dueAt = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, "0")}-${String(eventDate.getDate()).padStart(2, "0")}T${form.time}:00`;

    const newEvent: MaintenanceEvent = {
      id: crypto.randomUUID(),
      day: eventDate.getDate(),
      month: eventDate.getMonth(),
      year: eventDate.getFullYear(),
      type: form.type,
      title: "Manutencao Preventiva",
      asset: form.asset,
      time: form.time,
      description: form.description,
      technician: "Definido no checklist",
      schedulerName: schedulerSession?.name ?? "Nao informado",
      schedulerMatricula: schedulerSession?.matricula ?? null,
      status: "scheduled",
      completedAt: null,
    };

    updateEvents((current) => [...current, newEvent]);
    setCurrentDate(new Date(eventDate.getFullYear(), eventDate.getMonth(), 1));
    setSelectedDay(eventDate.getDate());
    setShowNewOs(false);

    const payload = {
      assetId: form.assetId,
      service: "Manutencao Preventiva",
      description: form.description || "Sem observacoes.",
      priority: "NORMAL",
      dueAt,
    };

    try {
      await apiRequest("/work-orders", {
        method: "POST",
        tenantId: TENANT,
        body: payload,
      });
      setSyncMessage("Nova OS criada e enviada para o backend.");
    } catch {
      await queueOfflineAction({
        endpoint: "/work-orders",
        method: "POST",
        tenantId: TENANT,
        payload,
      });
      setSyncMessage("Sem conexao: OS salva para sincronizacao.");
    } finally {
      setSaving(false);
      setForm({
        assetId: null,
        asset: "",
        type: "preventive",
        time: "07:30",
        description: "",
      });
    }
  };

  return (
    <MobileShell title="Agenda da Frota">
      <div className="space-y-3">
        <div className="card border-l-4 border-l-blue-500 bg-gradient-to-b from-white to-blue-50/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Calendario de Preventivas</p>
              <p className="text-xs text-slate-500">Selecione uma data e acompanhe a agenda do dia.</p>
            </div>
            <button
              onClick={() => {
                setShowNewOs(true);
                if (!selectedDay) {
                  setSelectedDay(Math.min(new Date().getDate(), daysInMonth));
                }
              }}
              className="rounded-xl bg-[var(--color-brand)] px-4 py-2 text-xs font-black uppercase text-white"
            >
              + Nova Ordem de Manutencao
            </button>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={goToPreviousMonth} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-100">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <p className="text-sm font-black">{months[currentMonth]} {currentYear}</p>
            <button onClick={goToNextMonth} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-100">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
            {weekDays.map((day) => (
              <div key={day} className="py-1">{day}</div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1 text-center text-xs font-bold">
            {calendarDays.map((day, idx) => {
              const dayEvents = day ? getEventsForDay(day) : [];
              const hasEvents = dayEvents.length > 0;
              const isSelected = selectedDay === day;
              return (
                <button
                  key={`${idx}-${day ?? "x"}`}
                  onClick={() => handleDayClick(day)}
                  disabled={!day}
                  className={`relative rounded-lg py-2 transition-all ${
                    !day
                      ? "invisible"
                      : isSelected
                        ? "bg-[var(--color-brand)] text-white scale-105"
                        : hasEvents
                          ? "bg-slate-200 text-slate-700"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {day}
                  {hasEvents && (
                    <div
                      className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                        isSelected ? "bg-[var(--color-ink)]" : "bg-red-500"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {selectedDay && (
          <div className="card border-l-4 border-[var(--color-brand)] bg-[var(--color-brand)]/10 p-3">
            <p className="text-xs font-bold text-slate-600">
              {selectedDay} de {months[currentMonth]} - {selectedDayEvents.length} servico(s)
            </p>
          </div>
        )}

        {syncMessage && (
          <div className="card border-l-4 border-l-emerald-500 bg-gradient-to-b from-white to-emerald-50/20 p-3">
            <p className="text-xs font-semibold text-slate-600">{syncMessage}</p>
          </div>
        )}

        <div className="space-y-2">
          {visibleEvents.map((event) => (
            <div
              key={event.id}
              className={`card border-l-4 p-3 ${typeColors[event.type].border} ${typeColors[event.type].bg}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">
                    {event.day}/{event.month + 1} - {event.time}
                  </p>
                  <p className={`font-bold ${typeColors[event.type].text}`}>{event.title}</p>
                  <p className="text-xs text-slate-600">{event.asset}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase ${
                    event.status === "completed"
                      ? "bg-emerald-100 text-emerald-700"
                      : event.status === "in_progress"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {event.status === "completed"
                    ? "Concluido"
                    : event.status === "in_progress"
                      ? "Em andamento"
                      : "Agendado"}
                </span>
              </div>
              {event.description && (
                <p className="mt-2 text-xs text-slate-500">{event.description}</p>
              )}
            </div>
          ))}

          {selectedDay && selectedDayEvents.length === 0 && (
            <div className="card p-4 text-center">
              <p className="text-sm text-slate-500">Nenhum servico agendado para este dia</p>
            </div>
          )}
        </div>
      </div>

      {showNewOs && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-[430px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-wide">Criar Ordem de Manutencao</p>
                <p className="text-xs text-slate-500">Preenchimento rapido para agenda mobile</p>
              </div>
              <button onClick={() => setShowNewOs(false)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold">
                Fechar
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Ativo *</label>
                <select
                  value={form.asset}
                  onFocus={() => {
                    if (allAssets.length === 0) void loadAssets();
                  }}
                  onChange={(event) => {
                    const next = event.target.value;
                    const selectedAsset = selectableAssets.find((asset) => {
                      const plateOrCode = asset.plate ?? asset.code;
                      return `${plateOrCode} - ${asset.model}` === next;
                    });
                    updateForm("asset", next);
                    updateForm("assetId", selectedAsset?.id ?? null);
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Selecione um ativo...</option>
                  {selectableAssets.map((asset) => {
                    const plateOrCode = asset.plate ?? asset.code;
                    const label = `${plateOrCode} - ${asset.model}`;
                    return (
                      <option key={asset.id} value={label}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                {assetLoading && <p className="mt-1 text-xs text-slate-500">Buscando ativos...</p>}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Horario *</label>
                  <select
                    value={form.time}
                    onChange={(event) => updateForm("time", event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <optgroup label="Manha">
                      {timeSlots.filter((slot) => slot < "12:00").map((slot) => {
                        const isFull = !validateSlotCapacity(targetFormDay, slot);
                        return (
                          <option key={slot} value={slot} disabled={isFull}>
                            {slot}{isFull ? " - Lotado" : ""}
                          </option>
                        );
                      })}
                    </optgroup>
                    <optgroup label="Tarde">
                      {timeSlots.filter((slot) => slot >= "12:00").map((slot) => {
                        const isFull = !validateSlotCapacity(targetFormDay, slot);
                        return (
                          <option key={slot} value={slot} disabled={isFull}>
                            {slot}{isFull ? " - Lotado" : ""}
                          </option>
                        );
                      })}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Tipo de Manutencao *</label>
                  <select
                    value={form.type}
                    disabled
                    className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                  >
                    <option value="preventive">Manutencao Preventiva</option>
                  </select>
                </div>
              </div>

              {!validateSlotCapacity(targetFormDay, form.time) && (
                <p className="text-xs font-semibold text-red-600">
                  Horario sem vagas para este dia. Selecione outro horario.
                </p>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Descricao (detalhes adicionais)</label>
                <textarea
                  value={form.description}
                  onChange={(event) => updateForm("description", event.target.value)}
                  placeholder="Detalhes adicionais..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
            </div>

            <button
              onClick={() => void createWorkOrder()}
              disabled={saving}
              className="mt-3 w-full rounded-xl bg-[var(--color-brand)] py-3 text-sm font-black uppercase text-white disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Criar Ordem"}
            </button>
          </div>
        </div>
      )}
    </MobileShell>
  );
}
