# Padrao de Entrega de Engenharia (Diretoria + Backend)

## Objetivo
Definir o padrao obrigatorio de qualidade, documentacao e entrega para evolucao do projeto, visando:
- revisao de diretoria
- handoff tecnico para equipe de Backend
- manutencao por novos colaboradores sem reunioes de alinhamento extensas

## Diretriz Oficial (resumo operacional)
Atuar como Engenheiro de Software Senior e Arquiteto de Sistemas, executando code review e refatoracao com foco em:
- clean code
- tipagem forte
- regras de negocio explicitas
- contratos de API claros
- documentacao de persistencia

## Regras obrigatorias em toda alteracao
### 1. Auditoria, Clean Code e Tipagem
- Revisar arquivos impactados e remover redundancias/variaveis mortas.
- Reduzir complexidade de funcoes quando possivel.
- Garantir tipagem forte em payloads, respostas e estados.
- Evitar ambiguidade em nomes de variaveis e estados.

### 2. Mapeamento de Arquitetura (Headers)
- Inserir/atualizar cabecalho (Docstring) em modulos principais.
- O cabecalho deve explicar:
  - responsabilidade unica
  - como o modulo se conecta ao ecossistema
  - contexto de integracao

### 3. Documentacao de Regras de Negocio
- Comentar o "por que" de calculos, validacoes e fluxo de estado.
- Evitar comentario de sintaxe obvia.
- Priorizar comentarios em regras operacionais, permissao e fluxo de dados.

### 4. Definicao de Contratos de API
- Em cada ponto de integracao, inserir marcador:
- `// CONTRATO BACKEND:`
- Descrever:
  - verbo + rota (ex.: `POST /auth/login`)
  - payload esperado (envio)
  - JSON de retorno esperado
  - impacto em entidades/tabelas

### 5. Documentacao de Persistencia (quando aplicavel)
Sempre que a alteracao tocar dominio/dados, incluir na resposta final a secao:
- `DOCUMENTACAO DE PERSISTENCIA`

Conteudo minimo:
- tabelas/colecoes
- campos
- tipos (`UUID`, `VARCHAR`, `TIMESTAMP`, etc.)
- PK / FK
- relacionamentos (`1:N`, `N:N`)

### 6. Folder-by-Feature
- Preferir organizacao por funcionalidade ao criar/refatorar modulos.
- Reestruturacoes amplas devem ser feitas por etapas (sem quebrar build).
- Documentar impacto de migracao estrutural no guia tecnico.

### 7. Validacao Tecnica
- Executar no minimo um check aplicavel (`typecheck`, `lint`, build parcial, etc.).
- Registrar comando e resultado na resposta final.

### 8. GitHub (obrigatorio)
- Toda alteracao finalizada deve ser enviada para:
- `https://github.com/dmitrymarcelo/painelgeral.git`
- Fluxo padrao:
  - `git status`
  - `git add ...`
  - `git commit -m "..."`
  - `git push origin ...`

### 9. AWS/Deploy (quando houver impacto)
- Atualizar `docs/AWS_TEST_ENV.md`
- Registrar no fechamento:
  - instancia
  - endpoint
  - status
  - observacoes de SSM/build

## Padrao de fechamento da resposta
- Ajustes feitos no codigo
- Documentacao atualizada
- DOCUMENTACAO DE PERSISTENCIA (quando aplicavel)
- Validacao
- GitHub
- AWS/Deploy (quando aplicavel)

## Escopo pratico (para manter velocidade)
- Em toda mudanca: aplicar rigorosamente nos arquivos alterados.
- Em marco de entrega (diretoria/backend): executar revisao global por feature/projeto.

## Template rapido de cabecalho (Docstring)
```ts
/**
 * RESPONSABILIDADE:
 * [Responsabilidade unica do modulo]
 *
 * COMO SE CONECTA AO ECOSSISTEMA:
 * - [Modulo/feature consumidora]
 * - [Store/API/servico relacionado]
 *
 * CONTRATO BACKEND: [Resumo da integracao, endpoint e payload/retorno]
 */
```

## Template rapido de contrato
```ts
// CONTRATO BACKEND:
// Endpoint: POST /api/v1/exemplo
// Request JSON: { fieldA: string, fieldB: number }
// Response JSON: { id: string, status: "ok" | "error", ... }
// Entidades sugeridas: example_requests, example_results
```
