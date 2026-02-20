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
    throw new Error(text || "Erro inesperado na API");
  }

  return (await response.json()) as T;
}
