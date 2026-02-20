import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import { getTenantId } from '../../../common/utils/tenant.util';
import { TelemetryBackfillDto } from './dto/telemetry-backfill.dto';
import { TelemetryWebhookDto } from './dto/telemetry-webhook.dto';
import { TelemetryService } from './telemetry.service';

@Controller('integrations/telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post(':provider/webhook')
  webhook(
    @Req() request: Request,
    @Param('provider') provider: string,
    @Body() payload: TelemetryWebhookDto,
  ) {
    return this.telemetryService.webhook(
      getTenantId(request),
      provider,
      payload,
    );
  }

  @Get('sync-status')
  @Roles('ADMIN', 'GESTOR')
  syncStatus(@Req() request: Request) {
    return this.telemetryService.syncStatus(getTenantId(request));
  }

  @Post('backfill')
  @Roles('ADMIN', 'GESTOR')
  backfill(@Req() request: Request, @Body() dto: TelemetryBackfillDto) {
    return this.telemetryService.backfill(
      getTenantId(request),
      dto.provider ?? 'default-provider',
      dto,
    );
  }
}
