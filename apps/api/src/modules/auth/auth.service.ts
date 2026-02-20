import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(tenantSlug: string, dto: LoginDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });

    if (!tenant) {
      throw new UnauthorizedException('Tenant inválido.');
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
      throw new UnauthorizedException('Usuário inválido.');
    }

    const passwordMatches = await compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const roles = user.userRoles.map((entry) => entry.role.code);
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      tenantId: tenant.id,
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
      throw new UnauthorizedException('Refresh token inválido.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user?.refreshTokenHash || !user.isActive) {
      throw new UnauthorizedException('Sessão inválida.');
    }

    const refreshMatches = await compare(refreshToken, user.refreshTokenHash);
    if (!refreshMatches) {
      throw new UnauthorizedException('Sessão expirada.');
    }

    const roles = user.userRoles.map((entry) => entry.role.code);
    const nextPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
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

    return {
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
    };
  }

  async logout(userId: string): Promise<{ success: boolean }> {
    if (!userId) {
      throw new BadRequestException('Usuário inválido para logout.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });

    return { success: true };
  }
}
