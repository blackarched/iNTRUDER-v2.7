# Builder Stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm prune --production

# Production Stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/config ./config
COPY --from=builder /app/src ./src
COPY --from=builder /app/nexus_server.js ./nexus_server.js
COPY --from=builder /app/public ./public
RUN addgroup -S node && adduser -S node -G node
RUN chown -R node:node /app
USER node
EXPOSE 8443
CMD ["node", "nexus_server.js"]