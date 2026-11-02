# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app

# Workspace manifests first for layer caching.
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/admin/package.json apps/admin/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN pnpm install --no-frozen-lockfile --filter @talaltechno/admin...

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_STANDALONE=true
ARG NEXT_PUBLIC_API_URL=http://localhost:8080/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter @talaltechno/admin... build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Next.js standalone output includes the server and traced dependencies.
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/public ./apps/admin/public

USER nextjs
EXPOSE 3000
CMD ["node", "apps/admin/server.js"]
