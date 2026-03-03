# Entrega Tecnica para Diretoria e Time de Backend (PT-BR)

## Objetivo
Consolidar o estado atual do projeto e registrar o contrato tecnico para continuidade do backend/frontend.

## Resumo executivo
- Monorepo: `apps/web`, `apps/api`, `packages/types`
- API ativa em NestJS + Prisma com dominio focado em:
  - autenticacao/autorizacao
  - ativos
  - manutencao preventiva
  - ordens de servico
  - agenda
  - notificacoes
  - auditoria
  - importacoes
- Itens removidos do escopo atual: checklist, combustivel e telemetria.

## Modelos atuais do Prisma
- `Tenant`
- `User`
- `Role`
- `UserRoleMap`
- `AuditLog`
- `AuditLogAttribute`
- `Notification`
- `NotificationDelivery`
- `Asset`
- `AssetStatusHistory`
- `MaintenancePlan`
- `MaintenanceRule`
- `MaintenanceExecution`
- `CalendarEvent`
- `WorkOrder`
- `WorkOrderTask`
- `WorkOrderAssignment`
- `WorkOrderHistory`
- `ImportJob`
- `ImportRow`
- `ImportError`
- `ImportRowField`

## Contratos priorizados de API
- Auth: `/auth/*`
- Assets: `/assets/*`
- Maintenance plans: `/maintenance-plans/*`
- Calendar: `/calendar/events`
- Work orders: `/work-orders/*`
- Reports: `/reports/*`
- Notifications: `/notifications/*`
- Audit logs: `/audit-logs`
- QR: `/qr/resolve`

## Banco e DER
- Motor atual no schema: `PostgreSQL`
- DER completo: `docs/DER_SCHEMA_ATUAL.dbml`
- DER executivo: `docs/DER_EXECUTIVO.dbml`
- Dicionario de persistencia: `docs/DOCUMENTACAO_PERSISTENCIA_PTBR.md`
- Relacoes resumidas: `docs/RELACOES_BD.md`

## Regra de atualizacao documental
Sempre que houver mudanca de schema ou modulo:
1. Atualizar `schema.prisma`
2. Atualizar `docs/DOCUMENTACAO_PERSISTENCIA_PTBR.md`
3. Atualizar `docs/RELACOES_BD.md`
4. Atualizar `docs/DER_SCHEMA_ATUAL.dbml`
5. Atualizar `docs/DER_EXECUTIVO.dbml`
6. Registrar deploy/validacao em `docs/AWS_TEST_ENV.md`
