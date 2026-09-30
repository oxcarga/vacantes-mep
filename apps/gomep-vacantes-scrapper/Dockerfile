# Build from the repo root:
#   docker build -f apps/gomep-vacantes-scrapper/Dockerfile .
FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /app

ENV NODE_ENV=production \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PLAYWRIGHT_LAUNCH_ARGS=--disable-dev-shm-usage,--no-sandbox

COPY package.json package-lock.json ./
COPY packages/schema ./packages/schema
COPY apps/gomep-vacantes-scrapper/package.json ./apps/gomep-vacantes-scrapper/

RUN npm ci --omit=dev --workspace=gomep-vacantes-scrapper --include-workspace-root \
    && chown -R pwuser:pwuser /app

COPY apps/gomep-vacantes-scrapper/src ./apps/gomep-vacantes-scrapper/src

WORKDIR /app/apps/gomep-vacantes-scrapper

USER pwuser

CMD ["node", "src/main.js"]
