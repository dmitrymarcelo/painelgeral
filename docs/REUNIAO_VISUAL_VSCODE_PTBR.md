# Reuniao Executiva: Visao do Banco (Prisma + DER)

## Como abrir no VS Code
1. Abra este arquivo.
2. Pressione `Ctrl+Shift+V` para abrir o preview Markdown.
3. Deixe lado a lado com `docs/DER_SCHEMA_ATUAL.dbml`.

## Mensagem inicial (30s)
- Este diagrama representa o banco PostgreSQL atual do projeto.
- O Prisma define o schema oficial.
- O DER mostra relacoes e impacto entre modulos.

## Mapa macro

```mermaid
flowchart LR
  A["Identidade e Acesso"] --> C["Ordens e Agenda"]
  A --> D["Notificacoes e Auditoria"]
  B["Frota e Manutencao"] --> C
  C --> D
  E["Importacao"] --> D
```

## 1) Identidade e Acesso

```mermaid
erDiagram
  TENANTS ||--o{ USERS : "tenantId"
  TENANTS ||--o{ ROLES : "tenantId"
  USERS ||--o{ USER_ROLES : "userId"
  ROLES ||--o{ USER_ROLES : "roleId"
```

Fala sugerida:
- `tenants` separa dados por cliente.
- `users`, `roles` e `user_roles` controlam autenticacao e permissoes.

## 2) Frota e Manutencao

```mermaid
erDiagram
  ASSETS ||--o{ ASSET_STATUS_HISTORY : "assetId"
  ASSETS ||--o{ MAINTENANCE_PLANS : "assetId"
  MAINTENANCE_PLANS ||--o{ MAINTENANCE_RULES : "planId"
  MAINTENANCE_PLANS ||--o{ MAINTENANCE_EXECUTIONS : "planId"
  ASSETS ||--o{ MAINTENANCE_EXECUTIONS : "assetId"
```

Fala sugerida:
- `assets` e o cadastro mestre da frota.
- O bloco de manutencao controla plano, regra de gatilho e execucao.

## 3) Ordens e Agenda

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

Fala sugerida:
- `work_orders` organiza o ciclo operacional.
- `tasks`, `assignments` e `history` explicam execucao e rastreabilidade.
- `calendar_events` mostra o planejamento na agenda.

## 4) Notificacoes e Auditoria

```mermaid
erDiagram
  USERS ||--o{ NOTIFICATIONS : "userId"
  NOTIFICATIONS ||--o{ NOTIFICATION_DELIVERIES : "notificationId"
  USERS o|--o{ AUDIT_LOGS : "userId (opcional)"
  AUDIT_LOGS ||--o{ AUDIT_LOG_ATTRIBUTES : "auditLogId"
```

Fala sugerida:
- Notificacao cobre mensagem e entrega por canal.
- Auditoria registra acao, contexto e atributos.

## 5) Importacao

```mermaid
erDiagram
  IMPORT_JOBS ||--o{ IMPORT_ROWS : "importJobId"
  IMPORT_JOBS ||--o{ IMPORT_ERRORS : "importJobId"
  IMPORT_ROWS o|--o{ IMPORT_ERRORS : "importRowId (opcional)"
  IMPORT_ROWS ||--o{ IMPORT_ROW_FIELDS : "importRowId"
```

Fala sugerida:
- `import_jobs` controla o processo.
- `rows`, `errors` e `row_fields` permitem auditoria completa do arquivo importado.

## Fechamento (30s)
- O desenho esta coerente com `apps/api/prisma/schema.prisma`.
- O modelo suporta segregacao multi-tenant, operacao de frota e rastreabilidade.
- A base esta pronta para evolucao sem perder governanca.

## Arquivos de apoio
- DER completo: `docs/DER_SCHEMA_ATUAL.dbml`
- DER por dominio: `docs/DER_DIAGRAMAS_PTBR.md`
- Roteiro com comandos: `docs/REUNIAO_POPULACAO_TABELAS_PTBR.md`
