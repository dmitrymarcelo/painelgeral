# AWS Enterprise Blueprint

## Serviços alvo
- ECS Fargate (API e Web)
- ALB + WAF
- CloudFront
- RDS PostgreSQL
- ElastiCache Redis
- S3 (anexos e estáticos)
- CloudWatch (logs + métricas + alarmes)
- Secrets Manager

## Ambientes
- `dev`
- `staging`
- `prod`

## Estratégia de deploy
- API: blue/green com health checks no ALB
- Web/PWA: rollout progressivo via ECS + CloudFront invalidation

## Segurança
- TLS obrigatório
- Segredos fora do código
- RBAC + auditoria de ações críticas
- Retenção de logs e trilhas por 5 anos

## Próximos passos de IaC
- Terraform para VPC, ECS, RDS, Redis e pipelines
- Rotinas de backup/restore testadas
- Alarmes de disponibilidade e latência para SLA 99.5%
