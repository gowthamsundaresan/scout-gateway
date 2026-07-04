# Scout Gateway — API image

# Stage 1: install + build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/api/package.json ./packages/api/

RUN npm ci

COPY packages/api ./packages/api

RUN npm run build --workspace=packages/api

# Stage 2: runtime
FROM node:20-alpine

WORKDIR /app

ARG CI_BUILD_VERSION
ENV API_VERSION=$CI_BUILD_VERSION

COPY --from=builder /app/packages/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/api/src ./src

# tsx runs the TypeScript entrypoint directly
CMD ["npx", "tsx", "src/index.ts"]
