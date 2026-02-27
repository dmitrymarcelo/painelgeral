# AWS Test Environment (EC2 All-in-One)

## Objetivo
Ambiente de teste rapido em AWS EC2 para validar Web, API e integracao basica antes da revisao de diretoria e handoff para Backend.

## Status Atual (referencia oficial desta thread)
- Web: `http://44.202.245.110:3000` (OK)
- API base: `http://44.202.245.110:4000/api/v1` (OK)
- PostgreSQL: (OK)
- Redis: (OK)
- Ultima atualizacao de contexto: `2026-02-27` (regra de Gestao de Preventivas ajustada: quando Agendamento = Nao Agendado, Prioridade fica vazia e Presenca fica Sem registro)

## AWS
- Regiao: `us-east-1`
- EC2 Instance ID: `i-042ffad653601917a`
- Stack: Docker Compose (`web + api + postgres + redis`)

## Credenciais de teste (API)
- Usuario: `admin@frotapro.local`
- Senha: `Admin@123`

## Observacoes Operacionais
- `GET /api/v1/health` pode retornar `404` se a rota nao existir (nao indica falha da API por si so).
- Validacao primaria da API deve usar login em `POST /api/v1/auth/login`.

## Automacoes/Infra criadas
- `ec2-user-data.sh`
- `ec2-bdm.json`
- `ec2-assume-role.json`

## Regra de Atualizacao (obrigatoria em mudancas relevantes)
Atualizar este arquivo sempre que houver:
- novo deploy de Web/API
- mudanca de IP/instancia/regiao
- alteracao de stack (containers/ports)
- validacao relevante de endpoint
- observacao de build/SSM em andamento

## Checklist de fechamento (AWS/Deploy)
- Instancia alvo confirmada (`i-042ffad653601917a`)
- Endpoint validado (Web ou API)
- Resultado registrado (ex.: `200`, login OK)
- Observacao de estado (ex.: SSM `InProgress`)

## Ultimo Deploy Executado
- Data: `2026-02-27`
- Commit aplicado: `2b83c90`
- SSM Command ID: `771d0c81-7766-46b8-a793-5c5750fa4172`
- Resultado SSM: `Success`
- Passos executados no host:
  - `git fetch origin`
  - `git checkout main`
  - `git pull --ff-only origin main`
  - `docker compose -f docker-compose.ec2.yml build web`
  - `docker compose -f docker-compose.ec2.yml up -d web`
- Validacao HTTP:
  - `http://44.202.245.110:3000` -> `200`
  - `http://44.202.245.110:3000/web/assets` -> `200`

## Seguranca
- Se qualquer `Secret Access Key` for exposta em conversa/log, revogar imediatamente no IAM e gerar nova.
- Nao persistir chaves secretas em arquivos de documentacao do repositorio.

## Comando util (parar para reduzir custo)
```bash
aws ec2 stop-instances --region us-east-1 --instance-ids i-042ffad653601917a
```
