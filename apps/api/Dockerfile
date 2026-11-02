# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app

# Workspace manifests first for layer caching.
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/zatca-engine/package.json packages/zatca-engine/package.json
COPY packages/thermal-printer/package.json packages/thermal-printer/package.json

RUN pnpm install --no-frozen-lockfile --filter @talaltechno/api...

COPY . .

ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
RUN pnpm --filter @talaltechno/database exec prisma generate
# Fail fast if the Prisma CLI is missing: the runtime entrypoint needs it for
# `prisma db push` / provisioning.
RUN pnpm --filter @talaltechno/database exec prisma --version
RUN pnpm --filter @talaltechno/api... build

FROM node:22-alpine AS runner
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/tsconfig.base.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages ./packages

RUN chmod +x /app/apps/api/docker-entrypoint.sh
EXPOSE 4000
ENTRYPOINT ["/app/apps/api/docker-entrypoint.sh"]
