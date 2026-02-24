"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { WebShell } from "@/components/layout/web-shell";
import { translations } from "@/lib/i18n";
import {
  getMaintenanceEvents,
  MaintenanceEvent,
  MaintenanceType,
  saveMaintenanceEvents,
  subscribeMaintenanceEvents,
} from "@/lib/maintenance-store";
import { getSchedulingResponsibleSession } from "@/lib/scheduling-responsible-store";

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

const weekDays = [
  translations.sunday,
  translations.monday,
  translations.tuesday,
  translations.wednesday,
  translations.thursday,
  translations.friday,
  translations.saturday,
];

const typeColors: Record<
  MaintenanceType,
  { bg: string; border: string; text: string; label: string }
> = {
  preventive: {
    bg: "bg-blue-50",
    border: "border-l-blue-500",
    text: "text-blue-700",
    label: "Preventiva",
  },
};

const timeSlots = ["07:30", "09:00", "10:30", "13:00", "14:30", "16:00"];
const MAX_ORDERS_PER_SLOT = 2;

const defaultAssets = [
  "Toyota Hilux SRX - ABC-1234",
  "Volvo FH 540 - XYZ-9876",
  "Sea Ray 250 - MAR-005",
  "Honda CB 500X - MOT-2024",
];

const getDayStart = (year: number, month: number, day: number) =>
  new Date(year, month, day, 0, 0, 0, 0);

const getTodayStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

const getEventDayStart = (event: MaintenanceEvent) =>
  getDayStart(event.year, event.month, event.day);

