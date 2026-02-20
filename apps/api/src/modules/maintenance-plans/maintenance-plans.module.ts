import { Module } from '@nestjs/common';
import { MaintenancePlansController } from './maintenance-plans.controller';
import { MaintenancePlansService } from './maintenance-plans.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [MaintenancePlansController],
  providers: [MaintenancePlansService],
})
export class MaintenancePlansModule {}
