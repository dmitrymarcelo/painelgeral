# DOCUMENTACAO DE PERSISTENCIA (Backend API)

## Escopo
- Fonte: `apps/api/prisma/schema.prisma`.
- Motor: PostgreSQL (via Prisma ORM).
- Objetivo: entregar ao time de backend um dicionario completo de dados com PK/FK, relacionamentos e finalidade de negocio.

## Como funciona (visao operacional)
- Multi-tenant: quase todas as entidades operacionais carregam `tenantId` para isolamento por cliente.
- Seguranca e acesso: `User`, `Role`, `UserRoleMap` e `AuditLog` sustentam autenticacao, autorizacao e rastreabilidade.
- Operacao de frota: `Asset` e historicos (`AssetStatusHistory`, `AssetLocation`) concentram estado do ativo.
- Preventiva e execucao: `MaintenancePlan`, `MaintenanceRule`, `MaintenanceExecution`, `CalendarEvent` e `WorkOrder*` formam o ciclo completo de manutencao.
- Evidencias de campo: `Checklist*` e `FuelEntry` registram conformidade e custo operacional.
- Integracoes e lote: `Telematics*`, `TelemetrySync` e `Import*` cobrem sincronizacao externa e processamento de importacoes.

## Enums de dominio
### AssetType
- Valores:
  - `CARRO`
  - `CAMINHAO`
  - `LANCHA`
  - `MOTO`
  - `MAQUINARIO`
### TriggerType
- Valores:
  - `KM`
  - `HORAS`
  - `DATA`
### AssetStatus
- Valores:
  - `DISPONIVEL`
  - `EM_SERVICO`
  - `EM_MANUTENCAO`
  - `PARADO`
### WorkOrderStatus
- Valores:
  - `ABERTA`
  - `EM_ANDAMENTO`
  - `AGUARDANDO`
  - `CONCLUIDA`
  - `CANCELADA`
### WorkOrderPriority
- Valores:
  - `BAIXA`
  - `NORMAL`
  - `ALTA`
  - `URGENTE`
  - `CRITICA`
### ChecklistRunStatus
- Valores:
  - `PENDENTE`
  - `EM_CURSO`
  - `CONCLUIDO`
  - `BLOQUEADO`
### NotificationChannel
- Valores:
  - `IN_APP`
  - `PUSH`
  - `EMAIL`
### UserRole
- Valores:
  - `ADMIN`
  - `GESTOR`
  - `TECNICO`
### CalendarEventType
- Valores:
  - `PREVENTIVA`
  - `CORRETIVA`
  - `VISTORIA`
### CalendarEventStatus
- Valores:
  - `PROGRAMADA`
  - `EM_EXECUCAO`
  - `CONCLUIDA`
  - `CANCELADA`
### ImportStatus
- Valores:
  - `PENDENTE`
  - `PROCESSANDO`
  - `CONCLUIDO`
  - `COM_ERROS`
  - `FALHA`

