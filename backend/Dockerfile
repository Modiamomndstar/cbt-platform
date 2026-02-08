# Backend Dockerfile (multi-stage)
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Runtime image
FROM node:18-alpine
WORKDIR /usr/src/app

# Install netcat for simple "wait for" checks
RUN apk add --no-cache netcat-openbsd

# Copy built app and node_modules
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/scripts ./scripts

# Entrypoint: migrations + start
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 5000
ENV NODE_ENV=production
CMD ["./entrypoint.sh"]
