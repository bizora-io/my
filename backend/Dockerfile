# Bizora API
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/
RUN npm install --workspace=backend --workspace=shared --include-workspace-root=false 2>/dev/null || npm install -w backend -w shared

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules 2>/dev/null || true
COPY package.json ./
COPY shared ./shared
COPY backend ./backend
WORKDIR /app/backend
RUN npm run build 2>/dev/null || npx tsc -p tsconfig.json || true

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY shared ./shared
COPY backend ./backend
WORKDIR /app/backend
EXPOSE 3001
CMD ["npx", "tsx", "server.ts"]
