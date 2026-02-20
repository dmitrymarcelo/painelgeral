import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, userId: string) {
    return this.prisma.notification.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'desc' },
      include: { deliveries: true },
      take: 100,
    });
  }

  async markRead(tenantId: string, notificationId: string, isRead: boolean) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, tenantId },
      select: { id: true },
    });

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada.');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead,
        readAt: isRead ? new Date() : null,
      },
    });
  }

  async create(input: {
    tenantId: string;
    userId: string;
    title: string;
    body: string;
    channels?: NotificationChannel[];
  }) {
    const channels = input.channels?.length
      ? input.channels
      : [
          NotificationChannel.IN_APP,
          NotificationChannel.PUSH,
          NotificationChannel.EMAIL,
        ];

    return this.prisma.notification.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        title: input.title,
        body: input.body,
        deliveries: {
          create: channels.map((channel) => ({
            tenantId: input.tenantId,
            channel,
            status: 'PENDING',
          })),
        },
      },
      include: { deliveries: true },
    });
  }
}
