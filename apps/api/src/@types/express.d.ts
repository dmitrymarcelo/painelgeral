import { AuthUser } from '../common/interfaces/request-context.interface';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      tenantId?: string;
    }
  }
}

export {};
