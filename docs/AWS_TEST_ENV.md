# AWS Test Environment (EC2 All-in-One)

## Objetivo
Ambiente de validacao para Web + API em EC2.

## Status registrado
- Ultima revisao documental: `2026-03-02`
- Escopo atual da API: sem checklist, sem combustivel e sem telemetria.
- Referencia de banco no schema atual: `SQLite` (Prisma).

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

## Comando util para reduzir custo
```bash
aws ec2 stop-instances --region us-east-1 --instance-ids i-042ffad653601917a
```
