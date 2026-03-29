FROM oven/bun:latest
WORKDIR /app

COPY package.json bun.lock tsconfig.base.json ./
COPY apps/bot/package.json apps/bot/
RUN bun install --frozen-lockfile

COPY apps/bot/ apps/bot/

WORKDIR /app/apps/bot
CMD ["bun", "src/index.ts"]
