FROM node:24-alpine AS base

# Stage 1: build
FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /home/build

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY next.config* ./
COPY postcss.config* ./
COPY app/ app/
COPY public/ public/

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

COPY --from=builder --chown=node:node /home/build/.next/standalone ./
COPY --from=builder --chown=node:node /home/build/.next/static ./.next/static
COPY --from=builder --chown=node:node /home/build/public ./public

USER node
EXPOSE 3000

CMD ["node", "server.js"]