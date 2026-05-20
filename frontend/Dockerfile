# Build context: repository root (``docker compose`` ``web`` service).
FROM node:22-bookworm AS build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY backend/schema.graphql /schema/backend-schema.graphql
COPY frontend/ ./

# Codegen reads ``../backend/schema.graphql`` relative to frontend cwd → /app/backend
RUN mkdir -p /app/backend && cp /schema/backend-schema.graphql /app/backend/schema.graphql

ARG VITE_GRAPHQL_URL=http://127.0.0.1:8000/graphql/
ENV VITE_GRAPHQL_URL=$VITE_GRAPHQL_URL

RUN npm run codegen && npm run build

FROM nginx:1.27-alpine

RUN apk add --no-cache wget

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

HEALTHCHECK --interval=10s --timeout=3s --retries=3 --start-period=5s \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

EXPOSE 80
