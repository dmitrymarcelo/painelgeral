# DOCUMENTACAO DE PERSISTENCIA (Backend API)

## Escopo
- Fonte oficial: `apps/api/prisma/schema.prisma`
- Motor atual: `SQLite` (Prisma)
- Ultima revisao: `2026-03-02`

## Situacao do dominio
- Multi-tenant com `tenantId` nas entidades operacionais.
- Nucleo funcional atual: autenticacao/autorizacao, ativos, manutencao preventiva, ordens de servico, calendario, notificacoes, auditoria e importacoes.
- Fora do escopo atual: checklist, combustivel e telemetria.

## Enums
- `AssetType`: CARRO, CAMINHAO, LANCHA, MOTO, MAQUINARIO
- `TriggerType`: KM, HORAS, DATA
- `AssetStatus`: DISPONIVEL, EM_SERVICO, EM_MANUTENCAO, PARADO
- `WorkOrderStatus`: ABERTA, EM_ANDAMENTO, AGUARDANDO, CONCLUIDA, CANCELADA
- `WorkOrderPriority`: BAIXA, NORMAL, ALTA, URGENTE, CRITICA
- `NotificationChannel`: IN_APP, PUSH, EMAIL
- `UserRole`: ADMIN, GESTOR, TECNICO
- `CalendarEventType`: PREVENTIVA, CORRETIVA, VISTORIA
- `CalendarEventStatus`: PROGRAMADA, EM_EXECUCAO, CONCLUIDA, CANCELADA
- `ImportStatus`: PENDENTE, PROCESSANDO, CONCLUIDO, COM_ERROS, FALHA

## Entidades e finalidade
- `tenants`: raiz de isolamento multi-tenant.
- `users`: usuarios autenticaveis por tenant.
- `roles`: papeis de acesso por tenant.
- `user_roles`: associacao N:N entre usuarios e papeis.
- `assets`: cadastro de ativos de frota.
- `asset_status_history`: historico de status do ativo.
- `maintenance_plans`: plano preventivo por ativo.
- `maintenance_rules`: regra de gatilho por plano.
- `maintenance_executions`: execucao gerada por plano.
- `work_orders`: ordem de servico.
- `work_order_tasks`: tarefas da OS.
- `work_order_assignments`: atribuicao de usuarios na OS.
- `work_order_history`: transicoes de status e anotacoes da OS.
- `calendar_events`: agenda operacional.
- `notifications`: notificacoes por usuario.
- `notification_deliveries`: status de entrega por canal.
- `audit_logs`: trilha de auditoria.
- `audit_log_attributes`: atributos normalizados do log.
- `import_jobs`: job de importacao.
- `import_rows`: linhas importadas.
- `import_errors`: erros da importacao.
- `import_row_fields`: campos normalizados por linha de importacao.

## Relacoes principais
- Tenant 1:N Users, Roles, Assets.
- User N:N Role via `user_roles`.
- Asset 1:N MaintenancePlan, MaintenanceExecution, WorkOrder, CalendarEvent, AssetStatusHistory.
- MaintenancePlan 1:N MaintenanceRule, MaintenanceExecution.
- WorkOrder 1:N WorkOrderTask, WorkOrderAssignment, WorkOrderHistory.
- Notification 1:N NotificationDelivery.
- ImportJob 1:N ImportRow e ImportError.
- AuditLog 1:N AuditLogAttribute.

## Integridade e indices importantes
- Unicos:
  - `tenants.slug`
  - `users(tenantId, email)`
  - `roles(tenantId, code)`
  - `user_roles(tenantId, userId, roleId)`
  - `assets(tenantId, code)`
  - `assets.qrCode`
  - `work_orders(tenantId, code)`
- Indices operacionais:
  - `assets(tenantId, type, status)`
  - `maintenance_plans(tenantId, assetId, isActive)`
  - `maintenance_executions(tenantId, planId, status)`
  - `work_orders(tenantId, status, priority)`
  - `calendar_events(tenantId, startAt, type)`

## DERs oficiais
- Completo: `docs/DER_SCHEMA_ATUAL.dbml`
- Executivo (reduzido): `docs/DER_EXECUTIVO.dbml`
