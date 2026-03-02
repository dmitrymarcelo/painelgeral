# AWS Test Environment (EC2 All-in-One)

## Objetivo
Ambiente de validacao para Web + API em EC2.

## Status registrado
- Ultima revisao documental: `2026-03-02`
- Escopo atual da API: sem checklist, sem combustivel e sem telemetria.
- Referencia de banco no schema atual: `SQLite` (Prisma).
- GitHub atualizado: commit `16f738e` em `origin/main`.
- Validacao HTTP realizada em `2026-03-02`:
  - `http://44.202.245.110:3000` => `200`
  - `POST http://44.202.245.110:4000/api/v1/auth/login` => `201`

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

## Log de deploy (modelo)
- Data:
- Commit:
- Comando executado:
- Resultado:
- Validacao HTTP:

## Observacao operacional
- Neste ambiente local de automacao nao ha `aws cli` instalado; o deploy remoto por SSM/EC2 nao foi disparado por comando AWS nesta execucao.
- Como o commit ja esta em `origin/main`, basta executar o playbook de deploy no host EC2 para sincronizar a instancia com `16f738e`.

## Comando util para reduzir custo
```bash
aws ec2 stop-instances --region us-east-1 --instance-ids i-042ffad653601917a
```
