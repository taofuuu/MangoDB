# Build from the repo root: docker build -f apps/api/Dockerfile .
# The root holds the one package-lock.json every workspace installs from.

FROM node:22-alpine AS build
WORKDIR /app

# Manifests first, so a code-only change reuses the cached npm ci layer.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/mangodb/package.json apps/mangodb/
COPY packages/shared/package.json packages/shared/
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api

# generate never connects; prisma.config.ts only checks DIRECT_URL is set.
RUN DIRECT_URL=postgresql://placeholder npm run db:generate -w api \
    && npm run build -w api

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Only the API's runtime dependencies. --omit=optional as well, because the
# Prisma CLI and TypeScript are optional peers of @prisma/client, and
# --omit=dev alone keeps them (~200 MB).
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/mangodb/package.json apps/mangodb/
COPY packages/shared packages/shared
RUN npm ci -w api --omit=dev --omit=optional && npm cache clean --force

COPY --from=build /app/apps/api/dist apps/api/dist

WORKDIR /app/apps/api
USER node
EXPOSE 4000
# node directly, not npm start, so docker stop's signal reaches the server.
CMD ["node", "--experimental-strip-types", "dist/index.js"]
