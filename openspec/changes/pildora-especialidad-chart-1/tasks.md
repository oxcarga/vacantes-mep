# Tareas

## 1. Tono de la píldora

- [x] 1.1 Reemplazar en `filtroTones` el tono `chart-5` por `chart-1` (`bg-chart-1/10 text-chart-1` y `hover:bg-chart-1/15`), asignar `tone="chart-1"` a `vacantes-filtro-especialidad` y dejar las píldoras de regional en `primary`, sin tocar `globals.css` ni `palette.test.ts`, y verificar con una prueba Playwright que, con la regional `53` e Inglés, `vacantes-filtro-regional-53` tiene `bg-primary/10` y `text-primary`, y `vacantes-filtro-especialidad` tiene `bg-chart-1/10` y `text-chart-1`

## 2. Integración

- [x] 2.1 Correr `npm test`, `npm run lint -w gomep-vacantes`, `npm run build -w gomep-vacantes` y `npm run test:e2e`, y verificar que todo pasa
