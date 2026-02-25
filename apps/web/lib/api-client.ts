/**
 * RESPONSABILIDADE:
 * Cliente HTTP padrao do frontend para consumo da API NestJS.
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - Centraliza URL base, headers de tenant e autenticacao.
 * - Deve substituir acessos diretos a stores locais quando a integracao backend estiver ativa.
 *
 * CONTRATO BACKEND: respostas de erro devem priorizar JSON padronizado contendo
 * `statusCode`, `message` e opcionalmente `erros` para feedback na UI.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

type RequestConfig = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
  tenantId?: string;
};

export async function apiRequest<T>(
  path: string,
  config: RequestConfig = {},
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  }

  if (config.tenantId) {
    headers["x-tenant-id"] = config.tenantId;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: config.method ?? "GET",
    headers,
    body: config.body ? JSON.stringify(config.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    // CONTRATO BACKEND: padrao recomendado -> `{ statusCode, message, erros? }`.
    let parsedMessage: string | undefined;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      parsedMessage = parsed.message;
    } catch {
      // Mantem fallback para respostas nao JSON.
    }
    throw new Error(parsedMessage || text || "Erro inesperado na API");
  }

  return (await response.json()) as T;
}
