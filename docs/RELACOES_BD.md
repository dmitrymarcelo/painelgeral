# Relacoes do Banco e Tipos

Fonte: `apps/api/prisma/schema.prisma` (estado atual).

## Auth e acesso
- Tenant 1:N User
- Tenant 1:N Role
- User N:N Role via UserRoleMap

## Frota e manutencao
- Tenant 1:N Asset
- Asset 1:N AssetStatusHistory
- Asset 1:N MaintenancePlan
- MaintenancePlan 1:N MaintenanceRule
- MaintenancePlan 1:N MaintenanceExecution
- Asset 1:N MaintenanceExecution

## Ordens e agenda
- Asset 1:N WorkOrder
- User 1:N WorkOrder (openedBy)
- WorkOrder 1:N WorkOrderTask
- WorkOrder 1:N WorkOrderAssignment
- User 1:N WorkOrderAssignment
- WorkOrder 1:N WorkOrderHistory
- Asset 1:N CalendarEvent (opcional)

## Notificacoes e auditoria
- User 1:N Notification
- Notification 1:N NotificationDelivery
- User 1:N AuditLog (opcional)
- AuditLog 1:N AuditLogAttribute

## Importacao
- ImportJob 1:N ImportRow
- ImportJob 1:N ImportError
- ImportRow 1:N ImportError
- ImportRow 1:N ImportRowField

## Fora do escopo atual
- Checklist
- Combustivel
- Telemetria