export default function WebCalendarPage() {
  const searchParams = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<MaintenanceEvent | null>(null);
  const [modalReadOnly, setModalReadOnly] = useState(false);
  const [draggedEvent, setDraggedEvent] = useState<MaintenanceEvent | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [formAsset, setFormAsset] = useState("");
  const [formType] = useState<MaintenanceType>("preventive");
  const [formDescription, setFormDescription] = useState("");
  const [formTime, setFormTime] = useState("07:30");
  const [formJustification, setFormJustification] = useState("");

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

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const todayStart = getTodayStart();

  const isPastDay = (day: number) =>
    getDayStart(currentYear, currentMonth, day).getTime() < todayStart.getTime();

  const isTodayDay = (day: number) =>
    getDayStart(currentYear, currentMonth, day).getTime() === todayStart.getTime();

  const getEventIsPast = (event: MaintenanceEvent) =>
    getEventDayStart(event).getTime() < todayStart.getTime();

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i += 1) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i += 1) calendarDays.push(i);

  const selectableAssets = useMemo(() => {
    const dynamic = events.map((event) => event.asset);
    return [...new Set([...defaultAssets, ...dynamic])];
  }, [events]);

  const goToPreviousMonth = () =>
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));

  const goToNextMonth = () =>
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));

  const resetForm = () => {
    setFormAsset("");
    setFormDescription("");
    setFormTime("07:30");
    setFormJustification("");
  };

  const getEventsForDay = (day: number) => {
    return events
      .filter(
        (event) =>
          event.day === day &&
          event.month === currentMonth &&
          event.year === currentYear,
      )
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  const handleDayClick = (day: number | null) => {
    if (!day) return;

    if (isPastDay(day)) {
      return;
    }

    setSelectedDate(day);
    setSelectedEvent(null);
    setModalReadOnly(false);
    resetForm();
    setShowModal(true);
  };

  const handleEventClick = (event: MaintenanceEvent, clickEvent: React.MouseEvent) => {
    clickEvent.stopPropagation();
    const readOnly = getEventIsPast(event) && event.status === "completed";

    setSelectedEvent(event);
    setSelectedDate(event.day);
    setFormAsset(event.asset);
    setFormDescription(event.description);
    setFormTime(event.time);
    setFormJustification("");
    setModalReadOnly(readOnly);
    setShowModal(true);
  };

  const getOrdersInSlot = (day: number, time: string, excludeEventId?: string) => {
    return events.filter((event) => {
      const sameDay =
        event.day === day &&
        event.month === currentMonth &&
        event.year === currentYear;
      const sameTime = event.time === time;
      const notExcluded = !excludeEventId || event.id !== excludeEventId;
      return sameDay && sameTime && notExcluded;
    }).length;
  };

  const validateSlotCapacity = (
    day: number,
    time: string,
    excludeEventId?: string,
  ) => {
    return getOrdersInSlot(day, time, excludeEventId) < MAX_ORDERS_PER_SLOT;
  };

  const handleCreateOrder = () => {
    if (!formAsset || !selectedDate) {
      alert("Preencha os campos obrigatorios");
      return;
    }

    if (isPastDay(selectedDate)) {
      alert("Datas passadas estao bloqueadas para edicao.");
      return;
    }

    if (!validateSlotCapacity(selectedDate, formTime)) {
      alert("Este horario ja atingiu o limite de 2 agendamentos para o dia.");
      return;
    }

    const schedulerSession = getSchedulingResponsibleSession();
    const newEvent: MaintenanceEvent = {
      id: crypto.randomUUID(),
      day: selectedDate,
      month: currentMonth,
      year: currentYear,
      type: formType,
      title: "Manutencao Preventiva",
      asset: formAsset,
      time: formTime,
      description: formDescription,
      technician: "Definido no checklist",
      schedulerName: schedulerSession?.name ?? "Nao informado",
      schedulerMatricula: schedulerSession?.matricula ?? null,
      status: "scheduled",
      completedAt: null,
    };

    updateEvents((current) => [...current, newEvent]);
    setShowModal(false);
    resetForm();
  };

  const handleUpdateEvent = () => {
    if (!selectedEvent || !formAsset || !selectedDate) {
      alert("Preencha os campos obrigatorios");
      return;
    }

    const selectedEventIsPast = getEventIsPast(selectedEvent);
    const isCompleted = selectedEvent.status === "completed";

    // Regras:
    // - passado + finalizado => bloqueado
    // - passado + nao finalizado => pode reagendar com justificativa
    // - criar/editar para uma nova data passada => bloqueado
    if (modalReadOnly || isCompleted || (isPastDay(selectedDate) && !selectedEventIsPast)) {
      alert("Edicao bloqueada para registros finalizados ou reagendamento para datas passadas.");
      return;
    }

    if (!validateSlotCapacity(selectedDate, formTime, selectedEvent.id)) {
      alert("Este horario ja atingiu o limite de 2 agendamentos para o dia.");
      return;
    }

    const selectedEventStart = getEventDayStart(selectedEvent).getTime();
    const selectedEventNeedsJustificationWindow = selectedEventStart <= todayStart.getTime();
    const isRescheduling =
      selectedEvent.day !== selectedDate ||
      selectedEvent.month !== currentMonth ||
      selectedEvent.year !== currentYear ||
      selectedEvent.time !== formTime;

    if (selectedEventNeedsJustificationWindow && isRescheduling && !formJustification.trim()) {
      alert("Preencha a JUSTIFICATIVA para reagendar agendamento atual/passado nao finalizado.");
      return;
    }

    const nextDescription =
      selectedEventNeedsJustificationWindow && isRescheduling && formJustification.trim()
        ? `${formDescription.trim()}${formDescription.trim() ? "\n\n" : ""}[JUSTIFICATIVA REAGENDAMENTO ${new Date().toLocaleString("pt-BR")}]\n${formJustification.trim()}`
        : formDescription;

    updateEvents((current) =>
      current.map((event) =>
        event.id === selectedEvent.id
          ? {
              ...event,
              asset: formAsset,
              type: formType,
              title: "Manutencao Preventiva",
              description: nextDescription,
              technician: "Definido no checklist",
              time: formTime,
              day: selectedDate,
              month: currentMonth,
              year: currentYear,
              completedAt: event.status === "completed" ? event.completedAt : null,
            }
          : event,
      ),
    );

    setShowModal(false);
    setSelectedEvent(null);
    resetForm();
  };

  const handleUpdateStatus = (
    eventId: string,
    newStatus: "scheduled" | "in_progress" | "completed",
  ) => {
    const target = events.find((event) => event.id === eventId);
    if (!target || getEventIsPast(target)) {
      alert("Datas passadas estao bloqueadas para edicao.");
      return;
    }

    updateEvents((current) =>
      current.map((event) =>
        event.id === eventId
          ? {
              ...event,
              status: newStatus,
              completedAt:
                newStatus === "completed"
                  ? event.completedAt ?? new Date().toISOString()
                  : null,
            }
          : event,
      ),
    );
  };

  const handleDeleteEvent = (eventId: string) => {
    const target = events.find((event) => event.id === eventId);
    if (!target || getEventIsPast(target)) {
      alert("Datas passadas estao bloqueadas para edicao.");
      return;
    }

    updateEvents((current) => current.filter((event) => event.id !== eventId));
    setSelectedEvent(null);
    setShowModal(false);
  };

  const handleDragStart = (event: MaintenanceEvent, dragEvent: React.DragEvent) => {
    if (getEventIsPast(event)) {
      dragEvent.preventDefault();
      return;
    }

    setDraggedEvent(event);
    dragEvent.dataTransfer.effectAllowed = "move";
    dragEvent.dataTransfer.setData("text/plain", event.id);
  };

  const handleDragOver = (day: number, dragEvent: React.DragEvent) => {
    dragEvent.preventDefault();
    if (isPastDay(day)) return;
    setDragOverDay(day);
  };

  const handleDragLeave = () => {
    setDragOverDay(null);
  };

  const handleDrop = (day: number, dragEvent: React.DragEvent) => {
    dragEvent.preventDefault();
    if (!draggedEvent) return;

    if (isPastDay(day)) {
      alert("Datas passadas estao bloqueadas para edicao.");
      setDraggedEvent(null);
      setDragOverDay(null);
      return;
    }

    if (!validateSlotCapacity(day, draggedEvent.time, draggedEvent.id)) {
      alert("Nao e possivel mover: horario com limite de 2 agendamentos no dia.");
      setDraggedEvent(null);
      setDragOverDay(null);
      return;
    }

    updateEvents((current) =>
      current.map((event) =>
        event.id === draggedEvent.id
          ? { ...event, day, month: currentMonth, year: currentYear }
          : event,
      ),
    );

    setDraggedEvent(null);
    setDragOverDay(null);
  };

  const handleDragEnd = () => {
    setDraggedEvent(null);
    setDragOverDay(null);
  };

  const openNewOrderModal = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now.getDate());
    setSelectedEvent(null);
    setModalReadOnly(false);
    resetForm();
    setShowModal(true);
  };

  useEffect(() => {
    const eventId = searchParams.get("eventId");
    if (!eventId || events.length === 0) return;

    const target = events.find((event) => event.id === eventId);
    if (!target) return;

    setCurrentDate(new Date(target.year, target.month, 1));
    setSelectedDate(target.day);
    setSelectedEvent(target);
    setFormAsset(target.asset);
    setFormDescription(target.description);
    setFormTime(target.time);
    setFormJustification("");
    setModalReadOnly(getEventIsPast(target) && target.status === "completed");
    setShowModal(true);
  }, [events, searchParams, todayStart]);

  const selectedEventIsTodayOrPastNotCompleted =
    !!selectedEvent &&
    getEventDayStart(selectedEvent).getTime() <= todayStart.getTime() &&
    selectedEvent.status !== "completed";
  const isReschedulingSelection =
    !!selectedEvent &&
    !!selectedDate &&
    (selectedEvent.day !== selectedDate ||
      selectedEvent.month !== currentMonth ||
      selectedEvent.year !== currentYear ||
      selectedEvent.time !== formTime);

  return (
    <WebShell
      title={translations.fleetMaintenanceCalendar}
      subtitle={`${months[currentMonth]} ${currentYear}`}
    >
      <div className="space-y-4">
        <div className="card p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={goToPreviousMonth}
                className="rounded-xl border border-slate-200 p-2 hover:bg-slate-100"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-2xl font-black">
                {months[currentMonth]} {currentYear}
              </h3>
              <button
                onClick={goToNextMonth}
                className="rounded-xl border border-slate-200 p-2 hover:bg-slate-100"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <button
              onClick={openNewOrderModal}
              className="rounded-xl bg-[var(--color-brand)] px-4 py-2 text-sm font-black"
            >
              {translations.newMaintenanceOrder}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            {Object.entries(typeColors).map(([type, colors]) => (
              <div key={type} className="flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded ${colors.bg
                    .replace("bg-", "bg-")
                    .replace("-50", "-500")}`}
                />
                <span>{colors.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-emerald-500" />
              <span>Hoje</span>
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            <span className="font-semibold">Horarios disponiveis:</span> 07:30, 09:00, 10:30, 13:00, 14:30, 16:00
            (max. 2 O.S. por horario/dia)
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            Datas passadas bloqueadas para edicao (somente consulta e visualizacao).
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            {weekDays.map((day) => (
              <div key={day} className="py-3">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const dayEvents = day ? getEventsForDay(day) : [];
              const isDragOver = dragOverDay === day;
              const dayIsPast = day ? isPastDay(day) : false;
              const dayIsToday = day ? isTodayDay(day) : false;

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(day)}
                  onDragOver={(event) => (day ? handleDragOver(day, event) : undefined)}
                  onDragLeave={handleDragLeave}
                  onDrop={(event) => (day ? handleDrop(day, event) : undefined)}
                  className={`min-h-[100px] border-b border-r border-slate-100 p-2 transition ${
                    day ? "cursor-pointer" : "cursor-default"
                  } ${
                    isDragOver ? "border-blue-500 bg-blue-50" : ""
                  } ${dayIsPast ? "bg-slate-50/80 text-slate-400" : "hover:bg-slate-50"} ${
                    dayIsToday ? "bg-emerald-50" : ""
                  }`}
                >
                  {day && (
                    <>
                      <p
                        className={`mb-1 text-sm font-bold ${
                          dayIsToday
                            ? "text-emerald-700"
                            : dayIsPast
                              ? "text-slate-400"
                              : "text-slate-500"
                        }`}
                      >
                        {day}
                        {dayIsToday ? " (Hoje)" : ""}
                      </p>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => {
                          const eventIsPast = getEventIsPast(event);
                          return (
                            <div
                              key={event.id}
                              draggable={!eventIsPast}
                              onDragStart={(dragEvent) => handleDragStart(event, dragEvent)}
                              onDragEnd={handleDragEnd}
                              onClick={(clickEvent) => handleEventClick(event, clickEvent)}
                              className={`truncate rounded border-l-2 ${typeColors[event.type].border} ${typeColors[event.type].bg} px-1 py-0.5 text-[10px] font-medium ${typeColors[event.type].text} ${
                                eventIsPast
                                  ? "cursor-default opacity-70"
                                  : "cursor-move hover:opacity-80"
                              }`}
                            >
                              <span className="font-bold">{event.time}</span> {event.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <p className="text-[10px] text-slate-400">+{dayEvents.length - 3} mais</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-black">
                {selectedEvent ? "Detalhes do Agendamento" : translations.createMaintenanceOrder}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedEvent(null);
                }}
                className="text-2xl text-slate-400 hover:text-slate-600"
              >
                x
              </button>
            </div>

            {modalReadOnly && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                Registro em data passada: visualizacao liberada, edicao bloqueada.
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  {translations.asset} *
                </label>
                <select
                  disabled={modalReadOnly}
                  value={formAsset}
                  onChange={(event) => setFormAsset(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  <option value="">Selecione um ativo...</option>
                  {selectableAssets.map((asset) => (
                    <option key={asset} value={asset}>
                      {asset}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Horario *</label>
                  <select
                    disabled={modalReadOnly}
                    value={formTime}
                    onChange={(event) => setFormTime(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-50"
                  >
                    <optgroup label="Manha">
                      {timeSlots
                        .filter((slot) => slot < "12:00")
                        .map((slot) => {
                          const isFull =
                            !!selectedDate &&
                            !validateSlotCapacity(selectedDate, slot, selectedEvent?.id);

                          return (
                            <option key={slot} value={slot} disabled={isFull}>
                              {slot}
                              {isFull ? " - Lotado" : ""}
                            </option>
                          );
                        })}
                    </optgroup>
                    <optgroup label="Tarde">
                      {timeSlots
                        .filter((slot) => slot >= "12:00")
                        .map((slot) => {
                          const isFull =
                            !!selectedDate &&
                            !validateSlotCapacity(selectedDate, slot, selectedEvent?.id);

                          return (
                            <option key={slot} value={slot} disabled={isFull}>
                              {slot}
                              {isFull ? " - Lotado" : ""}
                            </option>
                          );
                        })}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                    {translations.maintenanceType} *
                  </label>
                  <select
                    value={formType}
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                  >
                    <option value="preventive">Manutencao Preventiva</option>
                  </select>
                </div>
              </div>

              {selectedDate && !validateSlotCapacity(selectedDate, formTime, selectedEvent?.id) && (
                <p className="text-xs font-semibold text-red-600">
                  Horario sem vagas para este dia. Selecione outro horario.
                </p>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  Descricao (detalhes adicionais)
                </label>
                <textarea
                  disabled={modalReadOnly}
                  value={formDescription}
                  onChange={(event) => setFormDescription(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-50"
                  rows={2}
                  placeholder="Detalhes adicionais..."
                />
              </div>

              {selectedEvent && selectedEventIsTodayOrPastNotCompleted && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-blue-800">
                    JUSTIFICATIVA {isReschedulingSelection ? "*" : ""}
                  </label>
                  <textarea
                    disabled={modalReadOnly}
                    value={formJustification}
                    onChange={(event) => setFormJustification(event.target.value)}
                    className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-50"
                    rows={3}
                    placeholder="Descreva o motivo do reagendamento (ex.: indisponibilidade do veiculo, colaborador, peca, prioridade emergencial)."
                  />
                  <p className="mt-2 text-[11px] font-semibold text-blue-700">
                    Ao alterar data/horario em agendamento atual ou passado nao finalizado, a justificativa e obrigatoria.
                  </p>
                </div>
              )}

              {selectedEvent && (
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Status</label>
                  <select
                    disabled={modalReadOnly}
                    value={selectedEvent.status}
                    onChange={(event) =>
                      handleUpdateStatus(
                        selectedEvent.id,
                        event.target.value as "scheduled" | "in_progress" | "completed",
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-50"
                  >
                    <option value="scheduled">Agendado</option>
                    <option value="in_progress">Em andamento</option>
                    <option value="completed">Concluido</option>
                  </select>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                {selectedEvent && !modalReadOnly && (
                  <button
                    onClick={() => handleDeleteEvent(selectedEvent.id)}
                    className="flex-1 rounded-xl border border-red-200 py-3 text-sm font-black uppercase text-red-600"
                  >
                    {translations.delete}
                  </button>
                )}
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-black uppercase text-slate-600"
                >
                  {translations.cancel}
                </button>
                {!modalReadOnly && (
                  <button
                    onClick={selectedEvent ? handleUpdateEvent : handleCreateOrder}
                    className="flex-1 rounded-xl bg-[var(--color-brand)] py-3 text-sm font-black uppercase text-white"
                  >
                    {selectedEvent
                      ? isReschedulingSelection
                        ? "Salvar e Reagendar"
                        : "Salvar Alteracoes"
                      : translations.createOrder}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </WebShell>
  );
}
