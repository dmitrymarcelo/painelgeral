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
import { AddChecklistAttachmentDto } from './dto/add-checklist-attachment.dto';
import { AddChecklistSignatureDto } from './dto/add-checklist-signature.dto';
import { ChecklistTaskQueryDto } from './dto/checklist-task-query.dto';
import { CreateChecklistRunDto } from './dto/create-checklist-run.dto';
import { CreateChecklistTemplateDto } from './dto/create-checklist-template.dto';
import { SubmitChecklistRunDto } from './dto/submit-checklist-run.dto';
import { UpdateChecklistProgressDto } from './dto/update-checklist-progress.dto';
import { ChecklistsService } from './checklists.service';

@Controller('checklists')
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Get('templates')
  @Roles('ADMIN', 'GESTOR', 'TECNICO')
  listTemplates(@Req() request: Request) {
    return this.checklistsService.listTemplates(getTenantId(request));
  }

  @Post('templates')
  @Roles('ADMIN', 'GESTOR')
  createTemplate(
    @Req() request: Request,
    @CurrentUser() user: AuthUser | undefined,
    @Body() dto: CreateChecklistTemplateDto,
  ) {
    return this.checklistsService.createTemplate(
      getTenantId(request),
      user?.sub,
      dto,
    );
  }

  @Get('tasks')
  @Roles('ADMIN', 'GESTOR', 'TECNICO')
  listTasks(
    @Req() request: Request,
    @CurrentUser() user: AuthUser | undefined,
    @Query() query: ChecklistTaskQueryDto,
  ) {
    return this.checklistsService.listTasks(
      getTenantId(request),
      user?.sub,
      query,
    );
  }

  @Post('runs')
  @Public()
  @Roles('ADMIN', 'GESTOR', 'TECNICO')
  createRun(
    @Req() request: Request,
    @CurrentUser() user: AuthUser | undefined,
    @Body() dto: CreateChecklistRunDto,
  ) {
    return this.checklistsService.createRun(
      getTenantId(request),
      user?.sub,
      dto,
    );
  }

  @Get('runs')
  @Public()
  @Roles('ADMIN', 'GESTOR', 'TECNICO')
  listRuns(@Req() request: Request) {
    return this.checklistsService.listRuns(getTenantId(request));
  }

  @Patch('runs/:id/progress')
  @Roles('ADMIN', 'GESTOR', 'TECNICO')
  updateProgress(
    @Req() request: Request,
    @CurrentUser() user: AuthUser | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateChecklistProgressDto,
  ) {
    return this.checklistsService.updateProgress(
      getTenantId(request),
      user?.sub,
      id,
      dto,
    );
  }

  @Post('runs/:id/submit')
  @Roles('ADMIN', 'GESTOR', 'TECNICO')
  submitRun(
    @Req() request: Request,
    @CurrentUser() user: AuthUser | undefined,
    @Param('id') id: string,
    @Body() dto: SubmitChecklistRunDto,
  ) {
    return this.checklistsService.submitRun(
      getTenantId(request),
      user?.sub,
      id,
      dto,
    );
  }

  @Post('runs/:id/attachments')
  @Roles('ADMIN', 'GESTOR', 'TECNICO')
  addAttachment(
    @Req() request: Request,
    @CurrentUser() user: AuthUser | undefined,
    @Param('id') id: string,
    @Body() dto: AddChecklistAttachmentDto,
  ) {
    return this.checklistsService.addAttachment(
      getTenantId(request),
      user?.sub,
      id,
      dto,
    );
  }

  @Post('runs/:id/signature')
  @Roles('ADMIN', 'GESTOR', 'TECNICO')
  addSignature(
    @Req() request: Request,
    @CurrentUser() user: AuthUser | undefined,
    @Param('id') id: string,
    @Body() dto: AddChecklistSignatureDto,
  ) {
    return this.checklistsService.addSignature(
      getTenantId(request),
      user?.sub,
      id,
      dto,
    );
  }
}
