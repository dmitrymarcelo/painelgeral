import { Request } from 'express';

export const getTenantId = (request: Request): string => {
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
