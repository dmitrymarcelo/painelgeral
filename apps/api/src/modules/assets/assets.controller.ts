import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser } from '../../common/interfaces/request-context.interface';
import { getTenantId } from '../../common/utils/tenant.util';
import { AssetQueryDto } from './dto/asset-query.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { ImportAssetsCsvDto } from './dto/import-assets-csv.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetsService } from './assets.service';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @Public()
  @Roles('ADMIN', 'GESTOR', 'TECNICO')
  findAll(@Req() request: Request, @Query() query: AssetQueryDto) {
    return this.assetsService.findAll(getTenantId(request), query);
  }

  @Post()
  @Roles('ADMIN', 'GESTOR')
  create(
    @Req() request: Request,
    @CurrentUser() user: AuthUser | undefined,
    @Body() dto: CreateAssetDto,
  ) {
    return this.assetsService.create(getTenantId(request), user?.sub, dto);
  }

  @Get(':id')
  @Roles('ADMIN', 'GESTOR', 'TECNICO')
  findOne(@Req() request: Request, @Param('id') id: string) {
    return this.assetsService.findOne(getTenantId(request), id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'GESTOR')
  update(
    @Req() request: Request,
    @CurrentUser() user: AuthUser | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetsService.update(getTenantId(request), user?.sub, id, dto);
  }

  @Post('import/csv')
  @Roles('ADMIN', 'GESTOR')
  importCsv(
    @Req() request: Request,
    @CurrentUser() user: AuthUser | undefined,
    @Body() dto: ImportAssetsCsvDto,
  ) {
    return this.assetsService.importCsv(getTenantId(request), user?.sub, dto);
  }

  @Get(':id/history')
  @Roles('ADMIN', 'GESTOR', 'TECNICO')
  history(@Req() request: Request, @Param('id') id: string) {
    return this.assetsService.history(getTenantId(request), id);
  }
}
