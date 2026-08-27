#!/usr/bin/env node
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadConfig } from "./config.js";
import { notify } from "./notify.js";
import { fetchVacancyPages } from "./scrape.js";
import { createStore } from "./store.js";
import {
  buildNotification,
  diffVacancies,
  filterVacancies,
  hashVacancies,
  parseVacancies,
  specialtyLabel,
  uniqueVacancies,
} from "./vacancies.js";

export async function runMonitor(config = loadConfig()) {
  const startedAt = new Date().toISOString();
  console.log(`[${startedAt}] Consultando ${config.targetUrl}`);

  const store = await createStore(config);
  let notified = false;

  try {
    const pages = await fetchVacancyPages(config);
    const parsed = uniqueVacancies(
      pages.flatMap((html) =>
        parseVacancies(html, {
          contentSelector: config.contentSelector,
          cellNames: config.cellNames,
        }),
      ),
      config.identityCellNames,
    );
    const current = filterVacancies(parsed, config.columnFilters);
    const { isFirstRun, vacancies: previous } = await store.loadPrevious();

    console.log(
      `Se leyeron ${parsed.length} vacantes en ${pages.length} página(s); ${current.length} pasan los filtros.`,
    );

    // An empty table usually means the scrape broke (session timeout, layout
    // change) rather than every vacancy closing at once. Committing it would
    // drop the history and report every vacancy as new on the next run.
    if (parsed.length === 0 && previous.length > 0 && !config.allowEmptyTable) {
      await store.recordFailure({
        startedAt,
        error: "La tabla de vacantes llegó vacía",
      });
      notified = true;
      await notify(
        config,
        "La tabla de vacantes del MEP llegó vacía",
        `Se conservaron las ${previous.length} vacantes anteriores. Configure ALLOW_EMPTY_TABLE=1 si la regional realmente puede quedar sin vacantes.`,
      );
      return { status: "empty-table", current, previous };
    }

    const diff = diffVacancies(previous, current, {
      cellNames: config.cellNames,
      identityCellNames: config.identityCellNames,
    });

    const notification = buildNotification({
      isFirstRun,
      current,
      added: diff.added,
      removed: diff.removed,
      changed: diff.changed,
      specialty: specialtyLabel(config.especialidades),
      regional: config.regional,
      cellNames: config.cellNames,
      identityCellNames: config.identityCellNames,
    });

    if (notification) {
      notified = true;
      await notify(config, notification.title, notification.body);
    } else {
      console.log("Sin cambios desde la última consulta.");
    }

    await store.commit({
      current,
      added: diff.added,
      removed: diff.removed,
      changed: diff.changed,
      startedAt,
      contentHash: hashVacancies(current, config.cellNames),
    });
    console.log(
      `Estado guardado en ${store.description}: ${current.length} activas, ${diff.added.length} nuevas, ${diff.removed.length} cerradas, ${diff.changed.length} modificadas.`,
    );

    return { status: "ok", ...diff, current };
  } catch (error) {
    console.error(error);
    await store
      .recordFailure({ startedAt, error: error.message || String(error) })
      .catch((storeError) =>
        console.error("No se pudo registrar el fallo:", storeError),
      );
    if (!notified) {
      await notify(
        config,
        "Error al consultar las vacantes del MEP",
        error.message || String(error),
      ).catch((notifyError) =>
        console.error("Tampoco se pudo notificar el error:", notifyError),
      );
    }
    throw error;
  } finally {
    await store.close();
  }
}

const isEntryPoint =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isEntryPoint) {
  runMonitor().catch(() => {
    process.exitCode = 1;
  });
}
