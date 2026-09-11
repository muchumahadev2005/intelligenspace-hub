FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy source code
COPY src/ ./src/

EXPOSE 3001

# Run database migration (safe with IF NOT EXISTS) and start the server
CMD ["sh", "-c", "node src/db/migrate.js && node src/index.js"]
