# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Verify source files are correct before build
RUN echo "=== VERIFY SOURCE ===" && \
    grep -c "sharp" src/modules/ai-summaries/ai-thumbnail.service.ts && \
    grep -c "wrapText" src/modules/ai-summaries/ai-thumbnail.service.ts && \
    cat nest-cli.json && \
    echo "=== BUILDING ===" && \
    npm run build && \
    echo "=== VERIFY BUNDLE ===" && \
    node -e "const s=require('fs').readFileSync('dist/main.js','utf8'); console.log('HAS_SHARP:', s.includes('wrapText')); console.log('HAS_GEMINI:', s.includes('responseModalities'));"

# Production stage
FROM node:20-slim AS production

WORKDIR /app

# Install OpenSSL for Prisma + fonts for Sharp SVG text rendering + ffmpeg
# for extracting thumbnails from R2 HLS playlists at admin upload time.
RUN apt-get update -y && apt-get install -y openssl ca-certificates fontconfig fonts-dejavu-core fonts-liberation ffmpeg && rm -rf /var/lib/apt/lists/* && fc-cache -fv

# Install Anton Regular (Google Fonts, OFL) for AI thumbnail overlay text
COPY assets/fonts/Anton-Regular.ttf /usr/share/fonts/truetype/anton/Anton-Regular.ttf
RUN fc-cache -fv

# Copy package files and install production dependencies only
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production

# Generate Prisma client in production
RUN npx prisma generate

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy thumbnail background for Sharp thumbnail generation
COPY --from=builder /app/src/modules/ai-summaries/thumbnail-bg.base64.txt ./dist/modules/ai-summaries/thumbnail-bg.base64.txt

# Firebase service account is NOT baked into the image. At runtime the backend
# loads credentials via FIREBASE_SERVICE_ACCOUNT_KEY (Secret Manager) or, when
# absent, Application Default Credentials (Cloud Run service account). See
# firebase-admin.service.ts (Método 2 / Método 3) and secrets-loader.ts.

# Expose port (Cloud Run will set PORT env variable)
EXPOSE 8080

# Start the application
ENV NODE_ENV=production

# Run pending migrations on cold start as a safety net. The Cloud Run Job
# `cirurgiao-api-migrator` is the primary migration step (executed by
# deploy-artifact-registry.ps1 before the new revision goes live), but if
# someone bypasses the script this guarantees prod schema is in sync. The
# `_prisma_migrations` table holds an advisory lock, so concurrent
# instances serialize on first cold start of a new revision.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
