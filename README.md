# Linear Inteligência Industrial

Site institucional e MVP da **Linear Inteligência Industrial**, empresa voltada ao uso de dados para melhorar a eficiência operacional e energética de indústrias.

O projeto combina uma landing page B2B com captação de leads, analytics próprios e um CRM interno simples para acompanhar o funil comercial sem depender de plataformas externas para as etapas essenciais.

## Sobre o projeto

A proposta da Linear é ajudar indústrias a entender melhor consumo de energia, desperdícios, anomalias e desempenho de máquinas, setores e processos a partir de dados operacionais.

Este repositório concentra a presença digital e a primeira camada operacional do produto:

- site institucional responsivo;
- formulário de interesse;
- registro de eventos do funil;
- persistência de leads;
- CRM interno;
- trilha de atividades;
- métricas de smoke/MVP;
- deploy contínuo na Vercel.

## Stack

- Astro
- TypeScript
- Vercel
- Vercel Functions
- MongoDB Atlas
- GitHub Actions

## Arquitetura

```text
Frontend Astro
   │
   ├── landing institucional
   ├── formulário de interesse
   └── analytics first-party
           │
           ▼
    Vercel Functions
           │
           ▼
      MongoDB Atlas
           │
           ├── leads
           ├── atividades
           ├── auditoria
           └── eventos do funil
```

A aplicação não depende de Cloudflare Workers, D1 ou Supabase para sua operação atual.

## Funil e analytics

Os principais eventos registrados são:

```text
landing_view
scroll_50
demo_view
how_it_works_view
cta_click
form_start
form_submit
form_error
```

A ideia é acompanhar o comportamento do visitante sem adicionar uma plataforma de analytics como dependência obrigatória para o MVP.

## CRM interno

A área administrativa fica em:

```text
/admin/
```

Ela permite consultar e operar leads captados pelo site. O acesso utiliza `ADMIN_TOKEN`, mantido apenas na sessão do navegador e enviado no header `Authorization` para as rotas privadas.

Principais endpoints internos:

```text
GET/POST/PUT/DELETE /api/leads
GET/POST /api/activities
GET /api/session
GET /api/smoke-metrics
```

## Persistência

O backend utiliza o driver oficial do MongoDB dentro das Vercel Functions.

Database padrão:

```text
linear
```

Collections:

- `linear_leads`
- `linear_activities`
- `linear_audit_log`
- `linear_smoke_events`

Os índices essenciais são preparados automaticamente na inicialização da conexão.

## Segurança

Algumas decisões adotadas no MVP:

- `MONGODB_URI` permanece somente no servidor;
- rotas administrativas exigem autenticação por token;
- payloads recebidos são limitados e validados;
- gravações validam origem;
- formulário possui honeypot básico contra bots;
- headers de segurança são definidos no deploy;
- secrets não são expostos no frontend.

## Como executar

Requisito recomendado: Node.js 24.

```bash
npm install
npm run dev
```

Validação local:

```bash
npm run check
npm test
npm run build
```

## Variáveis de ambiente

```text
MONGODB_URI
MONGODB_DB
ADMIN_TOKEN
ADMIN_EMAIL
```

Exemplo:

```text
MONGODB_DB=linear
```

Nunca versione credenciais reais.

## Deploy

O projeto usa integração direta com a Vercel:

- branches e pull requests geram previews;
- `main` representa produção;
- merges na `main` publicam automaticamente;
- GitHub Actions fica responsável por validação, não pelo deploy.

## O que este projeto demonstra

Além do frontend institucional, o repositório demonstra uma implementação enxuta de produto real, cobrindo:

- frontend B2B;
- backend serverless;
- persistência em banco de dados;
- captura e gestão de leads;
- analytics próprio;
- autenticação simples de área administrativa;
- deploy contínuo;
- preocupação com segurança e operação desde o MVP.

## Produção

Domínio do projeto:

```text
https://linearintelligence.com.br
```

## Status

MVP em evolução, utilizado como base digital e operacional da Linear Inteligência Industrial.
