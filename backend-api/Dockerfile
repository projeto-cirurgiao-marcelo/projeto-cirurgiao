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

# Install OpenSSL for Prisma + fonts for Sharp SVG text rendering
RUN apt-get update -y && apt-get install -y openssl ca-certificates fontconfig fonts-dejavu-core fonts-liberation && rm -rf /var/lib/apt/lists/* && fc-cache -fv

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

# Copy firebase service account
COPY firebase-service-account.json ./firebase-service-account.json

# Expose port (Cloud Run will set PORT env variable)
EXPOSE 8080

# Start the application
ENV NODE_ENV=production

CMD ["node", "dist/main"]
