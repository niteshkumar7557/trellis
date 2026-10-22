FROM node:24-alpine AS base


# Stage 1: build
FROM base AS builder
WORKDIR /home/build

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ src/

RUN npm run build


# Stage 2: run
FROM base AS runner
WORKDIR /home/app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder --chown=node:node /home/build/dist dist/
COPY --from=builder --chown=node:node /home/build/src/db dist/db/
COPY --chown=node:node public/ public/

USER node
EXPOSE 8000

CMD ["node", "dist/index.js"]