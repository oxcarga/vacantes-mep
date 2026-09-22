# La imagen oficial de Playwright ya trae Chromium y sus dependencias.
FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /app

ENV NODE_ENV=production \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PLAYWRIGHT_LAUNCH_ARGS=--disable-dev-shm-usage,--no-sandbox \
    DATABASE_URL=file:/app/data/vacantes.db

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY deploy/crontab ./crontab

# supercronic: cron pensado para contenedores (lo usa docker compose).
ADD https://github.com/aptible/supercronic/releases/download/v0.2.33/supercronic-linux-amd64 /usr/local/bin/supercronic
RUN chmod +x /usr/local/bin/supercronic \
    && mkdir -p /app/data \
    && chown -R pwuser:pwuser /app

USER pwuser

# Por defecto una sola consulta: sirve para `docker compose run` y para las
# máquinas programadas de Fly. docker-compose.yml lo cambia por supercronic.
CMD ["node", "src/main.js"]
