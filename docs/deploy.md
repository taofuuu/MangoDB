# Deploying

The hosted alpha is three pieces. Both hosts redeploy `main` on every push.

| Piece                     | Host                  | Built from     |
| ------------------------- | --------------------- | -------------- |
| Web                       | Vercel                | `apps/mangodb` |
| API                       | Render, free web plan | `apps/api`     |
| Database and file storage | Supabase, own project | —              |

The Supabase project is **not** the one the team develops against, so testers
and teammates never write into each other's data.

## API on Render

| Setting           | Value                                                                        |
| ----------------- | ---------------------------------------------------------------------------- |
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

Root directory `apps/mangodb`, and one variable: `API_URL`, the Render address
with no trailing slash.

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
