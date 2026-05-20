# Build SPA; GraphQL URL is fixed at image build time (browser calls host port 8000).
FROM node:22-bookworm AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_GRAPHQL_URL=http://127.0.0.1:8000/graphql/
ENV VITE_GRAPHQL_URL=$VITE_GRAPHQL_URL

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
