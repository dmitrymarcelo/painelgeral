/**
 * RESPONSABILIDADE:
 * Composicao raiz da API (modulos de dominio + infraestrutura + guards globais).
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - Importa todos os modulos funcionais (auth, assets, calendario, OS, etc.).
 * - Registra guardas globais para throttling, autenticacao JWT e autorizacao por papeis.
 *
 * CONTRATO BACKEND: novos modulos de dominio devem ser registrados aqui e seguir o mesmo
 * padrao de isolamento por feature (`modules/<feature>`).
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AssetsModule } from './modules/assets/assets.module';
import { MaintenancePlansModule } from './modules/maintenance-plans/maintenance-plans.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';
import { ChecklistsModule } from './modules/checklists/checklists.module';
import { QrModule } from './modules/qr/qr.module';
import { TelemetryModule } from './modules/integrations/telemetry/telemetry.module';
import { FuelEntriesModule } from './modules/fuel-entries/fuel-entries.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting global configurado por env.
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: Number(process.env.THROTTLE_TTL ?? 60),
          limit: Number(process.env.THROTTLE_LIMIT ?? 120),
        },
      ],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    AssetsModule,
    MaintenancePlansModule,
    CalendarModule,
    WorkOrdersModule,
    ChecklistsModule,
    QrModule,
    TelemetryModule,
    FuelEntriesModule,
    ReportsModule,
    NotificationsModule,
    AuditLogsModule,
  ],
  providers: [
    // Ordem importa: throttling primeiro, depois autenticacao/autorizacao.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
