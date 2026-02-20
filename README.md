# Frota Pro Monorepo

Monorepo fullstack com:
- `apps/web`: Next.js (Web Console + Mobile PWA)
- `apps/api`: NestJS + Prisma (API REST)
- `packages/types`: enums e tipos compartilhados

## Pré-requisitos
- Node.js 24+
- pnpm 10+
- Docker (para PostgreSQL/Redis local)

## Subir infraestrutura local
```bash
docker compose up -d
```

## Configurar ambientes
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

## Banco de dados
```bash
pnpm --filter @frota/api prisma:migrate --name init
pnpm --filter @frota/api prisma:generate
pnpm --filter @frota/api seed
```

## Rodar em desenvolvimento
```bash
pnpm dev
```

- API: `http://localhost:4000/api/v1`
- Web/PWA: `http://localhost:3000`

## Usuário inicial
- E-mail: `admin@frotapro.local`
- Senha: `Admin@123`

## Endpoints implementados
- Auth: `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`
- Users: `/users`
- Assets: `/assets`, `/assets/import/csv`, `/assets/:id/history`
- Maintenance Plans: `/maintenance-plans`, `/maintenance-plans/:id/rules`
- Calendar: `/calendar/events`
- Work Orders: `/work-orders`, `/work-orders/:id/assign`, `/work-orders/:id/start`, `/work-orders/:id/complete`
- Checklists: `/checklists/templates`, `/checklists/tasks`, `/checklists/runs`, `/checklists/runs/:id/*`
- QR: `/qr/resolve`
- Telemetry: `/integrations/telemetry/:provider/webhook`, `/integrations/telemetry/sync-status`, `/integrations/telemetry/backfill`
- Fuel: `/fuel-entries`, `/fuel-entries/summary`
- Reports: `/reports/dashboard`, `/reports/performance`, `/reports/export/csv`, `/reports/export/pdf`
- Notifications: `/notifications`, `/notifications/:id/read`
- Audit: `/audit-logs`

## Observações
- Arquitetura preparada para multi-tenant (campos `tenant_id` em tabelas de domínio).
- Modo offline-first no app móvel via Dexie (fila local + sincronização).
- Scanner QR integrado via endpoint de resolução de ativo/ações.
