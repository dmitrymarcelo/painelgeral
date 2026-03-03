# DOCUMENTACAO DE PERSISTENCIA (Backend API)

## Objetivo
Documento de governanca da persistencia.  
Detalhamento de entidades, enums, campos e relacionamentos fica centralizado no DER.

## Fonte unica de verdade
- Schema oficial: `apps/api/prisma/schema.prisma`
- Banco alvo: `PostgreSQL` (Prisma)
- Ultima revisao: `2026-03-03`

## Escopo funcional atual
- Multi-tenant com `tenantId` nas entidades operacionais.
- Dominios ativos: autenticacao/autorizacao, ativos, manutencao preventiva, ordens de servico, calendario, notificacoes, auditoria e importacoes.
- Fora do escopo: checklist, combustivel e telemetria.

## Regras de manutencao da documentacao
- Nao duplicar listas de enums, tabelas e relacionamentos neste arquivo.
- Qualquer mudanca no `schema.prisma` deve atualizar o DER no mesmo ciclo.
- Se o diagrama completo ficar poluido, manter a visao por dominios nos DBMLs setoriais.

## DERs oficiais
- Completo (fonte visual principal): `docs/DER_SCHEMA_ATUAL.dbml`
- Visual por dominio (sem sobreposicao): `docs/DER_DIAGRAMAS_PTBR.md`
- Setoriais para dbdiagram:
- `docs/der-diagramas/01_auth_acesso.dbml`
- `docs/der-diagramas/02_frota_manutencao.dbml`
- `docs/der-diagramas/03_ordens_agenda.dbml`
- `docs/der-diagramas/04_notificacoes_auditoria.dbml`
- `docs/der-diagramas/05_importacao.dbml`
