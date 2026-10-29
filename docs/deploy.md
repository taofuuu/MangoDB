# Deploying

The hosted alpha is three pieces. Both hosts redeploy `main` on every push.

| Piece                     | Host                  | Built from     |
| ------------------------- | --------------------- | -------------- |
| Web                       | Vercel                | `apps/mangodb` |
| API                       | Render, free web plan | `apps/api`     |
| Database and file storage | Supabase, own project | —              |

Live at https://mango-db-beta.vercel.app, with the API at
https://mangodb-api.onrender.com and its docs at `/api-docs`.

The Supabase project is **not** the one the team develops against, so testers
and teammates never write into each other's data.

## API on Render

| Setting           | Value                                                                        |
| ----------------- | ---------------------------------------------------------------------------- |
| Branch            | `main`                                                                       |
| Root directory    | blank: the repo root, where npm installs the workspaces                      |
| Build command     | `npm ci --include=dev && npm run db:generate -w api && npm run build -w api` |
| Start command     | `npm start -w api`                                                           |
| Health check path | `/health`                                                                    |

`--include=dev` because `NODE_ENV=production` would otherwise skip Prisma and
TypeScript, which the build needs. `npm start` passes
`--experimental-strip-types` because the API loads `packages/shared`, which is
plain `.ts`, at runtime.

Environment: `NODE_VERSION=22`, `NODE_ENV=production`, a fresh `JWT_SECRET`,
`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and
`FRONTEND_URL` set to the Vercel address. `apps/api/.env.example` says what
each one is.

A free instance sleeps after 15 minutes idle, so the first request after that
takes about a minute.

## Web on Vercel

| Setting         | Value                                          |
| --------------- | ---------------------------------------------- |
| Root directory  | `apps/mangodb`                                 |
| Install command | `npm ci --include=dev` (override switched on)  |
| Variable        | `API_URL`, the Render address, no slash at end |

The install override went in when Vercel's first builds could not find husky.
Whether the default install works since `prepare` became `husky || true` is
untested.

## Docker on one VM

The other way to host it: one server runs both apps with Docker Compose, and
Caddy in front serves HTTPS. The database and storage stay on Supabase.

| Piece   | Built from                | Reached at                      |
| ------- | ------------------------- | ------------------------------- |
| `caddy` | `Caddyfile`               | ports 80 and 443, public        |
| `web`   | `apps/mangodb/Dockerfile` | `127.0.0.1:3000`, the VM only   |
| `api`   | `apps/api/Dockerfile`     | `api:4000`, inside compose only |

HTTPS is not optional: `NODE_ENV=production` makes the session cookie
`Secure`, and a browser drops it over plain http, so nobody can sign in.

What the VM needs:

- 2 GB of memory. `next build` runs out on 1 GB unless the VM has swap.
- Ports 22, 80 and 443 open, and Docker installed.
- A domain whose A record points at the VM's IP. Without one,
  `<ip-with-dashes>.sslip.io` (for example `203-0-113-5.sslip.io`) already
  points there, and Let's Encrypt accepts it.

Setup, from the VM:

```bash
git clone https://github.com/taofuuu/MangoDB.git && cd MangoDB
cp apps/api/.env.example apps/api/.env   # then fill it in, see below
echo "DOMAIN=your.domain" > .env         # Caddy's address
docker compose --profile cloud up -d --build
```

`apps/api/.env` takes the same values as Render, with `NODE_ENV=production` and
`FRONTEND_URL=https://your.domain`. `API_URL` is not needed: the compose file
points the web app at `http://api:4000` itself.

To ship a new version, `git pull` and run the same `up` command. To read the
logs, `docker compose logs -f api` (or `web`, `caddy`).

On a laptop, `docker compose up --build` runs only `web` and `api`, at
http://localhost:3000, with whatever `apps/api/.env` holds. The `cloud` profile
is what adds Caddy.

## Database

Deploys do not run migrations. Keep the alpha database's values in
`apps/api/.env.alpha` (gitignored) and run against it from `apps/api`:

```bash
node --env-file=.env.alpha ../../node_modules/prisma/build/index.js migrate status
node --env-file=.env.alpha ../../node_modules/prisma/build/index.js migrate deploy
```

`--env-file` wins over `.env`, so these never touch the team database. Run
`status` first: on the alpha database it lists only migrations merged since the
last deploy.

A new Supabase project also needs:

1. The four public buckets in [apps/api/README.md](../apps/api/README.md#file-storage).
2. An admin account, from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env.alpha`:

    ```bash
    node --env-file=.env.alpha --import tsx src/create-admin.ts
    ```
