# Guia do Projeto (PT-BR)

> Complemento de handoff: `docs/ENTREGA_BACKEND_DIRETORIA_PTBR.md`

## Visao geral
Monorepo fullstack para gestao de frota/manutencao preventiva.

- `apps/web`: Next.js (Web + App)
- `apps/api`: NestJS + Prisma
- `packages/types`: tipos compartilhados
- `infra`: scripts e suporte de infraestrutura

## Stack atual
- Frontend: Next.js + React + Tailwind
- Backend: NestJS
- Banco: PostgreSQL via Prisma
- Monorepo: pnpm + Turborepo

## Backend (modulos ativos)
- `auth`
- `users`
- `assets`
- `maintenance-plans`
- `calendar`
- `work-orders`
- `reports`
- `notifications`
- `audit-logs`
- `qr`

## Documentacao de banco
- Persistencia: `docs/DOCUMENTACAO_PERSISTENCIA_PTBR.md`
- Relacoes: `docs/RELACOES_BD.md`
- DER completo: `docs/DER_SCHEMA_ATUAL.dbml`
- DER executivo: `docs/DER_EXECUTIVO.dbml`

## Comandos principais
```powershell
corepack pnpm install
corepack pnpm --filter @frota/api prisma:generate
corepack pnpm --filter @frota/api typecheck
corepack pnpm --filter @frota/web typecheck
```

## Run local
```powershell
docker compose up -d
corepack pnpm --filter @frota/api prisma:migrate --name init
corepack pnpm --filter @frota/api prisma:generate
corepack pnpm --filter @frota/api seed
corepack pnpm dev
```

## Observacoes
- Em mudanca de schema, atualizar sempre os 4 arquivos de banco (persistencia, relacoes, der completo, der executivo).
- Em caso de deploy, atualizar `docs/AWS_TEST_ENV.md` com data, commit e validacao HTTP.
