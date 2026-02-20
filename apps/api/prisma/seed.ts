import { PrismaClient, AssetType, AssetStatus, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'frota-pro' },
    update: {},
    create: {
      slug: 'frota-pro',
      name: 'Frota Pro',
      timezone: 'America/Sao_Paulo',
    },
  });

  const [adminRole, gestorRole] = await Promise.all([
    prisma.role.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: UserRole.ADMIN } },
      update: { name: 'Administrador' },
      create: {
        tenantId: tenant.id,
        code: UserRole.ADMIN,
        name: 'Administrador',
      },
    }),
    prisma.role.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: UserRole.GESTOR } },
      update: { name: 'Gestor' },
      create: { tenantId: tenant.id, code: UserRole.GESTOR, name: 'Gestor' },
    }),
    prisma.role.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: UserRole.TECNICO } },
      update: { name: 'Técnico' },
      create: { tenantId: tenant.id, code: UserRole.TECNICO, name: 'Técnico' },
    }),
  ]);

  const admin = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: 'admin@frotapro.local' },
    },
    update: {
      name: 'Administrador Frota',
      passwordHash: await hash('Admin@123', 10),
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      email: 'admin@frotapro.local',
      name: 'Administrador Frota',
      passwordHash: await hash('Admin@123', 10),
      isActive: true,
    },
  });

  await Promise.all([
    prisma.userRoleMap.upsert({
      where: {
        tenantId_userId_roleId: {
          tenantId: tenant.id,
          userId: admin.id,
          roleId: adminRole.id,
        },
      },
      update: {},
      create: { tenantId: tenant.id, userId: admin.id, roleId: adminRole.id },
    }),
    prisma.userRoleMap.upsert({
      where: {
        tenantId_userId_roleId: {
          tenantId: tenant.id,
          userId: admin.id,
          roleId: gestorRole.id,
        },
      },
      update: {},
      create: { tenantId: tenant.id, userId: admin.id, roleId: gestorRole.id },
    }),
  ]);

  const assets = [
    {
      code: 'FRO-012',
      plate: 'ABC-1234',
      type: AssetType.CARRO,
      model: 'Toyota Hilux SRX',
      manufacturer: 'Toyota',
      status: AssetStatus.DISPONIVEL,
      odometerKm: 51240,
      qrCode: 'QR-FRO-012',
      locationName: 'Base Central',
    },
    {
      code: 'LOG-450',
      plate: 'XYZ-9876',
      type: AssetType.CAMINHAO,
      model: 'Volvo FH 540',
      manufacturer: 'Volvo',
      status: AssetStatus.EM_MANUTENCAO,
      engineHours: 805,
      qrCode: 'QR-LOG-450',
      locationName: 'Oficina Norte',
    },
    {
      code: 'NAU-882',
      plate: 'MAR-005',
      type: AssetType.LANCHA,
      model: 'Sea Ray 250',
      manufacturer: 'Sea Ray',
      status: AssetStatus.EM_SERVICO,
      engineHours: 485,
      qrCode: 'QR-NAU-882',
      locationName: 'Pier Sul',
    },
  ];

  for (const asset of assets) {
    await prisma.asset.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: asset.code } },
      update: asset,
      create: { ...asset, tenantId: tenant.id },
    });
  }

  console.log('Seed concluído: admin@frotapro.local / Admin@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
