# DER Visual (Sem Sobreposicao)

Fonte oficial de schema: `apps/api/prisma/schema.prisma`  
Base completa (unica): `docs/DER_SCHEMA_ATUAL.dbml`

Este documento entrega o DER em visoes menores de dominio para leitura clara.
Cada bloco abaixo evita cruzamento excessivo de linhas.

## 01) Identidade e acesso

```mermaid
erDiagram
  TENANTS ||--o{ USERS : "tenantId"
  TENANTS ||--o{ ROLES : "tenantId"
  USERS ||--o{ USER_ROLES : "userId"
  ROLES ||--o{ USER_ROLES : "roleId"
```

## 02) Frota e manutencao

```mermaid
erDiagram
  ASSETS ||--o{ ASSET_STATUS_HISTORY : "assetId"
  ASSETS ||--o{ MAINTENANCE_PLANS : "assetId"
  MAINTENANCE_PLANS ||--o{ MAINTENANCE_RULES : "planId"
  MAINTENANCE_PLANS ||--o{ MAINTENANCE_EXECUTIONS : "planId"
  ASSETS ||--o{ MAINTENANCE_EXECUTIONS : "assetId"
```

## 03) Ordens e agenda

```mermaid
erDiagram
  ASSETS ||--o{ WORK_ORDERS : "assetId"
  USERS ||--o{ WORK_ORDERS : "openedById"
  WORK_ORDERS ||--o{ WORK_ORDER_TASKS : "workOrderId"
  WORK_ORDERS ||--o{ WORK_ORDER_ASSIGNMENTS : "workOrderId"
  USERS ||--o{ WORK_ORDER_ASSIGNMENTS : "userId"
  WORK_ORDERS ||--o{ WORK_ORDER_HISTORY : "workOrderId"
  ASSETS ||--o{ CALENDAR_EVENTS : "assetId (opcional)"
```

## 04) Notificacoes e auditoria

```mermaid
erDiagram
  USERS ||--o{ NOTIFICATIONS : "userId"
  NOTIFICATIONS ||--o{ NOTIFICATION_DELIVERIES : "notificationId"
  USERS o|--o{ AUDIT_LOGS : "userId (opcional)"
  AUDIT_LOGS ||--o{ AUDIT_LOG_ATTRIBUTES : "auditLogId"
```

## 05) Importacao

```mermaid
erDiagram
  IMPORT_JOBS ||--o{ IMPORT_ROWS : "importJobId"
  IMPORT_JOBS ||--o{ IMPORT_ERRORS : "importJobId"
  IMPORT_ROWS o|--o{ IMPORT_ERRORS : "importRowId (opcional)"
  IMPORT_ROWS ||--o{ IMPORT_ROW_FIELDS : "importRowId"
```

## Mapa macro entre dominios

```mermaid
flowchart LR
  A["Identidade e acesso"] --> C["Ordens e agenda"]
  A --> D["Notificacoes e auditoria"]
  B["Frota e manutencao"] --> C
  C --> D
  E["Importacao"] -.independente.- D
```

## Arquivos DBML setoriais (dbdiagram)

- `docs/der-diagramas/01_auth_acesso.dbml`
- `docs/der-diagramas/02_frota_manutencao.dbml`
- `docs/der-diagramas/03_ordens_agenda.dbml`
- `docs/der-diagramas/04_notificacoes_auditoria.dbml`
- `docs/der-diagramas/05_importacao.dbml`
