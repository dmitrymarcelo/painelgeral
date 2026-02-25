"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { TruckIcon } from "@/components/ui/icons";
import { translations } from "@/lib/i18n";
import { getAuthSession, subscribeAuthSession } from "@/lib/auth-store";
import { mobileTabs } from "@/lib/mock-data";

type Props = {
  title: string;
  children: ReactNode;
  freeScroll?: boolean;
};

export function MobileShell({ title, children, freeScroll = false }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [authSession, setAuthSession] = useState(getAuthSession());

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

  return (
    <div className={`flex min-h-screen justify-center bg-[#e9edf3] py-4 ${freeScroll ? "items-start" : "items-center"}`}>
      <div
        className={`relative w-full max-w-[430px] rounded-[26px] border border-[var(--color-border)] bg-[#f6f7f8] shadow-xl ${
          freeScroll ? "min-h-[860px] overflow-visible" : "h-[860px] overflow-hidden"
        }`}
      >
        <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-white/95 px-5 py-4 backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{translations.fieldTechnician}</p>
              <p className="text-[10px] font-semibold text-slate-500">
                {authSession ? `${authSession.name} • ${authSession.role}` : "Nao autenticado"}
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600"
            >
              <TruckIcon className="h-4 w-4" />
              {translations.start}
            </Link>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <h1 className="text-[22px] font-black tracking-tight text-slate-900">{title}</h1>
            <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black uppercase text-blue-700">
              App
            </span>
          </div>
        </header>

        <main
          className={`px-4 pb-24 pt-4 ${
            freeScroll ? "min-h-[730px] overflow-visible" : "h-[730px] overflow-y-auto no-scrollbar"
          }`}
        >
          {children}
        </main>

        <nav
          className={`left-0 right-0 grid h-20 border-t border-[var(--color-border)] bg-white px-2 ${
            freeScroll ? "sticky bottom-0" : "absolute bottom-0"
          }`}
          style={{ gridTemplateColumns: `repeat(${mobileTabs.length}, minmax(0, 1fr))` }}
        >
          {mobileTabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`grid place-content-center rounded-xl text-[11px] font-black uppercase tracking-[0.12em] ${
                  active ? "bg-blue-50 text-[var(--color-brand)]" : "text-slate-400"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
