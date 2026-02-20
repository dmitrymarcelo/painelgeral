"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api-client";
import {
  listPendingActions,
  markActionFailed,
  markActionSynced,
  queueOfflineAction,
} from "@/lib/offline-db";
import { translations } from "@/lib/i18n";

const TENANT = "frota-pro";

export function ChecklistOfflinePanel() {
  const [pending, setPending] = useState(0);
  const [status, setStatus] = useState<string>(translations.ready);

  const addOffline = async () => {
    await queueOfflineAction({
      endpoint: "/checklists/runs",
      method: "POST",
      tenantId: TENANT,
      payload: {
        templateId: "template-offline",
        idempotencyKey: crypto.randomUUID(),
      },
    });

    setStatus(translations.actionSavedOffline);
    setPending((value) => value + 1);
  };

  const sync = async () => {
    const actions = await listPendingActions();
    if (actions.length === 0) {
      setStatus(translations.noPending);
      return;
    }

    setStatus(translations.syncing);

    for (const action of actions) {
      if (!action.id) continue;
      try {
        await apiRequest(action.endpoint, {
          method: action.method,
          body: action.payload,
          tenantId: action.tenantId,
        });
        await markActionSynced(action.id);
      } catch {
        await markActionFailed(action.id);
      }
    }

    setStatus(translations.synchronizationComplete);
    const nextPending = (await listPendingActions()).filter((item) => item.status === "pending").length;
    setPending(nextPending);
  };

  return (
    <div className="card p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">{translations.offlineFirst}</p>
      <p className="mt-1 text-sm font-semibold">{translations.localQueue}: {pending} {pending === 1 ? translations.pendingSingular : translations.pendingPlural}</p>
      <p className="text-xs text-slate-500">{status}</p>
      <div className="mt-3 flex gap-2">
        <button className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-black uppercase text-white" onClick={addOffline}>
          {translations.saveWithoutInternet}
        </button>
        <button className="rounded-lg bg-[var(--color-brand)] px-3 py-2 text-xs font-black uppercase" onClick={sync}>
          {translations.synchronize}
        </button>
      </div>
    </div>
  );
}
