# Linear Inteligência Industrial

Landing page e MVP fumaça da Linear, com formulário de interesse, analytics first-party e CRM interno.

## Stack

- Astro + TypeScript
- Vercel para deploy, CDN e Functions
- Supabase/Postgres para persistência
- GitHub Actions apenas para validação

A aplicação não depende mais de Cloudflare Workers, D1 ou Cloudflare Access.

## Desenvolvimento

Use Node 24.

```bash
npm ci
npm run dev
```

Validação:

```bash
npm run check
npm test
npm run build
```

## Deploy na Vercel

O repositório deve ser conectado diretamente à Vercel.

Com Git integration:
- branches/PRs geram previews;
- `main` é a branch de produção;
- merge na `main` publica automaticamente;
- não é necessário workflow de deploy no GitHub Actions.

Framework: Astro.

## Banco de dados

A persistência usa Supabase por meio de Vercel Functions. O navegador nunca recebe a chave secreta do banco.

Schema:

```text
supabase/linear_schema.sql
```

Tabelas:
- `linear_leads`
- `linear_activities`
- `linear_audit_log`
- `linear_smoke_events`

Todas usam RLS e têm acesso público revogado. O backend usa somente uma secret key configurada na Vercel.

## Variáveis da Vercel

Configure em Project Settings → Environment Variables:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
ADMIN_TOKEN
ADMIN_EMAIL
```

`SUPABASE_SECRET_KEY` e `ADMIN_TOKEN` devem ser sensíveis e nunca expostos no cliente.

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
- a secret key do Supabase existe somente no servidor;
- o admin exige `ADMIN_TOKEN`;
- tabelas têm RLS e acesso público revogado;
- formulário com honeypot básico;
- headers de segurança em `vercel.json`.

## Domínio

Produção prevista:

```text
https://linearintelligence.com.br
```

O domínio deve ser adicionado ao projeto Vercel e o DNS apontado exatamente como o painel da Vercel indicar.
