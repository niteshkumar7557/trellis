FROM node:24-alpine AS base

# Built from the REPO ROOT (see deploy/release.sh), not from backend/, because the API
# imports ../shared. Every COPY path below is therefore relative to the repo root.

# Stage 1: build. Has the dev tools (TypeScript, tsup); thrown away afterwards.
FROM base AS builder
WORKDIR /home/build/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/tsconfig.json backend/tsup.config.ts ./
COPY backend/src/ src/
COPY shared/ ../shared/

RUN npm run build


# Stage 2: run. Only production packages and the built dist/; small and without dev tools.
FROM base AS runner
WORKDIR /home/app

ENV NODE_ENV=production

COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder --chown=node:node /home/build/backend/dist dist/
# migrate.js reads its SQL from dist/db/migrations at runtime.
COPY --chown=node:node backend/src/db/migrations dist/db/migrations/
COPY --chown=node:node backend/public/ public/

USER node
EXPOSE 8000

CMD ["node", "dist/index.js"]
