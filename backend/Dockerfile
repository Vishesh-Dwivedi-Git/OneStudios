# ─── OneStudios Backend ──────────────────────────────────
# Multi-stage build for smaller final image
# mediasoup requires native C++ compilation (needs python3, make, g++)

# ── Stage 1: Build ──
FROM node:22-bullseye-slim AS builder

# Install build tools for mediasoup native deps
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first (Docker cache optimization)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npx tsc

# ── Stage 2: Production ──
FROM node:22-bullseye-slim AS runner

# mediasoup workers need these at runtime
RUN apt-get update && apt-get install -y \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only production dependencies + built output
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

# Environment
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:5000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Run with Node directly (not tsx in production)
CMD ["node", "dist/index.js"]
