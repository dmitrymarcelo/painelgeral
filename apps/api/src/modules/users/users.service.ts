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

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
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
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('E-mail já cadastrado.');
    }

    const passwordHash = await hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        name: dto.name,
        passwordHash,
        isActive: dto.isActive ?? true,
      },
    });

    const rolesToAttach = dto.roles?.length ? dto.roles : [UserRole.TECNICO];

    for (const roleCode of rolesToAttach) {
      const role = await this.prisma.role.findUnique({
        where: { tenantId_code: { tenantId, code: roleCode } },
      });
      if (!role) continue;
      await this.prisma.userRoleMap.create({
        data: {
          tenantId,
          userId: user.id,
          roleId: role.id,
        },
      });
    }

    return this.findById(tenantId, user.id);
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
      where: { id },
      data,
    });

    if (dto.roles?.length) {
      await this.prisma.userRoleMap.deleteMany({
        where: { tenantId, userId: id },
      });
      for (const roleCode of dto.roles) {
        const role = await this.prisma.role.findUnique({
          where: { tenantId_code: { tenantId, code: roleCode } },
        });
        if (!role) continue;
        await this.prisma.userRoleMap.create({
          data: { tenantId, userId: id, roleId: role.id },
        });
      }
    }

    return this.findById(tenantId, id);
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateUserStatusDto) {
    await this.findById(tenantId, id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: dto.isActive },
    });
  }

  async findById(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return user;
  }
}
