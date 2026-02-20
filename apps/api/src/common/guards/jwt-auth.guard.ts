import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthUser } from '../interfaces/request-context.interface';

type JwtPayload = AuthUser & {
  iat?: number;
  exp?: number;
};

const isJwtPayload = (value: unknown): value is JwtPayload => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const payload = value as Partial<JwtPayload>;

  return (
    typeof payload.sub === 'string' &&
    typeof payload.email === 'string' &&
    typeof payload.name === 'string' &&
    typeof payload.tenantId === 'string' &&
    Array.isArray(payload.roles)
  );
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token nao informado.');
    }

    const token = authHeader.slice(7);

    try {
      const payload = this.jwtService.verify<Record<string, unknown>>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      if (!isJwtPayload(payload)) {
        throw new UnauthorizedException('Token invalido ou expirado.');
      }

      request.user = payload;
      request.tenantId =
        typeof request.headers['x-tenant-id'] === 'string'
          ? request.headers['x-tenant-id']
          : payload.tenantId;

      return true;
    } catch {
      throw new UnauthorizedException('Token invalido ou expirado.');
    }
  }
}
