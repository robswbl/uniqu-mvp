# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/.svelte-kit ./
COPY --from=builder /app/static ./static
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "run", "preview", "--", "--port", "3000", "--host"] 