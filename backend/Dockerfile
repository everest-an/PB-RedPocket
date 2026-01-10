# Multi-stage build for RedPocket backend
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

# Development dependencies
FROM base AS deps-dev
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY backend/package*.json ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps-dev /app/node_modules ./node_modules
COPY backend/ ./

# Build TypeScript
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 redpocket

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

USER redpocket

EXPOSE 8080

CMD ["node", "dist/index.js"]
