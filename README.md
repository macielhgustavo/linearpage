# Linear

Site institucional existente migrado para Astro + TypeScript, com CRM interno do CEO em `/admin/`. O painel começa vazio e oferece oportunidades, agenda de contatos, histórico e exportação CSV. Valores ganhos representam negócios fechados, não recebimentos financeiros.

## Executar localmente

Use Node 24. Execute `npm ci` e `npm run dev`. Site: `http://localhost:8000/`; painel: `http://localhost:8000/admin/`.

O comando gera o site, aplica migrations em D1 local e inicia o Worker em loopback. Após editar o frontend, execute `npm run build` para atualizar o preview. Dados locais persistem em `.wrangler/`, ignorada pelo Git. O preview local tem identidade automática e deve conter somente dados de teste.

Validação: `npm run check`, `npm test` e `npm run build`.

## Estrutura

- `src/components/site/`: seções preservadas do site.
- `src/layouts/`: estrutura e SEO institucional.
- `src/pages/admin/`, `src/scripts/admin.ts`: painel comercial.
- `src/lib/commercial.ts`: validação e indicadores.
- `worker/`: API, autenticação e headers.
- `migrations/`: esquema D1 versionado.

Astro gera o frontend, um Cloudflare Worker serve o site e a API, e D1 persiste os dados. Não há React, ORM, CMS ou servidor dedicado. O cadastro é manual: o link de e-mail público não cria leads automaticamente.

## Publicação na Cloudflare

O workflow anterior publicava no GitHub Pages. Foi substituído por validação, sem deploy automático. Confirme a origem atual do domínio antes de alterar DNS ou rotas.

1. Autentique na conta correta com `npx wrangler login`.
2. Execute `npx wrangler d1 create linear-admin` e preencha `database_id` em `wrangler.jsonc`.
3. Crie uma aplicação Cloudflare Access self-hosted protegendo `/admin` e `/api`, incluindo subcaminhos, no domínio da Linear. Use o mesmo AUD em ambos. A política Allow deve aceitar somente `gustavo.maciel@linearintelligence.com.br`. Prefira provedor de identidade com MFA obrigatório; essa exigência deve ser configurada no Access/provedor.
4. Preencha `ACCESS_TEAM_DOMAIN` (hostname `equipe.cloudflareaccess.com`) e `ACCESS_AUD`. Sem isso, o Worker bloqueia todas as rotas privadas.
5. Aplique migrations: `npx wrangler d1 migrations apply DB --remote`.
6. Execute `npm run deploy` e configure o domínio/rota do Worker após revisar a origem. URLs `workers.dev` e previews estão desativados.
7. Verifique o site público, o login em `/admin/`, bloqueio de outra conta, CRUD e histórico autenticados, e `Cache-Control: no-store` nas respostas privadas.

Não há conta Cloudflare, D1 remoto ou Access provisionados por este código. A publicação só está concluída após configuração e teste autenticado no domínio.

Nunca publique `wrangler.local.jsonc`: ele usa `worker/local.ts`, com identidade automática exclusivamente local. Produção usa `worker/index.ts` e valida Access sempre. Não publique `dist/` isoladamente, pois o Worker aplica autenticação e headers.

## Segurança e dados

O servidor valida assinatura RS256, emissor, audiência, expiração e e-mail do JWT Access. Um header de e-mail sozinho não autoriza acesso. Gravações exigem Origin da própria aplicação, JSON limitado a 24 KB, validação Zod e SQL parametrizado. O frontend renderiza dados como texto; não guarda tokens no localStorage.

Headers incluem CSP, proteção contra frames, MIME sniffing e cache privado. CSP permite estilos inline para os gráficos e layout existente, mas bloqueia scripts inline. Toda alteração gera registro em `audit_log`. Exclusões exigem confirmação e removem o histórico da oportunidade.

Antes de migrations futuras, exporte D1 com `npx wrangler d1 export DB --remote --output <arquivo-protegido.sql>` e guarde fora do Git. Defina retenção/backups conforme a necessidade da empresa. CSV contém as oportunidades filtradas e não substitui backup completo.

Uso individual: edições simultâneas em duas abas usam a última gravação. Esta versão não inclui financeiro, portal do cliente, integração de e-mail ou analytics de tráfego.

## Conteúdo e contato

Os dados do painel são demonstrativos. O botão de contato abre um rascunho para `gustavo.maciel@linearintelligence.com.br`; ele não envia informações automaticamente.

## Imagens

- Fotografia de injetoras: [RPWORLD / Unsplash](https://unsplash.com/photos/a-factory-filled-with-lots-of-machines-and-machinery-IWJNXtezL2I).
- Fotografia do motor: [iSawRed / Unsplash](https://unsplash.com/photos/a-large-factory-machinery-C4c9iOcy4_8).
- Fotografia da linha industrial: Unsplash, incluída na versão anterior do site.
- Referência de identidade visual: material fornecido pelo proprietário da Linear.


## Deploy automático pela main

O repositório contém o workflow `.github/workflows/deploy.yml`, que pode publicar a aplicação automaticamente na Cloudflare após push/merge na `main`.

O deploy fica **desativado por padrão**. Para habilitar, configure no GitHub:

**Settings → Secrets and variables → Actions**

Secrets obrigatórios:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`
- `ACCESS_TEAM_DOMAIN`
- `ACCESS_AUD`

Variable obrigatória:
- `DEPLOY_ENABLED=true`

O workflow:
1. instala dependências;
2. executa check, testes e build;
3. gera `wrangler.generated.jsonc` somente dentro do runner;
4. aplica migrations D1 remotas;
5. publica o Worker.

Credenciais e IDs de produção não são gravados no repositório. O arquivo gerado é temporário e não deve ser commitado.

### Token da Cloudflare

Crie um API Token com apenas as permissões necessárias para este projeto. Ele precisa conseguir publicar Workers e operar migrations no D1 da conta usada pela Linear. Evite Global API Key.

### Primeiro deploy

Antes de colocar `DEPLOY_ENABLED=true`, confirme na Cloudflare:
- o Worker correto é `linearpage`;
- o banco D1 correto é `linear-admin`;
- o domínio `linearintelligence.com.br` está associado ao Worker correto;
- Cloudflare Access protege `/admin` e `/api`;
- `ACCESS_TEAM_DOMAIN` e `ACCESS_AUD` correspondem à aplicação Access configurada.

Depois disso, habilite `DEPLOY_ENABLED=true` e execute manualmente **Actions → Deploy Linear → Run workflow** uma vez. Se passar, merges futuros na `main` passam a publicar automaticamente.
