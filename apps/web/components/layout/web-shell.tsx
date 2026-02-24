"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { CarIcon, TruckIcon } from "@/components/ui/icons";
import { translations } from "@/lib/i18n";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function WebShell({ title, subtitle, children }: Props) {
  const pathname = usePathname();
  // Estado visual local da sidebar (nao persiste entre reloads).
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const menuItems = [
    { href: "/web/dashboard", label: translations.dashboard, icon: "🏠" },
    { href: "/web/assets", label: translations.assetManagement, icon: "🚗" },
    { href: "/web/maintenance", label: translations.workOrders, icon: "🛠" },
    { href: "/web/calendar", label: translations.calendar, icon: "📅" },
  ];

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

            <div className="flex items-center gap-4 text-right">
              <button className="text-slate-400">◌</button>
              <button className="text-slate-400">•</button>
              <div className="h-8 w-px bg-[var(--color-border)]"></div>
              <div>
                <p className="text-xs font-black">Administrador</p>
                <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Gestor de operacoes</p>
              </div>
            </div>
          </header>

          <section className="p-5">{children}</section>
        </main>
      </div>
    </div>
  );
}
