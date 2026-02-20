"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { CarIcon, TruckIcon } from "@/components/ui/icons";
import { translations } from "@/lib/i18n";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function WebShell({ title, subtitle, children }: Props) {
  const pathname = usePathname();

  const menuItems = [
    { href: "/web/dashboard", label: translations.dashboard },
    { href: "/web/assets", label: translations.assetManagement },
    { href: "/web/maintenance", label: translations.workOrders },
    { href: "/web/checklist", label: translations.checklist },
    { href: "/web/calendar", label: translations.calendar },
    { href: "/web/technicians", label: "Tecnicos Responsaveis" },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <div className="grid min-h-screen grid-cols-[190px_1fr]">
        <aside className="flex flex-col border-r border-[var(--color-border)] bg-[#f3f6fa]">
          <div className="p-4">
            <div className="mb-6 grid place-items-center">
              <div className="grid h-[72px] w-[72px] place-items-center rounded-full border-2 border-[#ffd84c] bg-[#123a7d] text-white shadow-md">
                <CarIcon className="h-7 w-7" />
              </div>
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.35em] text-slate-600">Frota Pro</p>
              <div className="mt-2 h-1 w-16 rounded-full bg-[var(--color-brand)]/50"></div>
            </div>

            <nav className="space-y-2">
              {menuItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-xl px-4 py-3 text-[12px] font-black uppercase tracking-[0.12em] transition ${
                      active
                        ? "bg-[var(--color-brand)] text-white shadow-lg shadow-blue-200"
                        : "text-slate-500 hover:bg-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto p-4">
            <button className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
              Configuracoes
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
