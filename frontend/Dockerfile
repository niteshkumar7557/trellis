FROM node:24-alpine AS base

# Stage 1: build
FROM base AS builder
RUN apk add --no-cache libc6-compat
# Built from the repo root (see docker-compose.yml), because the app imports ../shared.
WORKDIR /home/build/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
COPY shared/ ../shared/

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build


# Stage 2: run
FROM base AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /home/app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder --chown=node:node /home/build/frontend/.next/standalone ./
COPY --from=builder --chown=node:node /home/build/frontend/.next/static ./.next/static
COPY --from=builder --chown=node:node /home/build/frontend/public ./public

USER node
EXPOSE 3000

CMD ["node", "server.js"]