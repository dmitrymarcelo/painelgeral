import { MobileShell } from "@/components/layout/mobile-shell";
import { translations } from "@/lib/i18n";

export default function MobileMaintenancePage() {
  return (
    <MobileShell title={translations.marcosSilva}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-red-200 bg-gradient-to-b from-red-500 to-red-600 p-3 text-white shadow-md">
            <p className="text-[10px] font-black uppercase">{translations.stopped}</p>
            <p className="text-3xl font-black">04</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-500 to-blue-600 p-3 text-white shadow-md">
            <p className="text-[10px] font-black uppercase">{translations.pendingNautical}</p>
            <p className="text-3xl font-black">02</p>
          </div>
        </div>

        <div className="card border-l-4 border-l-red-500 bg-gradient-to-b from-white to-rose-50/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black">Lancha Sea Ray 250</p>
              <p className="text-xs text-slate-500">#NAU-882 • Pier Sul - Marina 04</p>
            </div>
            <span className="rounded bg-red-100 px-2 py-1 text-[10px] font-black uppercase text-red-700">
              {translations.urgent}
            </span>
          </div>
          <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Tipo</span>
              <strong>Preventiva</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Janela</span>
              <strong>Hoje • 08:00</strong>
            </div>
          </div>
          <button className="mt-3 w-full rounded-xl bg-[var(--color-brand)] py-3 text-xs font-black uppercase text-white shadow-sm">
            {translations.startChecklist}
          </button>
        </div>

        <div className="card border-l-4 border-l-slate-300 bg-gradient-to-b from-white to-slate-50 p-4 opacity-90">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black">Caminhao Bau</p>
              <p className="text-xs text-slate-500">#LOG-450 • Patio Central</p>
            </div>
            <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500">
              {translations.waiting}
            </span>
          </div>
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
            Aguardando liberacao do ativo para iniciar ficha tecnica e checklist de manutencao.
          </div>
          <button className="mt-3 w-full rounded-xl border border-slate-200 py-3 text-xs font-black uppercase text-slate-600">
            {translations.openTechnicalSheet}
          </button>
        </div>
      </div>
    </MobileShell>
  );
}

