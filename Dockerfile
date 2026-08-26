# Playwright image includes Chromium. Default user is root (sandbox off).
FROM mcr.microsoft.com/playwright:v1.58.2-noble

USER root
WORKDIR /app
ENV NODE_ENV=production \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PLAYWRIGHT_LAUNCH_ARGS=--disable-dev-shm-usage,--no-sandbox

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY deploy/crontab /app/crontab

# supercronic: container-friendly cron (used by docker compose on a VPS)
ADD https://github.com/aptible/supercronic/releases/download/v0.2.33/supercronic-linux-amd64 /usr/local/bin/supercronic
RUN chmod +x /usr/local/bin/supercronic

RUN mkdir -p /app/data

# One-shot default: Fly scheduled machines / `docker compose run scraper`
CMD ["node", "src/monitor.js"]
