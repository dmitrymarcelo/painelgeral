import { Controller, Get, Param, Patch, Req, Body } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/interfaces/request-context.interface';
import { getTenantId } from '../../common/utils/tenant.util';
import { MarkNotificationReadDto } from './dto/mark-notification-read.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@Req() request: Request, @CurrentUser() user: AuthUser | undefined) {
    return this.notificationsService.list(
      getTenantId(request),
      user?.sub ?? '',
    );
  }

  @Patch(':id/read')
  markRead(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: MarkNotificationReadDto,
  ) {
    return this.notificationsService.markRead(
      getTenantId(request),
      id,
      dto.isRead,
    );
  }
}
