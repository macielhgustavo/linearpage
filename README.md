# Linear Inteligência Industrial

Landing page e MVP fumaça da Linear, com formulário de interesse, analytics first-party e CRM interno.

## Stack

- Astro + TypeScript
- Vercel para deploy, CDN e Functions
- MongoDB Atlas para persistência
- GitHub Actions apenas para validação

A aplicação não depende mais de Cloudflare Workers, D1, Cloudflare Access ou Supabase.

## Desenvolvimento

Use Node 24.

```bash
npm install
npm run dev
```

Validação:

```bash
npm run check
npm test
npm run build
```

## Deploy na Vercel

O repositório está conectado diretamente à Vercel.

Com Git integration:
- branches/PRs geram previews;
- `main` é a branch de produção;
- merge na `main` publica automaticamente;
- não é necessário workflow de deploy no GitHub Actions.

Framework: Astro.

## MongoDB

A persistência usa o driver oficial do MongoDB dentro das Vercel Functions.

Database padrão:

```text
linear
```

Collections criadas automaticamente:

- `linear_leads`
- `linear_activities`
- `linear_audit_log`
- `linear_smoke_events`

Os índices essenciais também são criados automaticamente quando uma Function inicializa a conexão.

## Variáveis da Vercel

Configure em Project Settings → Environment Variables:

```text
MONGODB_URI
MONGODB_DB
ADMIN_TOKEN
ADMIN_EMAIL
```

Sugestão:

```text
MONGODB_DB=linear
ADMIN_EMAIL=gustavo.maciel@linearintelligence.com.br
```

`MONGODB_URI` e `ADMIN_TOKEN` devem ser tratados como secrets/sensitive e nunca expostos no frontend.

## Formulário e analytics

A landing usa:

```text
POST /api/interest
POST /api/events
```

Funil registrado:

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

## Admin

CRM:

```text
/admin/
```

Na primeira abertura, o navegador solicita o `ADMIN_TOKEN`. Ele fica somente em `sessionStorage` durante a sessão e é enviado no header `Authorization` para as Functions privadas.

Rotas privadas:

```text
GET/POST/PUT/DELETE /api/leads
GET/POST /api/activities
GET /api/session
GET /api/smoke-metrics
```

## Segurança

- gravações validam origem;
- payloads são limitados/validados;
- a URI do MongoDB existe somente no servidor;
- o admin exige `ADMIN_TOKEN`;
- o formulário tem honeypot básico;
- headers de segurança são definidos em `vercel.json`.

## Domínio

Produção prevista:

```text
https://linearintelligence.com.br
```

O domínio deve ser adicionado ao projeto Vercel e o DNS apontado exatamente como o painel da Vercel indicar.
