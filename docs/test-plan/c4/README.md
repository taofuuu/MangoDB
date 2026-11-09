# MangoDB — C4 diagrams

Level 1 (System Context), Level 2 (Container) and Level 3 (Component, for
the API and the web application) of the
[C4 model](https://c4model.com), written in
[C4-PlantUML](https://github.com/plantuml-stdlib/C4-PlantUML). The `.puml`
files are the source; the `.png` files are rendered from them.

To re-render after a change (PlantUML 1.2024+ has C4 in its standard
library, so no network is needed):

```bash
java -jar plantuml.jar -tpng -charset UTF-8 docs/test-plan/c4/*.puml
```

## Level 1 — System Context

Source: [`context.puml`](context.puml)

![System Context diagram](context.png)

- A company with account type `BOTH` acts as Provider and Receiver.
- MangoDB sends no email and has no outside sign-in provider
  ([ADR 0012](../../adr/0012-no-forgot-password.md)).

## Level 2 — Container

Source: [`container.puml`](container.puml)

![Container diagram](container.png)

- **`packages/shared`** is not a container. It is a TypeScript package of
  request and response types that both the web app and the API import at
  build time.
- **Why the proxy:** the browser only talks to the web app, so the session
  cookie works with no CORS setup, even when web and API run on different
  hosts (`apps/mangodb/next.config.ts`).
- **Prisma CLI** (migrations, Studio) uses the direct `DIRECT_URL`
  connection, not the pooled one (`apps/api/prisma.config.ts`).

## Level 3 — Component (API)

Source: [`component.puml`](component.puml)

![Component diagram of the API](component.png)

- **One request, in order:** pipeline → router → guards and Zod validation
  (declared per route) → controller → domain rules / Prisma. A thrown
  `ApiError` goes back to the pipeline's error handler.
- **Controllers are grouped by feature.** Each box covers the controller
  files named under it, and the routers that call them.
- **Controllers and domain rules both query Prisma.** Multi-step writes
  (accepting a proposal, moving a project's status) live in `lib/` and run
  in a transaction.
- **Guards cost two reads per signed-in request:** the revoked-token list
  and whether the company was deleted.
- **Not shown:** small `lib/` mappers and select shapes, `env.ts`, and the
  Swagger docs at `/api-docs`.

## Level 3 — Component (web application)

Source: [`component-web.puml`](component-web.puml)

![Component diagram of the web application](component-web.png)

- **Almost everything runs in the browser.** The pages are client
  components. The Next server serves them and runs the one server-side part
  shown here: the `/api/*` rewrite.
- **One way out:** every request goes resource module → `apiFetch` → proxy.
  Nothing else calls `fetch`.
- **The cache sits beside the client, not in front of it.** Resource modules
  wrap their GETs in `cachedGet` and call `invalidateAfter` after a write.
  Login and logout clear it in every open tab.
- **The access gate is for display only.** It decides what a page shows; the
  API's guards are what actually refuse a request.
- **Not shown:** small helpers (`dates`, `money`, `images`, `profileLinks`)
  and the `@mangodb/shared` types, which the resource modules and components
  import.

## Where the containers run

This is deployment, not part of the two diagrams above.

| Container       | Hosted alpha          | Self-hosted (`docker-compose.yml`)          |
| --------------- | --------------------- | ------------------------------------------- |
| Web application | Vercel                | `web` service, behind Caddy (HTTPS)         |
| API             | Render, free web plan | `api` service, no public port               |
| Database, files | Supabase              | Supabase (compose keeps no data of its own) |
