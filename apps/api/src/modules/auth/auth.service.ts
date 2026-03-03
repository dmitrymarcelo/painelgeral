import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

/**
 * RESPONSABILIDADE:
 * Regras de autenticacao (login, refresh e logout) com JWT + refresh token hash.
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - `AuthController` delega validacao e emissao de tokens para este service.
 * - Prisma persiste `refreshTokenHash` em `user` para revogacao de sessao.
 *
 * CONTRATO BACKEND:
 * - `login` retorna `{ accessToken, refreshToken, user }`
 * - `refresh` retorna novo par de tokens
 * - `logout` invalida refresh token persistido
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private toBigInt(
    v: string | number | bigint | null | undefined,
  ): bigint | null | undefined {
    if (v === null || v === undefined) return v as undefined;
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number') return BigInt(v);
    const s = String(v).trim();
    if (/^\d+$/.test(s)) return BigInt(s);
    return undefined;
  }

  async login(tenantSlug: string, dto: LoginDto) {
    // Regra de negocio: login e resolvido por tenant + email.
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });

    if (!tenant) {
      throw new UnauthorizedException('Tenant invalido.');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: dto.email,
        },
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario invalido.');
    }

    const passwordMatches = await compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    const roles = user.userRoles.map((entry) => entry.role.code);
    const payload = {
      sub: user.id.toString(),
      email: user.email,
      name: user.name,
      tenantId: tenant.id.toString(),
      roles,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: (process.env.JWT_ACCESS_TTL ?? '15m') as never,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: (process.env.JWT_REFRESH_TTL ?? '30d') as never,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await hash(refreshToken, 10) },
    });

    // CONTRATO BACKEND: resposta de login consumida pelo frontend deve incluir tokens + usuario.
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        tenantId: tenant.id,
        name: user.name,
        email: user.email,
        roles,
      },
    };
  }

  async refresh(refreshToken: string) {
    let payload: {
      sub: string;
      tenantId: string;
      email: string;
      name: string;
      roles: string[];
    };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalido.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: this.toBigInt(payload.sub)! },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user?.refreshTokenHash || !user.isActive) {
      throw new UnauthorizedException('Sessao invalida.');
    }

    const refreshMatches = await compare(refreshToken, user.refreshTokenHash);
    if (!refreshMatches) {
      throw new UnauthorizedException('Sessao expirada.');
    }

    const roles = user.userRoles.map((entry) => entry.role.code);
    const nextPayload = {
      sub: user.id.toString(),
      email: user.email,
      name: user.name,
      tenantId: user.tenantId.toString(),
      roles,
    };

    const nextAccessToken = await this.jwtService.signAsync(nextPayload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: (process.env.JWT_ACCESS_TTL ?? '15m') as never,
    });

    const nextRefreshToken = await this.jwtService.signAsync(nextPayload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: (process.env.JWT_REFRESH_TTL ?? '30d') as never,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await hash(nextRefreshToken, 10) },
    });

    // CONTRATO BACKEND: refresh retorna novo par de tokens sem repetir payload completo de usuario.
    return {
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
    };
  }

  async logout(userId: string): Promise<{ success: boolean }> {
    if (!userId) {
      throw new BadRequestException('Usuario invalido para logout.');
    }

    await this.prisma.user.update({
      where: { id: this.toBigInt(userId)! },
      data: { refreshTokenHash: null },
    });

    return { success: true };
  }
}
