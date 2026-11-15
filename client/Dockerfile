# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy configuration files
COPY package*.json tsconfig*.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
RUN npm install --include=dev

# Copy source code and assets
COPY src ./src
COPY public ./public

# Allow passing backend URL during docker build
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

RUN npm run build

# Nginx Production Stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
