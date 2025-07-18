# This is a test comment to confirm Dockerfile changes are pushed
# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.svelte-kit ./.svelte-kit
COPY --from=builder /app/static ./static
COPY --from=builder /app/vite.config.ts ./
EXPOSE 6134
ENV NODE_ENV=production
CMD ["npm", "run", "preview", "--", "--port", "6134", "--host", "0.0.0.0", "--strictPort"]