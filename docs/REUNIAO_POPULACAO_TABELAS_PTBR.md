# Reuniao: Avaliacao de Todas as Tabelas (Prisma + DER)

## Objetivo
Demonstrar, com dados reais, a funcao de cada tabela do schema atual.

## Fontes oficiais para a reuniao
- Modelo do banco: `apps/api/prisma/schema.prisma`
- DER completo: `docs/DER_SCHEMA_ATUAL.dbml`
- DER visual por dominio: `docs/DER_DIAGRAMAS_PTBR.md`
- Apresentacao visual pronta no VS Code: `docs/REUNIAO_VISUAL_VSCODE_PTBR.md`
- Carga de dados da demo: `apps/api/prisma/seed.ts`

## Preparacao (5 min)
1. Aplicar schema:
```bash
pnpm --filter @frota/api prisma:generate
pnpm --filter @frota/api prisma:push
```
2. Popular dados de demo:
```bash
pnpm --filter @frota/api seed
```
3. Abrir visualizacao de dados:
```bash
pnpm --filter @frota/api exec prisma studio
```
4. (Opcional) Contagem consolidada por tabela:
```bash
psql "$DATABASE_URL" -f docs/sql/REUNIAO_CONTAGENS_TABELAS.sql
```

## Ordem de apresentacao sugerida (30 min)
1. `tenants` e `users/roles/user_roles`: isolamento por cliente e permissao.
2. `assets` e `asset_status_history`: cadastro e evolucao de status do ativo.
3. `maintenance_plans/rules/executions`: preventiva e gatilhos.
4. `work_orders/tasks/assignments/history`: ciclo operacional da OS.
5. `calendar_events`: agenda ligada a ativo/OS.
6. `notifications/notification_deliveries`: notificacao e canal de entrega.
7. `audit_logs/audit_log_attributes`: trilha de auditoria.
8. `import_jobs/import_rows/import_errors/import_row_fields`: rastreabilidade de importacao.

## Mensagem executiva para o gestor
- O DER mostra a arquitetura e os relacionamentos.
- O Prisma Studio mostra evidencias de uso com registros reais.
- O seed de demo garante cobertura de todas as tabelas para validacao funcional.
