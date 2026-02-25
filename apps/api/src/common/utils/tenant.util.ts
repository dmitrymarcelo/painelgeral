/**
 * RESPONSABILIDADE:
 * Resolver tenant atual a partir do request (header, usuario autenticado ou fallback).
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - Usado por controllers para garantir scoping multi-tenant sem repetir logica.
 *
 * CONTRATO BACKEND: aceitar `x-tenant-id` (slug ou id) e propagar `tenantId` no JWT.
 */
import { Request } from 'express';

export const getTenantId = (request: Request): string => {
  // Regra de negocio: prioriza header para suportar login publico por tenant e testes.
  const headerTenant = request.headers['x-tenant-id'];
  if (typeof headerTenant === 'string' && headerTenant.length > 0) {
    return headerTenant;
  }

  const user = request.user as { tenantId?: string } | undefined;
  if (user?.tenantId) {
    return user.tenantId;
  }

  return process.env.DEFAULT_TENANT_SLUG ?? 'frota-pro';
};
