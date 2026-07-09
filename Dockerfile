# syntax=docker/dockerfile:1.7

FROM --platform=linux/amd64 node:20-bookworm-slim AS builder
ENV NODE_ENV=development \
    npm_config_cache=/tmp/.npm
WORKDIR /app

COPY package*.json ./
RUN npm ci --include=dev --no-audit --no-fund && npm cache clean --force

COPY . .
RUN npm run build

FROM --platform=linux/amd64 node:20-bookworm-slim AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    NODE_OPTIONS=--max-old-space-size=1024
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && \
    npm install --no-save tsx@4.21.0 && \
    npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/api ./api
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/index.html ./index.html
COPY --from=builder /app/metadata.json ./metadata.json
COPY --from=builder /app/vite.config.ts ./vite.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

RUN chown -R node:node /app
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000').then(() => process.exit(0)).catch(() => process.exit(1))"

CMD ["node", "--import", "tsx", "server.ts"]