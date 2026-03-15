FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install

COPY . .

RUN bun run build


FROM oven/bun:1-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/bun.lockb ./
COPY --from=builder /app/dist ./dist

RUN bun install --production

EXPOSE 4000

CMD ["bun", "dist/server.js"]