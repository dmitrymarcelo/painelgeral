export type AuthUser = {
  sub: string;
  email: string;
  name: string;
  tenantId: string;
  roles: string[];
};

export type RequestContext = {
  user?: AuthUser;
  tenantId: string;
};
