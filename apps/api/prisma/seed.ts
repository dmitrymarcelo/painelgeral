import {
  PrismaClient,
  AssetType,
  AssetStatus,
  UserRole,
  WorkOrderPriority,
  WorkOrderStatus,
  CalendarEventType,
  CalendarEventStatus,
  NotificationChannel,
} from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const nowBase = BigInt(Date.now());
  let seq = 1000n;
  const nextId = () => {
    seq += 1n;
    return (nowBase * 10000n + seq) as any;
  };
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'frota-pro' },
    update: {},
    create: {
      id: 1n as any,
      slug: 'frota-pro',
      name: 'Frota Pro',
      timezone: 'America/Sao_Paulo',
    },
  });

  const [adminRole, gestorRole, tecnicoRole] = await Promise.all([
    prisma.role.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: UserRole.ADMIN } },
      update: { name: 'Administrador' },
      create: {
        id: 1n as any,
        tenantId: tenant.id,
        code: UserRole.ADMIN,
        name: 'Administrador',
      },
    }),
    prisma.role.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: UserRole.GESTOR } },
      update: { name: 'Gestor' },
      create: { id: 2n as any, tenantId: tenant.id, code: UserRole.GESTOR, name: 'Gestor' },
    }),
    prisma.role.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: UserRole.TECNICO } },
      update: { name: 'Técnico' },
      create: { id: 3n as any, tenantId: tenant.id, code: UserRole.TECNICO, name: 'Técnico' },
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
      id: 1n as any,
      tenantId: tenant.id,
      email: 'admin@frotapro.local',
      name: 'Administrador Frota',
      passwordHash: await hash('Admin@123', 10),
      isActive: true,
    },
  });

  const gestor = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: 'gestor@frotapro.local' },
    },
    update: {
      name: 'Gestor Silva',
      passwordHash: await hash('Gestor@123', 10),
      isActive: true,
    },
    create: {
      id: 2n as any,
      tenantId: tenant.id,
      email: 'gestor@frotapro.local',
      name: 'Gestor Silva',
      passwordHash: await hash('Gestor@123', 10),
      isActive: true,
    },
  });

  const tecnico = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: 'tecnico@frotapro.local' },
    },
    update: {
      name: 'Técnico Souza',
      passwordHash: await hash('Tecnico@123', 10),
      isActive: true,
    },
    create: {
      id: 3n as any,
      tenantId: tenant.id,
      email: 'tecnico@frotapro.local',
      name: 'Técnico Souza',
      passwordHash: await hash('Tecnico@123', 10),
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
      create: { id: 1n as any, tenantId: tenant.id, userId: admin.id, roleId: adminRole.id },
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
      create: { id: 2n as any, tenantId: tenant.id, userId: admin.id, roleId: gestorRole.id },
    }),
    prisma.userRoleMap.upsert({
      where: {
        tenantId_userId_roleId: {
          tenantId: tenant.id,
          userId: gestor.id,
          roleId: gestorRole.id,
        },
      },
      update: {},
      create: { id: 3n as any, tenantId: tenant.id, userId: gestor.id, roleId: gestorRole.id },
    }),
    prisma.userRoleMap.upsert({
      where: {
        tenantId_userId_roleId: {
          tenantId: tenant.id,
          userId: tecnico.id,
          roleId: tecnicoRole.id,
        },
      },
      update: {},
      create: { id: 4n as any, tenantId: tenant.id, userId: tecnico.id, roleId: tecnicoRole.id },
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
    {
      code: 'MOT-301',
      plate: 'MTR-3010',
      type: AssetType.MOTO,
      model: 'Honda CG 160',
      manufacturer: 'Honda',
      status: AssetStatus.DISPONIVEL,
      odometerKm: 12400,
      qrCode: 'QR-MOT-301',
      locationName: 'Base Leste',
    },
    {
      code: 'TRT-700',
      plate: null as any,
      type: AssetType.MAQUINARIO,
      model: 'Caterpillar 320D',
      manufacturer: 'Caterpillar',
      status: AssetStatus.EM_SERVICO,
      engineHours: 2300,
      qrCode: 'QR-TRT-700',
      locationName: 'Obra A',
    },
  ];

  for (const asset of assets) {
    await prisma.asset.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: asset.code } },
      update: asset,
      create: {
        id:
          asset.code === 'FRO-012'
            ? (1n as any)
            : asset.code === 'LOG-450'
            ? (2n as any)
            : asset.code === 'NAU-882'
            ? (3n as any)
            : asset.code === 'MOT-301'
            ? (4n as any)
            : (5n as any),
        ...asset,
        tenantId: tenant.id,
      },
    });
  }

  const assetA = await prisma.asset.findUniqueOrThrow({
    where: { tenantId_code: { tenantId: tenant.id, code: 'FRO-012' } },
  });
  const assetB = await prisma.asset.findUniqueOrThrow({
    where: { tenantId_code: { tenantId: tenant.id, code: 'LOG-450' } },
  });

  const notif1 = await prisma.notification.upsert({
    where: { id: 1n as any },
    update: {},
    create: {
      id: 1n as any,
      tenantId: tenant.id,
      userId: admin.id,
      title: 'Bem-vindo',
      body: 'Sua conta foi configurada.',
      isRead: false,
    },
  });
  await prisma.notification.upsert({
    where: { id: 2n as any },
    update: {},
    create: {
      id: 2n as any,
      tenantId: tenant.id,
      userId: gestor.id,
      title: 'Relatório disponível',
      body: 'Relatório semanal gerado.',
      isRead: false,
    },
  });

  await prisma.notificationDelivery.upsert({
    where: { id: 1n as any },
    update: {},
    create: {
      id: 1n as any,
      tenantId: tenant.id,
      notificationId: notif1.id,
      channel: NotificationChannel.IN_APP,
      status: 'DELIVERED',
    },
  });

  const wo1 = await prisma.workOrder.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'WO-001' } },
    update: {
      status: WorkOrderStatus.EM_ANDAMENTO,
      priority: WorkOrderPriority.NORMAL,
    },
    create: {
      id: 1n as any,
      tenantId: tenant.id,
      code: 'WO-001',
      assetId: assetA.id,
      service: 'Troca de óleo',
      description: 'Troca de óleo e filtro',
      priority: WorkOrderPriority.NORMAL,
      status: WorkOrderStatus.ABERTA,
      openedById: admin.id,
    },
  });

  const wo2 = await prisma.workOrder.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'WO-002' } },
    update: {
      status: WorkOrderStatus.AGUARDANDO,
      priority: WorkOrderPriority.ALTA,
    },
    create: {
      id: 2n as any,
      tenantId: tenant.id,
      code: 'WO-002',
      assetId: assetB.id,
      service: 'Revisão elétrica',
      description: 'Verificação de chicote e lâmpadas',
      priority: WorkOrderPriority.ALTA,
      status: WorkOrderStatus.ABERTA,
      openedById: gestor.id,
    },
  });

  await prisma.workOrderAssignment.upsert({
    where: { tenantId_workOrderId_userId: { tenantId: tenant.id, workOrderId: wo1.id, userId: tecnico.id } },
    update: {},
    create: { id: 1n as any, tenantId: tenant.id, workOrderId: wo1.id, userId: tecnico.id },
  });
  await prisma.workOrderAssignment.upsert({
    where: { tenantId_workOrderId_userId: { tenantId: tenant.id, workOrderId: wo2.id, userId: tecnico.id } },
    update: {},
    create: { id: 2n as any, tenantId: tenant.id, workOrderId: wo2.id, userId: tecnico.id },
  });

  await prisma.calendarEvent.upsert({
    where: { id: 1n as any },
    update: {},
    create: {
      id: 1n as any,
      tenantId: tenant.id,
      title: 'Preventiva Troca de Óleo',
      type: CalendarEventType.PREVENTIVA,
      status: CalendarEventStatus.PROGRAMADA,
      startAt: new Date(),
      endAt: new Date(Date.now() + 60 * 60 * 1000),
      assetId: assetA.id,
      workOrderId: wo1.id,
    },
  });
  await prisma.calendarEvent.upsert({
    where: { id: 2n as any },
    update: {},
    create: {
      id: 2n as any,
      tenantId: tenant.id,
      title: 'Vistoria Caminhão',
      type: CalendarEventType.VISTORIA,
      status: CalendarEventStatus.PROGRAMADA,
      startAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      assetId: assetB.id,
    },
  });

  // Checklists removidos do domínio; nenhum seed criado para templates ou runs.

  const mp = await prisma.maintenancePlan.upsert({
    where: { id: 1n as any },
    update: {},
    create: {
      id: 1n as any,
      tenantId: tenant.id,
      assetId: assetA.id,
      title: 'Troca de Óleo a cada 10.000km',
      isActive: true,
      rules: {
        create: [
          {
            id: 1n as any,
            tenantId: tenant.id,
            triggerType: 'KM',
            intervalValue: 10000,
            warningValue: 9500,
          },
        ],
      },
    },
  });

  await prisma.maintenanceExecution.upsert({
    where: { id: 1n as any },
    update: {},
    create: {
      id: 1n as any,
      tenantId: tenant.id,
      planId: mp.id,
      assetId: assetA.id,
      status: WorkOrderStatus.ABERTA,
      dueValue: 60000,
      workOrderId: wo1.id,
    },
  });

  await prisma.auditLog.upsert({
    where: { id: 1n as any },
    update: {},
    create: {
      id: 1n as any,
      tenantId: tenant.id,
      userId: admin.id,
      action: 'CREATE',
      resource: 'assets',
      resourceId: String(assetA.id),
      payload: { code: 'FRO-012' } as any,
    },
  });
  await prisma.auditLog.upsert({
    where: { id: 2n as any },
    update: {},
    create: {
      id: 2n as any,
      tenantId: tenant.id,
      userId: gestor.id,
      action: 'OPEN',
      resource: 'work_orders',
      resourceId: String(wo2.id),
      payload: { code: 'WO-002' } as any,
    },
  });

  const extraAssets = [
    { code: 'CAR-101', type: AssetType.CARRO, model: 'Fiat Argo', manufacturer: 'Fiat' },
    { code: 'CAR-102', type: AssetType.CARRO, model: 'Chevrolet Onix', manufacturer: 'GM' },
    { code: 'TRK-201', type: AssetType.CAMINHAO, model: 'Mercedes Atego', manufacturer: 'Mercedes' },
    { code: 'MCH-501', type: AssetType.MAQUINARIO, model: 'Escavadeira ZX200', manufacturer: 'Hitachi' },
    { code: 'MCH-502', type: AssetType.MAQUINARIO, model: 'Retroescavadeira 3CX', manufacturer: 'JCB' },
  ];

  for (const ea of extraAssets) {
    const created = await prisma.asset.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: ea.code } },
      update: {},
      create: {
        id: nextId(),
        tenantId: tenant.id,
        code: ea.code,
        plate: null as any,
        type: ea.type,
        model: ea.model,
        manufacturer: ea.manufacturer,
        status: AssetStatus.DISPONIVEL,
        odometerKm: 1000 + Math.floor(Math.random() * 50000),
        engineHours: null as any,
        qrCode: `QR-${ea.code}`,
        locationName: 'Pátio',
      },
    });
  }

  const moreWOs = [
    { code: 'WO-003', service: 'Troca de pastilhas', priority: WorkOrderPriority.NORMAL },
    { code: 'WO-004', service: 'Balanceamento', priority: WorkOrderPriority.BAIXA },
    { code: 'WO-005', service: 'Alinhamento', priority: WorkOrderPriority.BAIXA },
    { code: 'WO-006', service: 'Substituir filtro de ar', priority: WorkOrderPriority.NORMAL },
    { code: 'WO-007', service: 'Diagnóstico elétrico', priority: WorkOrderPriority.ALTA },
    { code: 'WO-008', service: 'Limpeza de bicos', priority: WorkOrderPriority.NORMAL },
  ];

  const someAssets = await prisma.asset.findMany({
    where: { tenantId: tenant.id },
    take: 5,
    orderBy: { id: 'asc' },
  });

  let idx = 0;
  for (const wo of moreWOs) {
    const asset = someAssets[idx % someAssets.length];
    idx++;
    const createdWO = await prisma.workOrder.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: wo.code } },
      update: {},
      create: {
        id: nextId(),
        tenantId: tenant.id,
        code: wo.code,
        assetId: asset.id,
        service: wo.service,
        description: `${wo.service} - inspeção e execução`,
        priority: wo.priority,
        status: WorkOrderStatus.ABERTA,
        openedById: admin.id,
      },
    });
    await prisma.workOrderAssignment.upsert({
      where: {
        tenantId_workOrderId_userId: {
          tenantId: tenant.id,
          workOrderId: createdWO.id,
          userId: tecnico.id,
        },
      },
      update: {},
      create: {
        id: nextId(),
        tenantId: tenant.id,
        workOrderId: createdWO.id,
        userId: tecnico.id,
      },
    });
    await prisma.calendarEvent.create({
      data: {
        id: nextId(),
        tenantId: tenant.id,
        title: `Agendamento - ${wo.service}`,
        type: CalendarEventType.PREVENTIVA,
        status: CalendarEventStatus.PROGRAMADA,
        startAt: new Date(Date.now() + idx * 3600000),
        endAt: new Date(Date.now() + (idx + 1) * 3600000),
        assetId: asset.id,
        workOrderId: createdWO.id,
      },
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
