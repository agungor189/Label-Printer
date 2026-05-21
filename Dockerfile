FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV STATE_FILE=app-state.json

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY server.mjs ./

RUN mkdir -p /app/data && chown -R node:node /app

EXPOSE 3000

CMD ["node", "server.mjs"]
