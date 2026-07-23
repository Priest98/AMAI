# =============================================================
# Marketing OS API — Production Dockerfile (Root Copy)
# =============================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Ensure DATABASE_URL is present during build time for Prisma generation
ENV DATABASE_URL="postgresql://postgres:Morenikeji%402005@db.rkgasmafgosubwfejzqu.supabase.co:5432/postgres"
ENV PRISMA_GENERATE_SKIP_AUTO_INSTALL=true

# Copy root and package manifests
COPY package*.json ./
COPY packages/database/package*.json ./packages/database/
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/database ./packages/database
COPY packages/shared-types ./packages/shared-types
COPY apps/api ./apps/api

# Generate Prisma Client & Build NestJS API
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npm run build --workspace=api

# --- Production Runner Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]
