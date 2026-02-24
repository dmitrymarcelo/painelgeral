"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { CarIcon, TruckIcon } from "@/components/ui/icons";
import { translations } from "@/lib/i18n";
import { getMaintenanceEvents, subscribeMaintenanceEvents } from "@/lib/maintenance-store";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

type NotificationItem = {
  id: string;
  eventId: string;
  label: string;
  type: "urgent" | "today";
};

export function WebShell({ title, subtitle, children }: Props) {
  const pathname = usePathname();
  // Estado visual local da sidebar (nao persiste entre reloads).
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([]);

  const menuItems = [
    { href: "/web/dashboard", label: translations.dashboard, icon: "🏠" },
    { href: "/web/assets", label: translations.assetManagement, icon: "🚗" },
    { href: "/web/maintenance", label: translations.workOrders, icon: "🛠" },
    { href: "/web/calendar", label: translations.calendar, icon: "📅" },
  ];

  useEffect(() => {
    const refreshNotifications = () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const items = getMaintenanceEvents().reduce<NotificationItem[]>((acc, event) => {
          const eventDate = new Date(event.year, event.month, event.day).getTime();
          const label = `${event.asset} - ${event.time}`;

          if (event.status !== "completed" && eventDate < todayStart) {
            acc.push({ id: `late-${event.id}`, eventId: event.id, label: `Atrasado: ${label}`, type: "urgent" });
            return acc;
          }

          if (eventDate === todayStart) {
            acc.push({ id: `today-${event.id}`, eventId: event.id, label: `Hoje: ${label}`, type: "today" });
            return acc;
          }

          return acc;
        }, [])
        .slice(0, 8);

      setNotificationItems(items);
    };

    refreshNotifications();
    return subscribeMaintenanceEvents(refreshNotifications);
  }, []);

  const notificationCount = notificationItems.length;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <div
        className="grid min-h-screen"
        style={{ gridTemplateColumns: sidebarCollapsed ? "76px 1fr" : "220px 1fr" }}
      >
        <aside className="flex flex-col border-r border-[var(--color-border)] bg-[#f3f6fa]">
          <div className="p-4">
            <div className="mb-6">
              <div className={`mb-3 flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between gap-3"}`}>
                <div className={`grid place-items-center rounded-full border-2 border-[#ffd84c] bg-[#123a7d] text-white shadow-md ${sidebarCollapsed ? "h-12 w-12" : "h-[56px] w-[56px]"}`}>
                  <CarIcon className={sidebarCollapsed ? "h-5 w-5" : "h-6 w-6"} />
                </div>
                {!sidebarCollapsed && (
                  <button
                    type="button"
                    onClick={() => setSidebarCollapsed(true)}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--color-border)] bg-white text-slate-500 hover:text-slate-700"
                    aria-label="Recolher menu lateral"
                    title="Recolher menu"
                  >
                    ‹
                  </button>
                )}
              </div>

              {!sidebarCollapsed ? (
                <>
                  <p className="text-center text-[10px] font-black uppercase tracking-[0.35em] text-slate-600">Frota Pro</p>
                  <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-[var(--color-brand)]/50"></div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(false)}
                  className="mx-auto grid h-9 w-9 place-items-center rounded-xl border border-[var(--color-border)] bg-white text-slate-500 hover:text-slate-700"
                  aria-label="Expandir menu lateral"
                  title="Expandir menu"
                >
                  ›
                </button>
              )}
            </div>

            <nav className="space-y-2">
              {menuItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex h-11 items-center rounded-xl ${sidebarCollapsed ? "justify-center px-2" : "gap-3 px-3"} text-[12px] font-black uppercase tracking-[0.08em] transition ${
                      active
                        ? "bg-[var(--color-brand)] text-white shadow-lg shadow-blue-200"
                        : "text-slate-500 hover:bg-white"
                    }`}
                    title={item.label}
                  >
                    {sidebarCollapsed && (
                      // Icones ilustrativos aparecem apenas no modo recolhido.
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-md text-sm ${
                          active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                        }`}
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                    )}
                    {!sidebarCollapsed && (
                      <span className="min-w-0 flex-1 truncate whitespace-nowrap">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto p-4">
            <button className={`rounded-2xl border border-[var(--color-border)] bg-white py-3 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 ${sidebarCollapsed ? "w-full px-2" : "w-full px-4"}`} title="Configuracoes">
              {sidebarCollapsed ? "Cfg" : "Configuracoes"}
            </button>
          </div>
        </aside>

        <main>
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-white px-8">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-ink)]"
              >
                <TruckIcon className="h-4 w-4" />
                {translations.backToStart}
              </Link>
              <h1 className="text-lg font-black tracking-tight">{title}</h1>
              <span className="rounded-full border border-[#bcd8fb] bg-[var(--color-brand-soft)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-brand-ink)]">
                {subtitle}
              </span>
            </div>

            <div className="relative flex items-center gap-4 text-right">
              <button
                type="button"
                onClick={() => setNotificationsOpen((current) => !current)}
                className="relative rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-ink)]"
                title="Notificacoes"
              >
                Notificacoes
                {notificationCount > 0 && (
                  <span className="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </span>
                )}
              </button>
              <button className="text-slate-400" title="Indicador">
                •
              </button>
              <div className="h-8 w-px bg-[var(--color-border)]"></div>
              <div>
                <p className="text-xs font-black">Administrador</p>
                <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Gestor de operacoes</p>
              </div>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-30 w-[360px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Notificacoes</p>
                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600"
                    >
                      fechar
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notificationItems.length === 0 ? (
                      <div className="px-4 py-5 text-sm text-slate-500">Sem notificacoes no momento.</div>
                    ) : (
                      notificationItems.map((item) => (
                        <Link
                          key={item.id}
                          href={`/web/calendar?eventId=${encodeURIComponent(item.eventId)}`}
                          onClick={() => setNotificationsOpen(false)}
                          className="block border-b border-slate-100 px-4 py-3 transition hover:bg-slate-50"
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className={`mt-1 inline-block h-2 w-2 rounded-full ${
                                item.type === "urgent" ? "bg-red-500" : "bg-blue-500"
                              }`}
                            />
                            <p className="text-sm leading-snug text-slate-700">{item.label}</p>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </header>

          <section className="p-5">{children}</section>
        </main>
      </div>
    </div>
  );
}
