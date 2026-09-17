FROM node:20-alpine AS build

WORKDIR /app

COPY --chown=node:node package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV STATE_FILE=app-state.json

WORKDIR /app

RUN apk upgrade --no-cache

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force \
  && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node server.mjs ./
COPY --chown=node:node warehouse-renderer.mjs ./
COPY --chown=node:node template-store.mjs ./
COPY --chown=node:node panel-auth.mjs ./
COPY --chown=node:node login-rate-limit.mjs ./

RUN mkdir -p /app/data && chown -R node:node /app

EXPOSE 3000 3010

USER node

CMD ["node", "server.mjs"]
