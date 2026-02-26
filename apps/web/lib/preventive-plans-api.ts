import { apiRequest } from "@/lib/api-client";

/**
 * RESPONSABILIDADE:
 * Ponte de publicacao de cadastros locais de preventiva para o backend (`maintenance-plans`).
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - A tela `Cadastro de Planos de Manutencao` hoje salva localmente.
 * - Este modulo prepara a migracao incremental, publicando cabecalho do plano e gatilhos.
 *
 * CONTRATO BACKEND:
 * - Usa `/maintenance-plans` e `/maintenance-plans/:id/rules`
 * - Itens/pecas do plano ainda exigem endpoint dedicado (TODO backend)
 */

type ApiContext = { token: string; tenantId: string };

type PreventiveRegistrationPayload = {
  registrationId: string;
  form: {
    vehicleModel: string;
    vehicleBrand: string;
    vehicleType: string;
    operationType: "Severo" | "Normal" | "Leve" | "";
    centerCost: string;
    vehicleDescription: string;
    vehicleFormula: string;
  };
  triggerConfig: {
    quilometragemKm: number;
    horimetroHrs: number;
    temporalMeses: number;
  };
  items: Array<{
    id: string;
    partMaterial: string;
    usefulLifeKm: string;
    usefulLifeHourmeter: string;
    usefulLifeTime: string;
  }>;
};

type ApiMaintenancePlan = {
  id: string;
  assetId: string;
  title: string;
  description?: string | null;
  isActive: boolean;
};

const TRIGGER_WARNING_FACTOR = 0.1;

export async function listMaintenancePlansApi(ctx: ApiContext) {
  return apiRequest<ApiMaintenancePlan[]>("/maintenance-plans", {
    method: "GET",
    tenantId: ctx.tenantId,
    token: ctx.token,
  });
}

export async function publishPreventiveRegistrationToApi(
  ctx: ApiContext,
  registration: PreventiveRegistrationPayload,
  options: { assetId: string },
) {
  // CONTRATO BACKEND: `assetId` ainda precisa ser informado pela camada de UI/integracao,
  // pois o cadastro local trabalha com modelo/tipo/operacao (sem FK de ativo real).
  const plan = await apiRequest<ApiMaintenancePlan>("/maintenance-plans", {
    method: "POST",
    tenantId: ctx.tenantId,
    token: ctx.token,
    body: {
      assetId: options.assetId,
      title: `${registration.form.vehicleModel} - ${registration.form.operationType || "Plano"} `,
      description: [
        `Marca: ${registration.form.vehicleBrand}`,
        `Tipo: ${registration.form.vehicleType}`,
        `Centro de custo: ${registration.form.centerCost}`,
        `Formula: ${registration.form.vehicleFormula}`,
        `Descricao: ${registration.form.vehicleDescription}`,
        `Origem local registrationId: ${registration.registrationId}`,
      ].join("\n"),
      isActive: true,
    },
  });

  const rules = [
    { triggerType: "ODOMETRO_KM", intervalValue: registration.triggerConfig.quilometragemKm },
    { triggerType: "HORIMETRO_H", intervalValue: registration.triggerConfig.horimetroHrs },
    { triggerType: "TEMPO_DIAS", intervalValue: registration.triggerConfig.temporalMeses * 30 },
  ] as const;

  for (const rule of rules) {
    if (!rule.intervalValue || rule.intervalValue <= 0) continue;
    // CONTRATO BACKEND: ajuste os enums `triggerType` conforme o schema real de `TriggerType`.
    // Este bridge documenta a intencao; a camada final deve usar os enums reais do backend.
    await apiRequest(`/maintenance-plans/${plan.id}/rules`, {
      method: "POST",
      tenantId: ctx.tenantId,
      token: ctx.token,
      body: {
        triggerType: rule.triggerType,
        intervalValue: rule.intervalValue,
        warningValue: Math.max(1, Math.round(rule.intervalValue * TRIGGER_WARNING_FACTOR)),
      },
    });
  }

  return {
    plan,
    publishedRules: rules.filter((rule) => rule.intervalValue > 0).length,
    // TODO BACKEND: publicar `items` quando existir endpoint `maintenance-plan-items`.
    pendingItemsCount: registration.items.length,
  };
}

