import { MobileShell } from "@/components/layout/mobile-shell";
import { translations } from "@/lib/i18n";

export default function MobileMaintenancePage() {
  return (
    <MobileShell title={translations.marcosSilva}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-red-500 p-3 text-white"><p className="text-[10px] font-black uppercase">{translations.stopped}</p><p className="text-3xl font-black">04</p></div>
          <div className="rounded-2xl bg-blue-500 p-3 text-white"><p className="text-[10px] font-black uppercase">{translations.pendingNautical}</p><p className="text-3xl font-black">02</p></div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black">Lancha Sea Ray 250</p>
              <p className="text-xs text-slate-500">#NAU-882 • Pier Sul - Marina 04</p>
            </div>
            <span className="rounded bg-red-100 px-2 py-1 text-[10px] font-black uppercase text-red-700">{translations.urgent}</span>
          </div>
          <button className="mt-3 w-full rounded-xl bg-[var(--color-brand)] py-3 text-xs font-black uppercase">{translations.startChecklist}</button>
        </div>

        <div className="card p-4 opacity-80">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black">Caminhão Baú</p>
              <p className="text-xs text-slate-500">#LOG-450</p>
            </div>
            <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500">{translations.waiting}</span>
          </div>
          <button className="mt-3 w-full rounded-xl border border-slate-200 py-3 text-xs font-black uppercase text-slate-500">{translations.openTechnicalSheet}</button>
        </div>
      </div>
    </MobileShell>
  );
}
