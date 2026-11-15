FROM node:20-alpine AS builder

WORKDIR /app

# Copy server package configuration
COPY package*.json tsconfig.json ./
RUN npm install --include=dev

# Copy server source code and word database
COPY src ./src

# Build TypeScript to dist/ and copy words.json
RUN npm run build

# Production runtime image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/index.js"]
