FROM node:20-alpine AS builder
RUN apk add --no-cache postgresql-client
WORKDIR /app
RUN npm i -g bun
COPY package.json bun.lock ./
RUN bun i
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json /app/bun.lock ./
COPY --from=builder /app/dist ./dist
RUN npm ci --production --legacy-peer-deps
EXPOSE 4000
CMD ["node", "dist/server.js"]
