# Build from the repo root: docker build -f apps/mangodb/Dockerfile .
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
COPY apps/mangodb apps/mangodb

# A build arg, not a run-time variable: next build bakes the /api rewrite in.
# api is the API's service name in docker-compose.yml.
ARG API_URL=http://api:4000
ENV API_URL=$API_URL
RUN npm run build -w mangodb

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
# Docker sets HOSTNAME to the container id, and server.js listens on HOSTNAME.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# standalone leaves out static files and public/, so they are copied beside it.
COPY --from=build /app/apps/mangodb/.next/standalone ./
COPY --from=build /app/apps/mangodb/.next/static apps/mangodb/.next/static
COPY --from=build /app/apps/mangodb/public apps/mangodb/public

USER node
EXPOSE 3000
CMD ["node", "apps/mangodb/server.js"]
