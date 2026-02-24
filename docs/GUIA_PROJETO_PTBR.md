# Guia do Projeto (PT-BR)

## Visao geral

Este repositorio e um monorepo fullstack para gestao de frota/manutencao preventiva.

- `apps/web`: interface Next.js (painel web + modulo mobile/PWA)
- `apps/api`: API NestJS + Prisma
- `packages/types`: tipos compartilhados do workspace
- `infra`: pasta reservada para suporte/infraestrutura (quando aplicavel)

## Stack principal

- Frontend: Next.js + React + Tailwind CSS
- Backend: NestJS
- Banco: PostgreSQL (via Prisma)
- Cache/fila local: Redis (infra local)
- Offline (frontend): Dexie/IndexedDB
- Monorepo/task runner: pnpm + Turborepo

## Estrutura recomendada para navegar

### 1) Frontend (`apps/web`)

Arquivos importantes:

- `apps/web/app/layout.tsx`
  - Layout raiz, metadata e providers globais.
- `apps/web/app/globals.css`
  - Tema/estilos globais.
- `apps/web/components/layout/web-shell.tsx`
  - Casca/layout do modulo Web (header + sidebar).
- `apps/web/components/layout/mobile-shell.tsx`
  - Casca/layout do modulo App (visual mobile).
- `apps/web/lib/maintenance-store.ts`
  - Fonte local de eventos de manutencao (localStorage + pub/sub por evento custom).
- `apps/web/lib/offline-db.ts`
  - IndexedDB (Dexie) para fila offline e historico de checklist.
- `apps/web/lib/api-client.ts`
  - Cliente de API no frontend.

Paginas principais:

- `apps/web/app/page.tsx` -> portal inicial (selecao Web/App)
- `apps/web/app/web/dashboard/page.tsx` -> dashboard web
- `apps/web/app/web/assets/page.tsx` -> ativos
- `apps/web/app/web/maintenance/page.tsx` -> ordens/manutencao
- `apps/web/app/web/calendar/page.tsx` -> agenda/calendario
- `apps/web/app/app/home/page.tsx` -> painel mobile
- `apps/web/app/app/agenda/page.tsx` -> agenda mobile

Observacao de estado atual:

- As rotas de checklist (`/web/checklist` e `/app/checklist`) foram desativadas e redirecionam.
- A rota de tecnicos (`/web/technicians`) foi desativada e redireciona.

### 2) API (`apps/api`)

Arquivos importantes:

- `apps/api/src/main.ts`
  - Bootstrap da aplicacao NestJS (prefixo global, CORS, validation pipe).
- `apps/api/src/app.module.ts`
  - Composicao dos modulos e guards globais.
- `apps/api/src/prisma/*`
  - Integracao Prisma/Nest.
- `apps/api/prisma/schema.prisma`
  - Schema do banco.
- `apps/api/prisma/seed.ts`
  - Seed inicial.

Modulos de dominio (em `apps/api/src/modules`):

- `auth`
- `users`
- `assets`
- `maintenance-plans`
- `calendar`
- `work-orders`
- `checklists`
- `notifications`
- `reports`
- `fuel-entries`
- `audit-logs`
- `integrations/telemetry`

### 3) Tipos compartilhados (`packages/types`)

- `packages/types/src/*`
  - Tipos/enums usados entre apps.
- `packages/types/dist/*`
  - Build gerado via TypeScript.

## Fluxos funcionais (resumo)

### Fluxo de manutencao preventiva (frontend local)

1. Agendamento/calendario cria ou atualiza eventos em `maintenance-store`
2. Dashboard/ativos/manutencao leem os eventos via `getMaintenanceEvents()`
3. Componentes assinam mudancas via `subscribeMaintenanceEvents()`
4. Mudancas persistem em `localStorage`

### Fluxo offline (quando checklist estava habilitado)

1. Execucao local gera `ChecklistRun`
2. Dados vao para `IndexedDB` (`offline-db.ts`)
3. Fila de acoes (`queue`) guarda payloads pendentes
4. Sincronizacao tenta enviar para API e marca como `synced`

Mesmo com as telas desativadas, a infraestrutura local (Dexie/stores) ainda existe no codigo.

## Comandos importantes

Na raiz do projeto:

```powershell
corepack pnpm install
corepack pnpm --filter @frota/web typecheck
corepack pnpm --filter @frota/api typecheck
corepack pnpm --filter @frota/types build
```

Rodar local (com Docker):

```powershell
docker compose up -d
corepack pnpm --filter @frota/api prisma:generate
corepack pnpm --filter @frota/api prisma:migrate --name init
corepack pnpm --filter @frota/api seed
corepack pnpm dev
```

## Observacoes de manutencao

- `turbo run ...` pode falhar nesta sessao quando o binario do `pnpm` nao estiver no PATH (uso via `corepack`). Nesse caso, rode os scripts por pacote (`--filter`) como fallback.
- O frontend usa muitos dados mock/local (`localStorage` e Dexie), entao comportamento pode variar por navegador/perfil.
- Ao remover funcionalidades da UI, prefira redirecionar rotas primeiro (como feito em checklist/tecnicos) antes de excluir stores/fluxos compartilhados.

## Onde comentar/alterar sem risco alto

- Layout e navegacao: `apps/web/components/layout/*`
- Páginas de apresentacao: `apps/web/app/**/page.tsx`
- Dados mock e navegação mobile/web: `apps/web/lib/mock-data.ts`

## Onde alterar com cuidado (impacto amplo)

- `apps/web/lib/maintenance-store.ts` (afeta varias telas)
- `apps/web/lib/offline-db.ts` (migrações Dexie/IndexedDB)
- `apps/api/src/main.ts` (validacao global/CORS)
- `apps/api/src/app.module.ts` (guards globais e carregamento de modulos)
- `apps/api/prisma/schema.prisma` (migracoes e compatibilidade de banco)
