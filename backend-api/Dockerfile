# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production

# Generate Prisma client in production
RUN npx prisma generate

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Expose port (Cloud Run will set PORT env variable)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api || exit 1

# Start the application
ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "dist/main"]
