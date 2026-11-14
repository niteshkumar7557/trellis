FROM node:24-alpine AS base

# Stage 1: build
FROM base AS builder
RUN apk add --no-cache libc6-compat
# Built from the repo root (see deploy/release.sh), because the app imports ../shared.
WORKDIR /home/build/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
COPY shared/ ../shared/

# NEXT_PUBLIC_* values are written INTO the JavaScript at build time; setting them when the
# container starts does nothing. And .env files are kept out of the image
# (Dockerfile.dockerignore), so they arrive here as build arguments (deploy/release.sh).
#   NEXT_PUBLIC_API_URL       where Next's /api rewrite forwards. In production Caddy sends
#                             /api straight to the API, so this is only a fallback.
#   NEXT_PUBLIC_GOOGLE_SIGNIN "on" shows the Sign in with Google button.
ARG NEXT_PUBLIC_API_URL=http://api:8000
ARG NEXT_PUBLIC_GOOGLE_SIGNIN=off
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GOOGLE_SIGNIN=$NEXT_PUBLIC_GOOGLE_SIGNIN

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