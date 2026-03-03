import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/**
 * RESPONSABILIDADE:
 * Regras de negocio de usuarios (cadastro, atualizacao, papeis e status).
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - `UsersController` usa este service para CRUD administrativo.
 * - Prisma persiste em `user`, `role` e `userRoleMap`.
 *
 * CONTRATO BACKEND: frontend administrativo precisa de `user + userRoles.role`.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private toBigInt(
    v: string | number | bigint | null | undefined,
  ): bigint | null | undefined {
    if (v === null || v === undefined) return v as undefined;
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number') return BigInt(v);
    const s = String(v).trim();
    if (/^\d+$/.test(s)) return BigInt(s);
    throw new BadRequestException('ID inválido');
  }

  private async resolveTenantId(tenantRef: string): Promise<bigint> {
    if (/^\d+$/.test(tenantRef)) return BigInt(tenantRef);
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantRef },
      select: { id: true },
    });
    if (!tenant) {
      throw new BadRequestException('Tenant inválido');
    }
    return tenant.id;
  }

  async findAll(tenantId: string) {
    const tenantDbId = await this.resolveTenantId(tenantId);
    return this.prisma.user.findMany({
      where: { tenantId: tenantDbId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, dto: CreateUserDto) {
    const tenantDbId = await this.resolveTenantId(tenantId);
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenantDbId, email: dto.email } },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('E-mail ja cadastrado.');
    }

    const passwordHash = await hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        tenantId: tenantDbId,
        email: dto.email,
        name: dto.name,
        passwordHash,
        isActive: dto.isActive ?? true,
      },
    });

    const rolesToAttach = dto.roles?.length ? dto.roles : [UserRole.TECNICO];

    for (const roleCode of rolesToAttach) {
      const role = await this.prisma.role.findUnique({
        where: { tenantId_code: { tenantId: tenantDbId, code: roleCode } },
      });
      if (!role) continue;
      await this.prisma.userRoleMap.create({
        data: {
          tenantId: tenantDbId,
          userId: user.id,
          roleId: role.id,
        },
      });
    }

    return this.findById(tenantId, user.id.toString());
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto) {
    await this.findById(tenantId, id);

    const data: Record<string, unknown> = {
      name: dto.name,
      email: dto.email,
      isActive: dto.isActive,
    };

    if (dto.password) {
      data.passwordHash = await hash(dto.password, 10);
    }

    await this.prisma.user.update({
      where: { id: this.toBigInt(id)! },
      data,
    });

    if (dto.roles?.length) {
      await this.prisma.userRoleMap.deleteMany({
        where: {
          tenantId: await this.resolveTenantId(tenantId),
          userId: this.toBigInt(id)!,
        },
      });
      for (const roleCode of dto.roles) {
        const role = await this.prisma.role.findUnique({
          where: {
            tenantId_code: {
              tenantId: await this.resolveTenantId(tenantId),
              code: roleCode,
            },
          },
        });
        if (!role) continue;
        await this.prisma.userRoleMap.create({
          data: {
            tenantId: await this.resolveTenantId(tenantId),
            userId: this.toBigInt(id)!,
            roleId: role.id,
          },
        });
      }
    }

    return this.findById(tenantId, id);
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateUserStatusDto) {
    await this.findById(tenantId, id);
    return this.prisma.user.update({
      where: { id: this.toBigInt(id)! },
      data: { isActive: dto.isActive },
    });
  }

  async findById(tenantId: string, id: string) {
    const tenantDbId = await this.resolveTenantId(tenantId);
    const user = await this.prisma.user.findFirst({
      where: { id: this.toBigInt(id)!, tenantId: tenantDbId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario nao encontrado.');
    }

    return user;
  }
}