## Tabelas e entidades
### Tenant (`tenants`)
- Finalidade: Representa o contexto multi-tenant (empresa/cliente) e ancora segregacao de dados.
- PK: `id`
- Chaves unicas: slug (UNIQUE)
- Indices: nao declarados no schema
- Relacionamentos:
  - sem relacoes explicitas de FK no schema

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `slug` | `String` | `VARCHAR(191)` | nao | nao | nao | sim | `-` | - |
| `name` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `timezone` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `"America/Sao_Paulo"` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `updatedAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `-` | Controle de ciclo de vida do registro |
| `users` | `User[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `User` |
| `roles` | `Role[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `Role` |
| `assets` | `Asset[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `Asset` |

### User (`users`)
- Finalidade: Armazena usuarios de autenticacao e perfil basico.
- PK: `id`
- Chaves unicas: @@unique([tenantId, email])
- Indices: @@index([tenantId, isActive])
- Relacionamentos:
  - User (N:1) -> Tenant via [tenantId]
  - User possui relacao com WorkOrder
  - User possui relacao com ChecklistRun
  - User possui relacao com WorkOrderAssignment

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> Tenant.id |
| `email` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `name` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `passwordHash` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `refreshTokenHash` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `isActive` | `Boolean` | `BOOLEAN` | nao | nao | nao | nao | `true` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `updatedAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `-` | Controle de ciclo de vida do registro |
| `tenant` | `Tenant` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `Tenant` |
| `userRoles` | `UserRoleMap[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `UserRoleMap` |
| `auditLogs` | `AuditLog[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `AuditLog` |
| `notifications` | `Notification[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `Notification` |
| `openedWorkOrders` | `WorkOrder[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `WorkOrder` |
| `assignedRuns` | `ChecklistRun[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `ChecklistRun` |
| `assignments` | `WorkOrderAssignment[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `WorkOrderAssignment` |

### Role (`roles`)
- Finalidade: Catalogo de perfis de permissao da aplicacao.
- PK: `id`
- Chaves unicas: @@unique([tenantId, code])
- Indices: @@index([tenantId])
- Relacionamentos:
  - Role (N:1) -> Tenant via [tenantId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> Tenant.id |
| `code` | `UserRole` | `ENUM(UserRole)` | nao | nao | nao | nao | `-` | Estado/classificacao controlado por enum `UserRole` |
| `name` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `tenant` | `Tenant` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `Tenant` |
| `userRoles` | `UserRoleMap[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `UserRoleMap` |

### UserRoleMap (`user_roles`)
- Finalidade: Tabela de associacao N:N entre usuarios e perfis.
- PK: `id`
- Chaves unicas: @@unique([tenantId, userId, roleId])
- Indices: @@index([tenantId, userId])
- Relacionamentos:
  - UserRoleMap (N:1) -> User via [userId]
  - UserRoleMap (N:1) -> Role via [roleId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `userId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> User.id |
| `roleId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> Role.id |
| `assignedAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | - |
| `user` | `User` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `User` |
| `role` | `Role` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `Role` |

### AuditLog (`audit_logs`)
- Finalidade: Registro de trilha de auditoria para acoes sensiveis no sistema.
- PK: `id`
- Chaves unicas: nenhuma alem de PK
- Indices: @@index([tenantId, resource, createdAt]), @@index([tenantId, userId])
- Relacionamentos:
  - AuditLog (N:1) -> User via [userId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `userId` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | FK -> User.id |
| `action` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `resource` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `resourceId` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `payload` | `Json?` | `JSONB` | sim | nao | nao | nao | `-` | - |
| `ipAddress` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `userAgent` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `user` | `User?` | `TEXT` | sim | nao | nao | nao | `-` | Relacao de navegacao para `User` |

### Notification (`notifications`)
- Finalidade: Mensagens/notificacoes geradas para usuarios e modulos.
- PK: `id`
- Chaves unicas: nenhuma alem de PK
- Indices: @@index([tenantId, userId, isRead])
- Relacionamentos:
  - Notification (N:1) -> User via [userId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `userId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> User.id |
| `title` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `body` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `isRead` | `Boolean` | `BOOLEAN` | nao | nao | nao | nao | `false` | - |
| `readAt` | `DateTime?` | `TIMESTAMP` | sim | nao | nao | nao | `-` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `user` | `User` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `User` |
| `deliveries` | `NotificationDelivery[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `NotificationDelivery` |

### NotificationDelivery (`notification_deliveries`)
- Finalidade: Controle de entrega/leitura por usuario para cada notificacao.
- PK: `id`
- Chaves unicas: nenhuma alem de PK
- Indices: @@index([tenantId, channel, status])
- Relacionamentos:
  - NotificationDelivery (N:1) -> Notification via [notificationId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `notificationId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> Notification.id |
| `channel` | `NotificationChannel` | `ENUM(NotificationChannel)` | nao | nao | nao | nao | `-` | Estado/classificacao controlado por enum `NotificationChannel` |
| `status` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `providerId` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `sentAt` | `DateTime?` | `TIMESTAMP` | sim | nao | nao | nao | `-` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `notification` | `Notification` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `Notification` |

### Asset (`assets`)
- Finalidade: Cadastro de ativos da frota (veiculos/equipamentos) e metadados operacionais.
- PK: `id`
- Chaves unicas: qrCode (UNIQUE), @@unique([tenantId, code])
- Indices: @@index([tenantId, type, status]), @@index([tenantId, plate])
- Relacionamentos:
  - Asset (N:1) -> Tenant via [tenantId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> Tenant.id |
| `code` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `plate` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `type` | `AssetType` | `ENUM(AssetType)` | nao | nao | nao | nao | `-` | Estado/classificacao controlado por enum `AssetType` |
| `model` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `manufacturer` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `status` | `AssetStatus` | `ENUM(AssetStatus)` | nao | nao | nao | nao | `DISPONIVEL` | Estado/classificacao controlado por enum `AssetStatus` |
| `odometerKm` | `Float?` | `DOUBLE PRECISION` | sim | nao | nao | nao | `-` | - |
| `engineHours` | `Float?` | `DOUBLE PRECISION` | sim | nao | nao | nao | `-` | - |
| `locationName` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `qrCode` | `String?` | `VARCHAR(191)` | sim | nao | nao | sim | `-` | - |
| `telemetryLastAt` | `DateTime?` | `TIMESTAMP` | sim | nao | nao | nao | `-` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `updatedAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `-` | Controle de ciclo de vida do registro |
| `tenant` | `Tenant` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `Tenant` |
| `statusHistory` | `AssetStatusHistory[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `AssetStatusHistory` |
| `locations` | `AssetLocation[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `AssetLocation` |
| `telematicsDevices` | `TelematicsDevice[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `TelematicsDevice` |
| `telematicsReadings` | `TelematicsReading[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `TelematicsReading` |
| `maintenancePlans` | `MaintenancePlan[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `MaintenancePlan` |
| `maintenanceExecutions` | `MaintenanceExecution[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `MaintenanceExecution` |
| `calendarEvents` | `CalendarEvent[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `CalendarEvent` |
| `workOrders` | `WorkOrder[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `WorkOrder` |
| `checklistRuns` | `ChecklistRun[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `ChecklistRun` |
| `fuelEntries` | `FuelEntry[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `FuelEntry` |

### AssetStatusHistory (`asset_status_history`)
- Finalidade: Historico temporal de mudanca de status do ativo.
- PK: `id`
- Chaves unicas: nenhuma alem de PK
- Indices: @@index([tenantId, assetId, createdAt])
- Relacionamentos:
  - AssetStatusHistory (N:1) -> Asset via [assetId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `assetId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> Asset.id |
| `status` | `AssetStatus` | `ENUM(AssetStatus)` | nao | nao | nao | nao | `-` | Estado/classificacao controlado por enum `AssetStatus` |
| `reason` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `changedById` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `asset` | `Asset` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `Asset` |

### AssetLocation (`asset_locations`)
- Finalidade: Historico/estado de localizacao operacional do ativo.
- PK: `id`
- Chaves unicas: nenhuma alem de PK
- Indices: @@index([tenantId, assetId, recordedAt])
- Relacionamentos:
  - AssetLocation (N:1) -> Asset via [assetId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `assetId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> Asset.id |
| `latitude` | `Float?` | `DOUBLE PRECISION` | sim | nao | nao | nao | `-` | - |
| `longitude` | `Float?` | `DOUBLE PRECISION` | sim | nao | nao | nao | `-` | - |
| `name` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `recordedAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | - |
| `asset` | `Asset` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `Asset` |

### TelematicsDevice (`telematics_devices`)
- Finalidade: Dispositivo de telemetria vinculado ao ativo.
- PK: `id`
- Chaves unicas: @@unique([tenantId, provider, externalId])
- Indices: @@index([tenantId, assetId])
- Relacionamentos:
  - TelematicsDevice (N:1) -> Asset via [assetId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `assetId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> Asset.id |
| `provider` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `externalId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `isActive` | `Boolean` | `BOOLEAN` | nao | nao | nao | nao | `true` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `asset` | `Asset` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `Asset` |

### TelematicsReading (`telematics_readings`)
- Finalidade: Leituras de telemetria (km, horimetro, sinais etc.) por dispositivo.
- PK: `id`
- Chaves unicas: @@unique([tenantId, provider, externalEventId])
- Indices: @@index([tenantId, assetId, recordedAt])
- Relacionamentos:
  - TelematicsReading (N:1) -> Asset via [assetId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `assetId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> Asset.id |
| `provider` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `externalEventId` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `odometerKm` | `Float?` | `DOUBLE PRECISION` | sim | nao | nao | nao | `-` | - |
| `engineHours` | `Float?` | `DOUBLE PRECISION` | sim | nao | nao | nao | `-` | - |
| `recordedAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `-` | - |
| `rawPayload` | `Json?` | `JSONB` | sim | nao | nao | nao | `-` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `asset` | `Asset` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `Asset` |

### MaintenancePlan (`maintenance_plans`)
- Finalidade: Plano preventivo por ativo (cabecalho de periodicidade e meta).
- PK: `id`
- Chaves unicas: nenhuma alem de PK
- Indices: @@index([tenantId, assetId, isActive])
- Relacionamentos:
  - MaintenancePlan (N:1) -> Asset via [assetId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `assetId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> Asset.id |
| `title` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `description` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `isActive` | `Boolean` | `BOOLEAN` | nao | nao | nao | nao | `true` | - |
| `nextDueAt` | `DateTime?` | `TIMESTAMP` | sim | nao | nao | nao | `-` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `updatedAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `-` | Controle de ciclo de vida do registro |
| `asset` | `Asset` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `Asset` |
| `rules` | `MaintenanceRule[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `MaintenanceRule` |
| `executions` | `MaintenanceExecution[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `MaintenanceExecution` |

### MaintenanceRule (`maintenance_rules`)
- Finalidade: Regras/limiares do plano preventivo (tempo, km, horimetro).
- PK: `id`
- Chaves unicas: nenhuma alem de PK
- Indices: @@index([tenantId, planId])
- Relacionamentos:
  - MaintenanceRule (N:1) -> MaintenancePlan via [planId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `planId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> MaintenancePlan.id |
| `triggerType` | `TriggerType` | `ENUM(TriggerType)` | nao | nao | nao | nao | `-` | Estado/classificacao controlado por enum `TriggerType` |
| `intervalValue` | `Float` | `DOUBLE PRECISION` | nao | nao | nao | nao | `-` | - |
| `warningValue` | `Float?` | `DOUBLE PRECISION` | sim | nao | nao | nao | `-` | - |
| `lastValue` | `Float?` | `DOUBLE PRECISION` | sim | nao | nao | nao | `-` | - |
| `nextValue` | `Float?` | `DOUBLE PRECISION` | sim | nao | nao | nao | `-` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `updatedAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `-` | Controle de ciclo de vida do registro |
| `plan` | `MaintenancePlan` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `MaintenancePlan` |

### MaintenanceExecution (`maintenance_executions`)
- Finalidade: Execucoes reais de manutencao relacionadas ao plano.
- PK: `id`
- Chaves unicas: nenhuma alem de PK
- Indices: @@index([tenantId, planId, status])
- Relacionamentos:
  - MaintenanceExecution (N:1) -> MaintenancePlan via [planId]
  - MaintenanceExecution (N:1) -> Asset via [assetId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `planId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> MaintenancePlan.id |
| `assetId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> Asset.id |
| `dueAt` | `DateTime?` | `TIMESTAMP` | sim | nao | nao | nao | `-` | - |
| `dueValue` | `Float?` | `DOUBLE PRECISION` | sim | nao | nao | nao | `-` | - |
| `executedAt` | `DateTime?` | `TIMESTAMP` | sim | nao | nao | nao | `-` | - |
| `status` | `WorkOrderStatus` | `ENUM(WorkOrderStatus)` | nao | nao | nao | nao | `ABERTA` | Estado/classificacao controlado por enum `WorkOrderStatus` |
| `workOrderId` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `plan` | `MaintenancePlan` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `MaintenancePlan` |
| `asset` | `Asset` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `Asset` |

### CalendarEvent (`calendar_events`)
- Finalidade: Eventos de agenda operacional e preventiva no calendario.
- PK: `id`
- Chaves unicas: nenhuma alem de PK
- Indices: @@index([tenantId, startAt, type]), @@index([tenantId, status])
- Relacionamentos:
  - CalendarEvent (N:1) -> Asset via [assetId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `title` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `description` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `type` | `CalendarEventType` | `ENUM(CalendarEventType)` | nao | nao | nao | nao | `-` | Estado/classificacao controlado por enum `CalendarEventType` |
| `status` | `CalendarEventStatus` | `ENUM(CalendarEventStatus)` | nao | nao | nao | nao | `PROGRAMADA` | Estado/classificacao controlado por enum `CalendarEventStatus` |
| `startAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `-` | - |
| `endAt` | `DateTime?` | `TIMESTAMP` | sim | nao | nao | nao | `-` | - |
| `assetId` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | FK -> Asset.id |
| `workOrderId` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `updatedAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `-` | Controle de ciclo de vida do registro |
| `asset` | `Asset?` | `TEXT` | sim | nao | nao | nao | `-` | Relacao de navegacao para `Asset` |

### WorkOrder (`work_orders`)
- Finalidade: Ordem de servico principal (status, prioridade, responsaveis, SLA).
- PK: `id`
- Chaves unicas: @@unique([tenantId, code])
- Indices: @@index([tenantId, status, priority]), @@index([tenantId, assetId])
- Relacionamentos:
  - WorkOrder (N:1) -> Asset via [assetId]
  - WorkOrder (N:1) -> User via [openedById]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `code` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `assetId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> Asset.id |
| `service` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `description` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `priority` | `WorkOrderPriority` | `ENUM(WorkOrderPriority)` | nao | nao | nao | nao | `NORMAL` | Estado/classificacao controlado por enum `WorkOrderPriority` |
| `status` | `WorkOrderStatus` | `ENUM(WorkOrderStatus)` | nao | nao | nao | nao | `ABERTA` | Estado/classificacao controlado por enum `WorkOrderStatus` |
| `dueAt` | `DateTime?` | `TIMESTAMP` | sim | nao | nao | nao | `-` | - |
| `openedById` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> User.id |
| `startedAt` | `DateTime?` | `TIMESTAMP` | sim | nao | nao | nao | `-` | - |
| `completedAt` | `DateTime?` | `TIMESTAMP` | sim | nao | nao | nao | `-` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `updatedAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `-` | Controle de ciclo de vida do registro |
| `asset` | `Asset` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `Asset` |
| `openedBy` | `User` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `User` |
| `tasks` | `WorkOrderTask[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `WorkOrderTask` |
| `assignments` | `WorkOrderAssignment[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `WorkOrderAssignment` |
| `history` | `WorkOrderHistory[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `WorkOrderHistory` |
| `checklistRuns` | `ChecklistRun[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `ChecklistRun` |

### WorkOrderTask (`work_order_tasks`)
- Finalidade: Itens/tarefas que compoem uma ordem de servico.
- PK: `id`
- Chaves unicas: nenhuma alem de PK
- Indices: @@index([tenantId, workOrderId])
- Relacionamentos:
  - WorkOrderTask (N:1) -> WorkOrder via [workOrderId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `workOrderId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> WorkOrder.id |
| `title` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `isDone` | `Boolean` | `BOOLEAN` | nao | nao | nao | nao | `false` | - |
| `sortOrder` | `Int` | `INTEGER` | nao | nao | nao | nao | `0` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `workOrder` | `WorkOrder` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `WorkOrder` |

### WorkOrderAssignment (`work_order_assignments`)
- Finalidade: Vinculo de tecnicos/responsaveis a ordem de servico.
- PK: `id`
- Chaves unicas: @@unique([tenantId, workOrderId, userId])
- Indices: @@index([tenantId, userId])
- Relacionamentos:
  - WorkOrderAssignment (N:1) -> WorkOrder via [workOrderId]
  - WorkOrderAssignment (N:1) -> User via [userId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `workOrderId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> WorkOrder.id |
| `userId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> User.id |
| `assignedAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | - |
| `workOrder` | `WorkOrder` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `WorkOrder` |
| `user` | `User` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `User` |

### WorkOrderHistory (`work_order_history`)
- Finalidade: Historico de transicoes e ocorrencias da ordem de servico.
- PK: `id`
- Chaves unicas: nenhuma alem de PK
- Indices: @@index([tenantId, workOrderId, createdAt])
- Relacionamentos:
  - WorkOrderHistory (N:1) -> WorkOrder via [workOrderId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `workOrderId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> WorkOrder.id |
| `fromStatus` | `WorkOrderStatus?` | `ENUM(WorkOrderStatus)` | sim | nao | nao | nao | `-` | Estado/classificacao controlado por enum `WorkOrderStatus` |
| `toStatus` | `WorkOrderStatus` | `ENUM(WorkOrderStatus)` | nao | nao | nao | nao | `-` | Estado/classificacao controlado por enum `WorkOrderStatus` |
| `note` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `createdById` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `workOrder` | `WorkOrder` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `WorkOrder` |

### ChecklistTemplate (`checklist_templates`)
- Finalidade: Template de checklist reutilizavel por tipo de manutencao.
- PK: `id`
- Chaves unicas: nenhuma alem de PK
- Indices: @@index([tenantId, isActive])
- Relacionamentos:
  - sem relacoes explicitas de FK no schema

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `name` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `description` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `isActive` | `Boolean` | `BOOLEAN` | nao | nao | nao | nao | `true` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `updatedAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `-` | Controle de ciclo de vida do registro |
| `items` | `ChecklistTemplateItem[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `ChecklistTemplateItem` |
| `runs` | `ChecklistRun[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `ChecklistRun` |

### ChecklistTemplateItem (`checklist_template_items`)
- Finalidade: Perguntas/itens de um template de checklist.
- PK: `id`
- Chaves unicas: nenhuma alem de PK
- Indices: @@index([tenantId, templateId, sortOrder])
- Relacionamentos:
  - ChecklistTemplateItem (N:1) -> ChecklistTemplate via [templateId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `templateId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> ChecklistTemplate.id |
| `label` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `itemType` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `required` | `Boolean` | `BOOLEAN` | nao | nao | nao | nao | `true` | - |
| `sortOrder` | `Int` | `INTEGER` | nao | nao | nao | nao | `0` | - |
| `template` | `ChecklistTemplate` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `ChecklistTemplate` |
| `answers` | `ChecklistAnswer[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `ChecklistAnswer` |

### ChecklistRun (`checklist_runs`)
- Finalidade: Execucao de checklist para ativo/OS/evento.
- PK: `id`
- Chaves unicas: @@unique([tenantId, idempotencyKey])
- Indices: @@index([tenantId, status, assignedToId])
- Relacionamentos:
  - ChecklistRun (N:1) -> ChecklistTemplate via [templateId]
  - ChecklistRun (N:1) -> Asset via [assetId]
  - ChecklistRun (N:1) -> WorkOrder via [workOrderId]
  - ChecklistRun (N:1) -> User via [assignedToId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `templateId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> ChecklistTemplate.id |
| `assetId` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | FK -> Asset.id |
| `workOrderId` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | FK -> WorkOrder.id |
| `assignedToId` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | FK -> User.id |
| `status` | `ChecklistRunStatus` | `ENUM(ChecklistRunStatus)` | nao | nao | nao | nao | `PENDENTE` | Estado/classificacao controlado por enum `ChecklistRunStatus` |
| `idempotencyKey` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `startedAt` | `DateTime?` | `TIMESTAMP` | sim | nao | nao | nao | `-` | - |
| `completedAt` | `DateTime?` | `TIMESTAMP` | sim | nao | nao | nao | `-` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `updatedAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `-` | Controle de ciclo de vida do registro |
| `template` | `ChecklistTemplate` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `ChecklistTemplate` |
| `asset` | `Asset?` | `TEXT` | sim | nao | nao | nao | `-` | Relacao de navegacao para `Asset` |
| `workOrder` | `WorkOrder?` | `TEXT` | sim | nao | nao | nao | `-` | Relacao de navegacao para `WorkOrder` |
| `assignedTo` | `User?` | `TEXT` | sim | nao | nao | nao | `-` | Relacao de navegacao para `User` |
| `answers` | `ChecklistAnswer[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `ChecklistAnswer` |
| `attachments` | `ChecklistAttachment[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `ChecklistAttachment` |
| `signatures` | `ChecklistSignature[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `ChecklistSignature` |

### ChecklistAnswer (`checklist_answers`)
- Finalidade: Resposta individual para cada item durante execucao de checklist.
- PK: `id`
- Chaves unicas: @@unique([tenantId, runId, templateItemId])
- Indices: @@index([tenantId, runId])
- Relacionamentos:
  - ChecklistAnswer (N:1) -> ChecklistRun via [runId]
  - ChecklistAnswer (N:1) -> ChecklistTemplateItem via [templateItemId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `runId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> ChecklistRun.id |
| `templateItemId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> ChecklistTemplateItem.id |
| `value` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `note` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `run` | `ChecklistRun` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `ChecklistRun` |
| `templateItem` | `ChecklistTemplateItem` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `ChecklistTemplateItem` |

### ChecklistAttachment (`checklist_attachments`)
- Finalidade: Anexos (foto/arquivo) vinculados a execucoes/respostas.
- PK: `id`
- Chaves unicas: nenhuma alem de PK
- Indices: @@index([tenantId, runId])
- Relacionamentos:
  - ChecklistAttachment (N:1) -> ChecklistRun via [runId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `runId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> ChecklistRun.id |
| `url` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `mimeType` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `size` | `Int` | `INTEGER` | nao | nao | nao | nao | `-` | - |
| `note` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `run` | `ChecklistRun` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `ChecklistRun` |

### ChecklistSignature (`checklist_signatures`)
- Finalidade: Assinaturas eletronicamente vinculadas a checklist run.
- PK: `id`
- Chaves unicas: nenhuma alem de PK
- Indices: @@index([tenantId, runId])
- Relacionamentos:
  - ChecklistSignature (N:1) -> ChecklistRun via [runId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `runId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> ChecklistRun.id |
| `signedById` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `signerName` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `dataUrl` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `signedAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | - |
| `run` | `ChecklistRun` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `ChecklistRun` |

### FuelEntry (`fuel_entries`)
- Finalidade: Lancamentos de abastecimento e consumo por ativo.
- PK: `id`
- Chaves unicas: nenhuma alem de PK
- Indices: @@index([tenantId, fueledAt]), @@index([tenantId, assetId])
- Relacionamentos:
  - FuelEntry (N:1) -> Asset via [assetId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `assetId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> Asset.id |
| `liters` | `Float` | `DOUBLE PRECISION` | nao | nao | nao | nao | `-` | - |
| `unitPrice` | `Float` | `DOUBLE PRECISION` | nao | nao | nao | nao | `-` | - |
| `totalPrice` | `Float` | `DOUBLE PRECISION` | nao | nao | nao | nao | `-` | - |
| `odometerKm` | `Float?` | `DOUBLE PRECISION` | sim | nao | nao | nao | `-` | - |
| `fueledAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `-` | - |
| `stationName` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `note` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `asset` | `Asset` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `Asset` |

### ImportJob (`import_jobs`)
- Finalidade: Controle de jobs de importacao em lote.
- PK: `id`
- Chaves unicas: nenhuma alem de PK
- Indices: @@index([tenantId, resource, status])
- Relacionamentos:
  - sem relacoes explicitas de FK no schema

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `resource` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `status` | `ImportStatus` | `ENUM(ImportStatus)` | nao | nao | nao | nao | `PENDENTE` | Estado/classificacao controlado por enum `ImportStatus` |
| `totalRows` | `Int` | `INTEGER` | nao | nao | nao | nao | `0` | - |
| `successRows` | `Int` | `INTEGER` | nao | nao | nao | nao | `0` | - |
| `errorRows` | `Int` | `INTEGER` | nao | nao | nao | nao | `0` | - |
| `createdById` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `updatedAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `-` | Controle de ciclo de vida do registro |
| `rows` | `ImportRow[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `ImportRow` |
| `errors` | `ImportError[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `ImportError` |

### ImportRow (`import_rows`)
- Finalidade: Linhas processadas em um job de importacao.
- PK: `id`
- Chaves unicas: nenhuma alem de PK
- Indices: @@index([tenantId, importJobId, rowNumber])
- Relacionamentos:
  - ImportRow (N:1) -> ImportJob via [importJobId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `importJobId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> ImportJob.id |
| `rowNumber` | `Int` | `INTEGER` | nao | nao | nao | nao | `-` | - |
| `payload` | `Json` | `JSONB` | nao | nao | nao | nao | `-` | - |
| `status` | `ImportStatus` | `ENUM(ImportStatus)` | nao | nao | nao | nao | `PENDENTE` | Estado/classificacao controlado por enum `ImportStatus` |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `importJob` | `ImportJob` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `ImportJob` |
| `errors` | `ImportError[]` | `JSONB (array)` | nao | sim | nao | nao | `-` | Relacao de navegacao para `ImportError` |

### ImportError (`import_errors`)
- Finalidade: Erros detalhados ocorridos no processamento de importacao.
- PK: `id`
- Chaves unicas: nenhuma alem de PK
- Indices: @@index([tenantId, importJobId])
- Relacionamentos:
  - ImportError (N:1) -> ImportJob via [importJobId]
  - ImportError (N:1) -> ImportRow via [importRowId]

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `importJobId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | FK -> ImportJob.id |
| `importRowId` | `String?` | `VARCHAR(191)` | sim | nao | nao | nao | `-` | FK -> ImportRow.id |
| `code` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `message` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `importJob` | `ImportJob` | `TEXT` | nao | nao | nao | nao | `-` | Relacao de navegacao para `ImportJob` |
| `importRow` | `ImportRow?` | `TEXT` | sim | nao | nao | nao | `-` | Relacao de navegacao para `ImportRow` |

### TelemetrySync (`telemetry_sync`)
- Finalidade: Controle de sincronizacao com provedores externos de telemetria.
- PK: `id`
- Chaves unicas: @@unique([tenantId, provider])
- Indices: nao declarados no schema
- Relacionamentos:
  - sem relacoes explicitas de FK no schema

| Campo | Tipo Prisma | Tipo SQL sugerido | Nulo | Lista | PK | Unique | Default | Comentario |
|---|---|---|---|---|---|---|---|---|
| `id` | `String` | `VARCHAR(191)` | nao | nao | sim | nao | `cuid(` | - |
| `tenantId` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `provider` | `String` | `VARCHAR(191)` | nao | nao | nao | nao | `-` | - |
| `lastWebhookAt` | `DateTime?` | `TIMESTAMP` | sim | nao | nao | nao | `-` | - |
| `lastBackfillAt` | `DateTime?` | `TIMESTAMP` | sim | nao | nao | nao | `-` | - |
| `totalEvents` | `Int` | `INTEGER` | nao | nao | nao | nao | `0` | - |
| `createdAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `now(` | Controle de ciclo de vida do registro |
| `updatedAt` | `DateTime` | `TIMESTAMP` | nao | nao | nao | nao | `-` | Controle de ciclo de vida do registro |

## Relacionamentos globais (resumo)
- `Tenant` e entidade raiz para segregacao de dados operacionais.
- `User` -> `UserRoleMap` <- `Role` implementa autorizacao por perfis.
- `Asset` e entidade central de frota e se conecta a telemetria, manutencao, checklist, abastecimento e agenda.
- `MaintenancePlan` + `MaintenanceRule` produzem agenda (`CalendarEvent`) e execucao (`MaintenanceExecution`, `WorkOrder`).
- `WorkOrder` detalha execucao via tarefas, atribuicoes e historico (`WorkOrderTask`, `WorkOrderAssignment`, `WorkOrderHistory`).
- `ChecklistRun` deriva de template e gera respostas, anexos e assinatura (`ChecklistAnswer`, `ChecklistAttachment`, `ChecklistSignature`).
- `ImportJob` agrega `ImportRow` e `ImportError` para rastreio de carga em lote.

## Observacoes de implementacao backend
- IDs atuais no schema sao majoritariamente `String` com `cuid()`; se houver migracao para UUID, alinhar DTOs e integracoes.
- Para alta escala, revisar indices compostos por `tenantId + status + createdAt` nas consultas mais usadas.
- Adotar soft-delete padrao nas entidades sensiveis de auditoria/compliance quando necessario.
- Em fluxos multi-tenant, sempre validar `tenantId` do token contra `tenantId` do recurso.