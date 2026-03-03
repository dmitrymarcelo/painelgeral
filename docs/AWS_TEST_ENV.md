# AWS Test Environment (EC2 All-in-One)

## Objetivo
Ambiente de validacao para Web + API em EC2.

## Status registrado
- Ultima revisao documental: `2026-03-03`
- Escopo atual da API: sem checklist, sem combustivel e sem telemetria.
- Referencia de banco no schema atual: `PostgreSQL` (Prisma).
- GitHub atualizado: commit `40f674e` em `origin/main`.
- Ultimo commit de aplicacao implantado (API/Web): `a500cca`.
- Ultimo deploy remoto por SSM: `2026-03-03` (comando `8761fe17-8a88-40fc-bc4b-72610b875929`, status `Success`).
- Resultado do deploy: `api` e `web` reconstruidos e containers iniciados.

## Infra de referencia
- Regiao: `us-east-1`
- EC2 Instance ID (historico): `i-042ffad653601917a`
- Repositorio: `dmitrymarcelo/painelgeral`

## Checklist obrigatorio apos deploy
- Commit/branch aplicado
- Data/hora do deploy
- Endpoint Web validado (`200`)
- Endpoint login API validado (`POST /api/v1/auth/login`)
- Observacoes de incidente (se houver)

## Log de deploy (execucoes)
- `2026-03-03` | Commit `3dc0642` | SSM `571a558e-b610-4989-ba5a-4f0293387526`
  - Resultado: `Failed` no build da API por modulo legado `checklists` fora do schema.
- `2026-03-03` | Commit `a500cca` | SSM `8761fe17-8a88-40fc-bc4b-72610b875929`
  - Comando: `git pull --ff-only origin main && docker compose -f docker-compose.ec2.yml up -d --build api web`
  - Resultado: `Success` (API e Web no ar).
- `2026-03-03` | Commit `40f674e` | SSM `09a1f537-9abd-4da2-83d5-dd28569e8f36`
  - Comando: `git pull --ff-only origin main`
  - Resultado: `Success` (sincronizacao do repositorio na EC2 sem rebuild).

## Observacao operacional
- `python -m awscli sts get-caller-identity` validado com sucesso para a conta `389364614518` (usuario IAM `Dmitry`).

## Comando util para reduzir custo
```bash
aws ec2 stop-instances --region us-east-1 --instance-ids i-042ffad653601917a
```
