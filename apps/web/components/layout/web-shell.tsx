"use client";

/**
 * RESPONSABILIDADE:
 * Layout principal do modulo Web (sidebar, header, protecao de rota e notificacoes).
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - Envolve as paginas `/web/*`.
 * - Le sessao no `auth-store` para proteger acesso.
 * - Consolida notificacoes a partir de `maintenance-store`.
 *
 * CONTRATO BACKEND: sessao e notificacoes hoje sao locais; em integracao real, este shell
 * deve consumir `/auth/me` e `/notifications`, mantendo aqui apenas estado de UI.
 */

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { TruckIcon } from "@/components/ui/icons";
import { translations } from "@/lib/i18n";
import { getAuthSession, subscribeAuthSession } from "@/lib/auth-store";
import {
  getEffectiveMaintenanceStatus,
  getMaintenanceEvents,
  subscribeMaintenanceEvents,
} from "@/lib/maintenance-store";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

type NotificationItem = {
  id: string;
  eventId: string;
  label: string;
  type: "urgent" | "today" | "warning";
};

type ThemeMode = "light" | "dark" | "auto";

export function WebShell({ title, subtitle, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const SIDEBAR_COLLAPSED_KEY = "frota-pro:web-sidebar-collapsed";
  const THEME_MODE_KEY = "frota-pro:theme-mode";
  // Persistencia da sidebar lida de forma sincrona para evitar "abrir/fechar" ao navegar.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([]);
  const [authSession, setAuthSession] = useState(getAuthSession());
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "auto";
    const stored = window.localStorage.getItem(THEME_MODE_KEY);
    return stored === "light" || stored === "dark" || stored === "auto" ? stored : "auto";
  });

  const menuItems = [
    { href: "/web/dashboard", label: translations.dashboard, shortLabel: "Dashboard", icon: "\u{1F3E0}" },
    { href: "/web/assets", label: translations.assetManagement, shortLabel: "Gestao", icon: "\u{1F697}" },
    { href: "/web/maintenance", label: translations.workOrders, shortLabel: "Ordens", icon: "\u{1F6E0}" },
    { href: "/web/calendar", label: translations.calendar, shortLabel: "Calendario", icon: "\u{1F4C5}" },
    { href: "/web/preventive-items", label: translations.preventiveItemsRegister, shortLabel: "Cadastro", icon: "PM" },
    { href: "/web/users", label: "Usuarios de Acesso", shortLabel: "Usuarios", icon: "US" },
  ];
  const currentMenuItem = menuItems.find((item) => pathname === item.href);

  const persistSidebarCollapsed = (next: boolean) => {
    setSidebarCollapsed(next);
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
    } catch {
      // Ignora falha de storage e mantem estado em memoria.
    }
  };

  const persistThemeMode = (next: ThemeMode) => {
    setThemeMode(next);
    try {
      window.localStorage.setItem(THEME_MODE_KEY, next);
    } catch {
      // Mantem estado em memoria se storage falhar.
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const resolved = themeMode === "auto" ? (media.matches ? "dark" : "light") : themeMode;
      root.dataset.theme = resolved;
      root.style.colorScheme = resolved;
    };

    applyTheme();
    media.addEventListener?.("change", applyTheme);
    return () => media.removeEventListener?.("change", applyTheme);
  }, [themeMode]);

  useEffect(() => {
    const refresh = () => setAuthSession(getAuthSession());
    refresh();
    return subscribeAuthSession(refresh);
  }, []);

  useEffect(() => {
    if (!authSession) {
      router.replace("/");
    }
  }, [authSession, router]);

  useEffect(() => {
    const refreshNotifications = () => {
      // Regra de negocio: notificacoes priorizam itens acionaveis (atraso/no-show/tolerancia/hoje).
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const items = getMaintenanceEvents().reduce<NotificationItem[]>((acc, event) => {
          const eventDate = new Date(event.year, event.month, event.day).getTime();
          const effectiveStatus = getEffectiveMaintenanceStatus(event, now);
          const label = `${event.asset} - ${event.time}`;

          if (effectiveStatus === "no_show") {
            acc.push({
              id: `no-show-${event.id}`,
              eventId: event.id,
              label: `Nao Compareceu: ${label}`,
              type: "urgent",
            });
            return acc;
          }

          if (effectiveStatus === "tolerance") {
            acc.push({
              id: `tolerance-${event.id}`,
              eventId: event.id,
              label: `Em tolerancia (15 min): ${label}`,
              type: "warning",
            });
            return acc;
          }

          if (effectiveStatus !== "completed" && eventDate < todayStart) {
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
        style={{ gridTemplateColumns: sidebarCollapsed ? "84px 1fr" : "252px 1fr" }}
      >
        <aside className="flex flex-col border-r border-[var(--color-border)] bg-[linear-gradient(180deg,var(--color-panel-soft),#eef3fa)]">
          <div className="p-4">
            <div className="mb-6">
              <div
                className={`mb-3 flex items-center ${
                  sidebarCollapsed ? "justify-center" : "justify-between gap-3"
                }`}
              >
                <div
                  className={`${
                    sidebarCollapsed ? "h-12 w-12 rounded-full" : "h-14 w-14 rounded-full"
                  } relative overflow-hidden border border-white/60 bg-[#122b6e] shadow-[0_12px_30px_rgba(19,127,236,0.22)]`}
                >
                  <Image
                    src="/norte-tech-jf.svg"
                    alt="Norte Tech"
                    fill
                    className="object-contain p-1.5"
                    priority
                  />
                </div>
                {!sidebarCollapsed && (
                  <button
                    type="button"
                    onClick={() => persistSidebarCollapsed(true)}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--color-border)] bg-white/90 text-slate-500 hover:text-slate-700"
                    aria-label="Recolher menu lateral"
                    title="Recolher menu"
                  >
                    {"<"}
                  </button>
                )}
              </div>

              {!sidebarCollapsed ? (
                <>
                  <div className="rounded-2xl border border-white/80 bg-white/70 p-3 backdrop-blur">
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-700">Agendamento de Preventiva</p>
                    <div className="mt-3 h-1 w-16 rounded-full bg-[var(--color-brand)]/55"></div>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => persistSidebarCollapsed(false)}
                  className="mx-auto grid h-9 w-9 place-items-center rounded-xl border border-[var(--color-border)] bg-white/90 text-slate-500 hover:text-slate-700"
                  aria-label="Expandir menu lateral"
                  title="Expandir menu"
                >
                  {">"}
                </button>
              )}
            </div>

            {!sidebarCollapsed && (
              <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Menu</p>
            )}
            <nav className="space-y-2">
              {menuItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative flex h-11 items-center rounded-xl ${
                      sidebarCollapsed ? "justify-center px-2" : "gap-3 px-3"
                    } text-[12px] font-black uppercase tracking-[0.06em] transition ${
                      active
                        ? "border border-blue-200 bg-white text-[var(--color-brand-ink)] shadow-sm"
                        : "border border-transparent text-slate-500 hover:border-white/80 hover:bg-white/80"
                    }`}
                    title={item.label}
                  >
                    {!sidebarCollapsed && (
                      <span
                        aria-hidden="true"
                        className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full transition ${
                          active ? "bg-[var(--color-brand)]" : "bg-transparent group-hover:bg-blue-100"
                        }`}
                      />
                    )}
                    {sidebarCollapsed && (
                      // Icones ilustrativos aparecem apenas no modo recolhido.
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-md text-sm ${
                          active ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-ink)]" : "bg-slate-200 text-slate-600"
                        }`}
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                    )}
                    {!sidebarCollapsed && (
                      <>
                        <span
                          className={`grid h-7 w-7 place-items-center rounded-lg text-[11px] ${
                            active ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-ink)]" : "bg-slate-100 text-slate-500"
                          }`}
                          aria-hidden="true"
                        >
                          {item.icon}
                        </span>
                        <span className="min-w-0 flex-1 truncate whitespace-nowrap">{item.shortLabel}</span>
                      </>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

        </aside>

        <main>
          <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">
            <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 md:px-7">
              <div className="flex min-w-0 items-center gap-3 md:gap-4">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-ink)]"
                >
                  <TruckIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">{translations.backToStart}</span>
                  <span className="sm:hidden">Voltar</span>
                </Link>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    <span>Web</span>
                    <span>/</span>
                    <span className="truncate">{currentMenuItem?.shortLabel ?? "Modulo"}</span>
                  </div>
                  <div className="mt-0.5 flex min-w-0 items-center gap-2">
                    <h1 className="truncate text-sm font-black text-slate-800 md:text-base">
                      {title || currentMenuItem?.label || "Painel"}
                    </h1>
                    {subtitle && (
                      <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 lg:inline">
                        {subtitle}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="relative flex items-center gap-2 text-right md:gap-3">
                <button
                  type="button"
                  onClick={() =>
                    persistThemeMode(themeMode === "auto" ? "dark" : themeMode === "dark" ? "light" : "auto")
                  }
                  className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-ink)]"
                  title={
                    themeMode === "auto"
                      ? "Tema automatico (navegador)"
                      : themeMode === "dark"
                        ? "Tema escuro"
                        : "Tema claro"
                  }
                >
                  {themeMode === "auto" ? "Auto" : themeMode === "dark" ? "Escuro" : "Claro"}
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((current) => !current)}
                  className="relative inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-ink)]"
                  title="Notificacoes"
                >
                  <span className="hidden sm:inline">Notificacoes</span>
                  <span className="sm:hidden">Avisos</span>
                  {notificationCount > 0 && (
                    <span className="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                  )}
                </button>

                <div className="hidden h-8 w-px bg-[var(--color-border)] md:block"></div>
                <div className="hidden md:block">
                  <p className="text-xs font-black">{authSession?.name || "Visitante"}</p>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400">
                    {authSession?.role || "Nao autenticado"}
                  </p>
                </div>

                {notificationsOpen && (
                  <div className="absolute right-0 top-12 z-30 w-[360px] max-w-[90vw] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
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
                                  item.type === "urgent"
                                    ? "bg-red-500"
                                    : item.type === "warning"
                                      ? "bg-amber-500"
                                      : "bg-blue-500"
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
            </div>
          </header>

          <section className="p-3 md:p-5 lg:p-6">{children}</section>
        </main>
      </div>
    </div>
  );
}


