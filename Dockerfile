# Builder Stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Production Stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN addgroup -S node && adduser -S node -G node
RUN chown -R node:node /app
USER node
EXPOSE 8443
CMD ["node", "src/server.js"]