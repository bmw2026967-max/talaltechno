# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app

# Workspace manifests first for layer caching.
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/emenu/package.json apps/emenu/package.json

RUN pnpm install --no-frozen-lockfile --filter @talaltechno/emenu...

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_STANDALONE=true
ARG NEXT_PUBLIC_API_URL=http://localhost:8080/api
# الافتراضي: جذر النطاق (Render/PaaS). مسار VPS خلف Caddy يمرّر /menu صراحةً
# من docker-compose.cloud.yml.
ARG NEXT_PUBLIC_BASE_PATH=
ARG NEXT_PUBLIC_ASSET_PREFIX=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
ENV NEXT_PUBLIC_ASSET_PREFIX=$NEXT_PUBLIC_ASSET_PREFIX
RUN pnpm --filter @talaltechno/emenu... build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Next.js standalone output includes the server and traced dependencies.
COPY --from=builder --chown=nextjs:nodejs /app/apps/emenu/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/emenu/.next/static ./apps/emenu/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/emenu/public ./apps/emenu/public

USER nextjs
EXPOSE 3001
CMD ["node", "apps/emenu/server.js"]
