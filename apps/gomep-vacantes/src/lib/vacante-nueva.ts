const costaRicaDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Costa_Rica",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dayKey(date: Date) {
  return costaRicaDay.format(date);
}

function previousDayKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

export function esVacanteNueva(firstSeen: string | undefined, ahora: Date) {
  if (!firstSeen) return false;
  const time = Date.parse(firstSeen);
  if (Number.isNaN(time)) return false;
  return dayKey(new Date(time)) >= previousDayKey(dayKey(ahora));
}
