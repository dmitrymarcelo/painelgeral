# Entrega Tecnica para Diretoria e Time de Backend (PT-BR)

## Objetivo

Este documento consolida a arquitetura atual do projeto, as regras de negocio ja implementadas no frontend, os contratos esperados para o backend e um plano de organizacao de codigo para continuidade do desenvolvimento.

## Resumo Executivo

- Monorepo fullstack (`apps/web`, `apps/api`, `packages/types`)
- Frontend possui fluxo funcional (web + app) com varias regras de manutencao implementadas localmente
- Backend NestJS + Prisma possui base de dominios robusta (ativos, calendario, OS, planos, checklist, notificacoes)
- Foi realizado um ciclo de auditoria tecnica com:
  - limpeza de codigo em modulos criticos
  - documentacao de responsabilidade por arquivo
  - comentarios de regra de negocio
  - marcacoes `CONTRATO BACKEND:` para handoff

## O que foi auditado e refatorado nesta etapa

### Frontend (modulos criticos)

- `apps/web/lib/auth-store.ts`
- `apps/web/lib/api-client.ts`
- `apps/web/lib/maintenance-store.ts`
- `apps/web/lib/offline-db.ts`
- `apps/web/lib/scheduling-responsible-store.ts`
- `apps/web/components/layout/web-shell.tsx`
- `apps/web/components/layout/mobile-shell.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/web/calendar/page.tsx`
- `apps/web/app/web/preventive-items/page.tsx`
- `apps/web/app/web/dashboard/page.tsx`
- `apps/web/app/web/assets/page.tsx`
- `apps/web/app/web/maintenance/page.tsx`

### Backend (modulos criticos)

- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/common/utils/tenant.util.ts`
- `apps/api/src/modules/auth/*`
- `apps/api/src/modules/users/*`
- `apps/api/src/modules/assets/*`
- `apps/api/src/modules/calendar/*`
- `apps/api/src/modules/work-orders/*`
- `apps/api/src/modules/maintenance-plans/*`

## Correcoes Tecnicas Aplicadas (alto impacto)

1. `ValidationPipe` (API)
- Corrigido `exceptionFactory` em `apps/api/src/main.ts` para retornar `BadRequestException` em vez de `Error`.
- Impacto: respostas de validacao agora preservam HTTP 400 corretamente.

2. Resolucao de tenant redundante (API)
- `AssetsService` passou a usar helper interno `findOneByResolvedTenantId(...)`.
- Impacto: evita resolucao de tenant duplicada em `update/history`.

3. Limpeza de estado redundante em planos preventivos (Frontend)
- `apps/web/app/web/preventive-items/page.tsx` deixou de depender de estados globais de gatilho nao editaveis.
- `triggerConfig` do payload salvo agora e derivado dos gatilhos reais dos itens.
- Impacto: elimina inconsistencias na persistencia local e melhora qualidade do dado para backend.

4. Tipagem e legibilidade
- Remocao de `any` no normalizador de cadastro preventivo.
- Inclusao de docstrings de responsabilidade e comentarios de regra/contrato em modulos centrais.

5. Correcao de build/prerender no Next.js (Netlify)
- Corrigido erro de deploy em `/web/calendar` causado por `useSearchParams()` sem boundary de `Suspense`.
- Solucao aplicada em `apps/web/app/web/calendar/page.tsx`:
  - wrapper com `Suspense`
  - componente interno contendo `useSearchParams`
- Impacto: `next build` volta a prerenderizar `/web/calendar` corretamente em ambiente de CI/Netlify.

## Arquitetura Atual (Visao Pratica)

### Monorepo

- `apps/web`: Next.js (modulo web + modulo app em layout mobile)
- `apps/api`: NestJS + Prisma
- `packages/types`: tipos compartilhados

## Deploy Rapido para Testes (AWS Amplify - Frontend)

Objetivo desta etapa: publicar apenas `apps/web` rapidamente para validacao funcional, mantendo o backend local/mock enquanto a API definitiva e entregue.

- Arquivo de suporte criado na raiz: `amplify.yml`
- Estrategia:
  - monorepo (`pnpm`)
  - build do app `@frota/web`
  - artefato publicado em `.next` (relativo ao `appRoot = apps/web`)

### Configuracao recomendada no AWS Amplify (Console)

- Origem: GitHub (repositorio `dmitrymarcelo/painelgeral`)
- Branch: `main` (ou branch de teste)
- App root (monorepo): `apps/web`
- Build spec: usar `amplify.yml` da raiz do repositorio

### Observacao de compatibilidade (Amplify monorepo)

- Com `appRoot: apps/web`, o campo `artifacts.baseDirectory` do `amplify.yml` deve ser relativo ao app root.
- Valor correto neste projeto: `.next`
- Valor incorreto (causa erro `Artifact directory doesn't exist`): `apps/web/.next`

### Observacoes tecnicas

- O frontend atualmente suporta fluxo local/mock e tambem pontes para backend (`auth`, `calendar`, `maintenance-plans`).
- Para teste executivo/UI, o deploy do frontend sozinho e suficiente.
- Para operacao real multiusuario, ainda e necessario publicar a API + banco + redis.

## Deploy Rapido Fullstack para Testes (AWS EC2 all-in-one)

Objetivo: disponibilizar rapidamente um ambiente funcional completo (`web + api + postgres + redis`) para testes integrados, sem depender de servicos separados.

### Estrategia aplicada

- EC2 com Docker + Docker Compose
- Containers:
  - `web` (Next.js)
  - `api` (NestJS + Prisma)
  - `postgres`
  - `redis`
- Bootstrap automatizado via `user-data`:
  - `infra/aws/ec2-user-data.sh`

### Artefatos de suporte adicionados

- `infra/aws/ec2-user-data.sh`: provisionamento automatico da EC2 e subida da stack
- `infra/aws/ec2-bdm.json`: configuracao de volume EBS (30GB gp3) para `run-instances`
- `infra/aws/ec2-assume-role.json`: trust policy do role EC2 (SSM) para suporte operacional

### Observacoes tecnicas importantes

- O build da API Nest gera artefatos em `apps/api/dist/src/*` neste projeto.
- No bootstrap/container da API, o entrypoint correto para producao e:
  - `node apps/api/dist/src/main.js`
- Usar `node dist/main` causa loop de reinicio (`MODULE_NOT_FOUND`) no container da API.
- Na tela `Cadastro de Planos de Manutencao` (`/web/preventive-items`), a geracao de IDs locais no frontend
  deve usar fallback para ambientes HTTP (IP publico em teste EC2), pois `crypto.randomUUID()` pode falhar fora de contexto seguro.
- `WebShell` recebeu suporte a tema (`claro/escuro/automatico`) com resolucao por `prefers-color-scheme`
  e persistencia local, mantendo experiencia coerente em diferentes navegadores/clientes.
- Rotulos da sidebar foram encurtados na exibicao expandida (`Gestao`, `Cadastro`, etc.) para evitar corte visual.
- O portal inicial (`/`) possui heuristica de dispositivo (user-agent + viewport/touch) para sugerir
  automaticamente o modulo recomendado (`Web` para desktop / `App` para smartphone), sem impedir troca manual.
- A tela `Usuarios de Acesso` (`/web/users`) recebeu utilitario administrativo de massa de testes local:
  `Limpar e Popular Dados de Teste`, que reseta e popula `localStorage` com dados para calendario, OS,
  ativos, usuarios e cadastros de planos preventivos.
- O `Calendario` teve ajuste de colorimetria por status (`Agendado`, `Em andamento`, `Em tolerancia`,
  `Nao Compareceu`, `Concluido`) e o marcador visual de `Hoje` deixou de usar cor dedicada para reduzir redundancia.
- Em `Gestao de Preventivas`, a tabela principal foi reorganizada (Placa/Tipo/Centro/Modelo/Ult. MT/KM Atual/Proxima/...)
  e ganhou coluna `Progresso` calculada por relacao `KM Atual x Proxima preventiva`.
- Padrao visual de listagens Web consolidado em `apps/web/app/globals.css` (`table-head`,
  `table-head-cell`, `table-cell`, `table-cell-tight`) e aplicado nas tabelas principais
  (`Dashboard`, `Gestao de Preventivas`, `Ordens de Servico`, `Usuarios`).
- Matriz de perfis aplicada no frontend (cadastro de usuarios + calendario):
  - `Operacoes`: somente criar agendamentos
  - `Gestor`: criar agendamentos + remanejar datas/horario no calendario (sem editar ativo/descricao)
  - `Tecnico`: mesmas funcoes do gestor + alterar status de execucao + concluir + informar KM (sem editar ativo/descricao)
  - `Administrador`: acesso total (incluindo exclusao de agendamento e gestao de usuarios)
- Ajuste de migracao local aplicado: o usuario demo `admin` (login local) e tratado como
  `Administrador` mesmo em storages/sessoes antigas onde estava salvo como `Gestor`.

### Ambiente de teste validado

- Regiao: `us-east-1` (N. Virginia)
- Modelo: all-in-one para agilidade de teste
- Frontend publico validado em porta `3000`
- API validada com login (`POST /api/v1/auth/login`)
- `infra`: reservado para infraestrutura/suporte

### Fluxo atual de dados (frontend)

Hoje o frontend opera com persistencia local para validar UX e regras:

- `maintenance-store` (localStorage): eventos do calendario/manutencao
- `auth-store` (localStorage): login local demo
- `scheduling-responsible-store` (localStorage): responsavel de agendamento
- `offline-db` (Dexie/IndexedDB): fila offline e checklist runs
- `preventive-items/page.tsx` (localStorage): cadastros de planos preventivos (temporario)

Isso significa que varias regras ja estao implementadas e prontas para migrar para API sem reescrever UX.

## Contratos de Backend Prioritarios (Ponte com Frontend)

### 1) Autenticacao

Frontend hoje (local):
- login via `auth-store`
- sessao compartilhada entre portal, web e app

Contrato recomendado:

```json
POST /auth/login
{
  "email": "admin@tenant.com",
  "password": "senha"
}
```

Resposta:

```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "user": {
    "id": "uuid",
    "tenantId": "uuid",
    "name": "Administrador",
    "email": "admin@tenant.com",
    "roles": ["ADMIN", "GESTOR"]
  }
}
```

### 2) Calendario de Manutencao

A tela de calendario ja implementa:
- agendamento
- reagendamento
- justificativa obrigatoria em alteracoes
- status (`Agendado`, `Em andamento`, `Concluido`, `Nao Compareceu`, `Em tolerancia`)
- logica de tolerancia/no-show

Contrato recomendado:

```json
GET /calendar/events?from=2026-02-01&to=2026-02-29&status=SCHEDULED
```

```json
POST /calendar/events
{
  "title": "Manutencao Preventiva",
  "description": "texto + historico de justificativas (temporario)",
  "type": "MANUTENCAO",
  "status": "AGENDADO",
  "startAt": "2026-02-26T07:30:00.000Z",
  "assetId": "uuid",
  "workOrderId": null
}
```

Observacao:
- A UI hoje embute justificativas no campo `description` para compatibilidade local.
- Recomendado backend persistir justificativas em tabela separada (`calendar_event_justification`).

### 3) Ordens de Servico (OS)

A tela web/app de O.S. ja consome/deriva OS da manutencao, mas backend possui modulo real de `work-orders`.

Contrato recomendado para frontend final:

- `GET /work-orders`
- `GET /work-orders/:id`
- `POST /work-orders`
- `POST /work-orders/:id/assign`
- `POST /work-orders/:id/start`
- `POST /work-orders/:id/complete`

Campos essenciais no retorno:
- `asset`
- `assignments.user`
- `history`
- `createdAt`, `startedAt`, `completedAt`
- `status`, `priority`, `code`

### 4) Planos Preventivos (Cadastro de Planos de Manutencao)

Frontend ja possui payload local rico (`PreventiveRegistrationPayload`) com:
- contexto do veiculo
- formula
- gatilhos de referencia
- itens/pecas
- vidas uteis (KM, Horimetro, Tempo)

Contrato recomendado (fase 1):

- `POST /maintenance-plans` (cabecalho)
- `POST /maintenance-plans/:id/rules` (gatilhos)
- endpoint adicional recomendado para itens (nao existe ainda):
  - `POST /maintenance-plans/:id/items`
  - `PATCH /maintenance-plans/:id/items/:itemId`

## Entidades de Banco de Dados (Base atual + recomendacoes)

### Ja existentes no Prisma (`apps/api/prisma/schema.prisma`)

Principais modelos ja presentes:

- `Tenant`
- `User`
- `Role`
- `UserRoleMap`
- `AuditLog`
- `Notification`
- `NotificationDelivery`
- `Asset`
- `AssetStatusHistory`
- `AssetLocation`
- `TelematicsDevice`
- `TelematicsReading`
- `MaintenancePlan`
- `MaintenanceRule`
- `MaintenanceExecution`
- `CalendarEvent`
- `WorkOrder`
- `WorkOrderTask`
- `WorkOrderAssignment`
- `WorkOrderHistory`
- `ChecklistTemplate`
- `ChecklistTemplateItem`
- `ChecklistRun`
- `ChecklistAnswer`
- `ChecklistAttachment`
- `ChecklistSignature`
- `FuelEntry`
- `ImportJob`
- `ImportRow`
- `ImportError`
- `TelemetrySync`

### Recomendadas para atender 100% da UI atual de planos preventivos

Os campos da tela de cadastro de planos sugerem complementar o schema com:

- `maintenance_plan_item`
  - `id`, `tenantId`, `planId`, `partMaterial`, `usefulLifeKm`, `usefulLifeHourmeter`, `usefulLifeTime`, `sortOrder`
- `maintenance_plan_item_trigger`
  - `id`, `tenantId`, `planItemId`, `triggerType`, `intervalValue`, `inheritsDefault`, `appliedAt`
- `calendar_event_justification` (opcional, recomendado)
  - `id`, `tenantId`, `calendarEventId`, `kind`, `message`, `createdById`, `createdAt`

## Proposta de Organizacao (Folder-by-Feature)

### Decisao adotada agora (nao disruptiva)

Nao foi feita migracao fisica em massa de pastas nesta etapa para evitar regressao antes da revisao de diretoria.

O que foi aplicado:
- documentacao de responsabilidade por modulo
- marcadores de contrato backend nos pontos de dados
- guia de handoff e proposta de estrutura alvo

### Estrutura alvo recomendada (Frontend `apps/web`)

```text
apps/web/
  app/
    (portal)
    web/
    app/
  features/
    auth/
      store/
      components/
      contracts/
    maintenance-calendar/
      components/
      hooks/
      contracts/
      utils/
    maintenance-plans/
      components/
      hooks/
      contracts/
      mappers/
    work-orders/
    assets/
  shared/
    ui/
    layout/
    utils/
    lib/
```

### Estrutura alvo recomendada (Backend `apps/api/src`)

```text
src/
  modules/
    auth/
      auth.controller.ts
      auth.service.ts
      dto/
    users/
    assets/
    calendar/
    work-orders/
    maintenance-plans/
  common/
    decorators/
    guards/
    interceptors/
    filters/
    utils/
  prisma/
```

Observacao:
- A API ja esta relativamente alinhada ao modelo folder-by-feature.
- O maior ganho imediato esta em separar melhor features do frontend (hoje muito concentradas em `app/` + `lib/`).

## Como rodar o projeto (Runbook)

### Instalar dependencias

```powershell
corepack pnpm install
```

### Validar tipos

```powershell
corepack pnpm --filter @frota/web typecheck
corepack pnpm --filter @frota/api typecheck
corepack pnpm --filter @frota/types build
```

### Subir stack local (com banco/redis)

```powershell
docker compose up -d
corepack pnpm --filter @frota/api prisma:generate
corepack pnpm --filter @frota/api prisma:migrate --name init
corepack pnpm --filter @frota/api seed
corepack pnpm dev
```

## Checklist de Handoff para o Time de Backend

1. Confirmar quais fluxos sairao primeiro do modo local:
- Auth
- Calendario
- OS
- Planos preventivos

2. Definir padrao de resposta de erro (manter shape de validacao ja implementado)

3. Fechar modelo de itens do plano preventivo (entidades adicionais sugeridas)

4. Decidir estrategia de notificacoes:
- polling simples
- websocket/sse

5. Definir estrategia de sincronizacao offline (fila Dexie)
- idempotencia por `clientRequestId`
- reprocessamento por lote

## Observacoes de Deploy (Netlify / Next.js)

- A rota `app/web/calendar/page.tsx` usa `useSearchParams` (hook client-only).
- Em Next.js App Router, esse hook precisa estar dentro de um componente renderizado sob `Suspense`.
- Esta regra ja foi aplicada no projeto para evitar falha de prerender em build CI/CD.
- Para Netlify com Next.js em monorepo, o plugin **nao aceita** `publish` apontando para a raiz do repositorio.
- Foi ajustado `netlify.toml` na raiz com `@netlify/plugin-nextjs` e `publish = "apps/web/.next"` para o app `@frota/web`.
- Observacao de operacao: se a Netlify UI estiver com override de `publish` (ex.: raiz do repo), esse override deve ser removido ou alinhado com `apps/web/.next`.
- O erro de 404 anterior ocorreu quando a saida do Next foi servida com configuracao incompatível de deploy (sem runtime/plugin correto ou com publish incorreto).
- Validacao executada localmente:
  - `corepack pnpm --filter @frota/web build` ✅

## Observacoes finais para diretoria

- O frontend ja contem regras de negocio relevantes e validadas em UX.
- O backend ja possui base estrutural forte (Nest + Prisma + entidades de dominio).
- O risco principal agora nao e arquitetura, e sim alinhamento de contrato/ordem de entrega entre modulos.
- A documentacao e os marcadores `CONTRATO BACKEND` foram adicionados para reduzir ambiguidade no handoff.
