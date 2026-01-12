FROM node:22-slim AS base
ARG TARGET_APP=saleor-app-smtp
ARG TARGET_APP_DIRECTORY=smtp

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV TARGET_APP=$TARGET_APP
ENV TARGET_APP_DIRECTORY=$TARGET_APP_DIRECTORY

RUN corepack enable

FROM base AS build

COPY . /app
WORKDIR /app
RUN pnpm --filter $TARGET_APP... install
RUN pnpm --filter $TARGET_APP build

RUN mkdir -p /app/apps/$TARGET_APP_DIRECTORY/public
RUN mkdir -p /app/apps/$TARGET_APP_DIRECTORY/.next/static

FROM base AS runner
RUN apt-get update && apt-get install -y curl ca-certificates wget

WORKDIR /app/apps/$TARGET_APP_DIRECTORY

ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=build /app/apps/$TARGET_APP_DIRECTORY/public ./public
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=build --chown=nextjs:nodejs /app/apps/$TARGET_APP_DIRECTORY/.next/standalone /app
COPY --from=build --chown=nextjs:nodejs /app/apps/$TARGET_APP_DIRECTORY/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]