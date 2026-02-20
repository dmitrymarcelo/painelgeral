import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser } from '../../common/interfaces/request-context.interface';
import { getTenantId } from '../../common/utils/tenant.util';
import { ResolveQrDto } from './dto/resolve-qr.dto';
import { QrService } from './qr.service';

@Controller('qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Post('resolve')
  @Roles('ADMIN', 'GESTOR', 'TECNICO')
  resolve(
    @Req() request: Request,
    @CurrentUser() user: AuthUser | undefined,
    @Body() dto: ResolveQrDto,
  ) {
    return this.qrService.resolve(
      getTenantId(request),
      dto.code,
      user?.roles ?? [],
    );
  }
}
