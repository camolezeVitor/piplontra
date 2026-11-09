FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY server/package.json server/package-lock.json ./server/
RUN npm ci --prefix server

COPY . .
RUN npm run build
RUN npm --prefix server run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data

WORKDIR /app/server

COPY --from=build /app/server/package.json ./package.json
COPY --from=build /app/server/package-lock.json ./package-lock.json
RUN npm ci --omit=dev \
    && mkdir -p /data \
    && chown node:node /data

COPY --from=build --chown=node:node /app/server/dist ./dist
COPY --from=build --chown=node:node /app/dist/piplontra/browser /app/dist/piplontra/browser

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
