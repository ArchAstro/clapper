# A local evaluation image, separate from the shipped Clapper runtime.
FROM node:24-bookworm-slim
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV CLAPPER_VOICES=/opt/clapper-voices
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install --global pnpm@11.7.0
WORKDIR /opt/clapper
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
RUN pnpm install --frozen-lockfile --ignore-scripts && pnpm --dir packages/music build && pnpm --dir packages/cli exec playwright install --with-deps chromium
COPY benchmarks/technical-video ./benchmarks/technical-video
ARG INSTALL_VOICES=0
RUN if [ "$INSTALL_VOICES" = 1 ]; then node packages/cli/bin/clapper.mjs voices install; fi
WORKDIR /work
