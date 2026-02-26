# Guia do Projeto (PT-BR)

> Complemento de handoff (diretoria + backend): `docs/ENTREGA_BACKEND_DIRETORIA_PTBR.md`

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
- Em rotas App Router com `useSearchParams` (ex.: calendario), use `Suspense` para evitar erro de prerender em build/deploy (Next.js/Netlify).
- Em deploy Netlify com Next.js (monorepo), use `@netlify/plugin-nextjs` e configure `publish` para o distDir do app (`apps/web/.next`).
- Evite `publish` apontando para a raiz do repositorio (o plugin Next.js falha no pre-build).

## Deploy rapido (AWS Amplify - frontend)

Para testes e demonstracao, a forma mais rapida e publicar somente `apps/web` no AWS Amplify.

### Pre-requisitos

- Repositorio atualizado no GitHub
- Arquivo `amplify.yml` na raiz do projeto (ja incluido)

### Passos (Console AWS)

1. Abrir `AWS Amplify` -> `Hospedagem` -> `Create app / Host web app`
2. Conectar ao GitHub e selecionar o repositorio `dmitrymarcelo/painelgeral`
3. Selecionar a branch desejada (`main` para teste rapido)
4. Confirmar monorepo com `App root = apps/web`
5. Usar o build spec detectado (`amplify.yml`)
6. Iniciar deploy

### Observacao

- Este deploy sobe o frontend Next.js com fluxos locais/mock/fallback.
- Para operacao real multiusuario sera necessario publicar a API (`apps/api`) + banco + redis.
- Em monorepo (`appRoot = apps/web`), no `amplify.yml` use `artifacts.baseDirectory: .next` (relativo ao app root).
- Nao use `apps/web/.next` no `baseDirectory`, pois o Amplify falha com `Artifact directory doesn't exist`.

## Deploy rapido fullstack (AWS EC2 + Docker Compose)

Para teste integrado rapido (web + api + banco + redis), existe um bootstrap all-in-one para EC2:

- `infra/aws/ec2-user-data.sh`

### O que o bootstrap faz

1. Instala Docker no host
2. Clona o repositorio
3. Gera `.env` da API e `.env.production` do web
4. Gera Dockerfiles de deploy (`web` e `api`)
5. Sobe `postgres`, `redis`, `api` e `web` via `docker compose`

### Comandos AWS CLI de apoio

- `infra/aws/ec2-bdm.json` (EBS 30GB)
- `infra/aws/ec2-assume-role.json` (trust policy para role SSM da EC2)

### Observacoes

- O entrypoint da API em container deve usar `node apps/api/dist/src/main.js`.
- O comando `node dist/main` nao funciona neste projeto (Nest build gera `dist/src/main.js`).
- Em testes por IP publico/HTTP (EC2 sem HTTPS), evite depender exclusivamente de `crypto.randomUUID()` em paginas client-side;
  use fallback de ID local para prevenir erro de runtime em navegadores fora de contexto seguro.
- O shell web suporta tema `auto/claro/escuro` (persistido em `localStorage`) e modo `auto` segue
  a configuracao de tema do navegador/cliente (`prefers-color-scheme`).
- O portal inicial (`apps/web/app/page.tsx`) faz deteccao automatica de dispositivo (heuristica client-side)
  e destaca o modulo recomendado (`Web`/`App`) via botao "Acesso Inteligente".
- Para reduzir cortes de texto em sidebars compactas, prefira rotulos curtos na navegacao e mantenha o
  nome completo no `title`/tooltip do item.
- Permissoes de calendario/operacao sao centralizadas em `apps/web/lib/auth-store.ts` (`getRolePermissions`),
  evitando duplicacao de regra por tela e facilitando futura migracao para ACL vinda do backend.
- Matriz operacional atual do calendario:
  - `Operacoes`: agendar somente
  - `Gestor`: agendar + remanejar data/horario
  - `Tecnico`: agendar + remanejar + status/conclusao + KM
  - `Administrador`: acesso total (inclui editar detalhes do agendamento e excluir)
- `auth-store` possui migracao local para garantir que o login demo `admin` tenha perfil
  `Administrador` (acesso total), corrigindo sessoes/localStorage antigos.
- `apps/web/lib/test-data-seed.ts` centraliza reset/populacao de massa local de testes (localStorage)
  e e acionado na tela `Usuarios de Acesso` para QA rapido em ambiente demo/EC2.

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
