/**
 * Finds a matching option from the available list. Tries an exact value match
 * first, then an exact label match, and finally a partial label match.
 * @param {{ value: string, label: string }[]} available - Options returned by the dropdown.
 * @param {{ value?: string, label?: string }} [criteria] - Value and/or label to search for.
 * @returns {{ value: string, label: string } | undefined}
 */
export function findDropdownOption(available, { value = "", label = "" } = {}) {
  const wantedValue = String(value || "").trim();
  const wantedLabel = String(label || "")
    .trim()
    .toLowerCase();
  const options = available ?? [];

  return (
    options.find((option) => wantedValue && option.value === wantedValue) ??
    options.find(
      (option) =>
        wantedLabel &&
        String(option.label || "")
          .trim()
          .toLowerCase() === wantedLabel,
    ) ??
    options.find(
      (option) =>
        wantedLabel &&
        String(option.label || "")
          .toLowerCase()
          .includes(wantedLabel),
    )
  );
}

/**
 * Formats a human-readable error message listing all available dropdown options.
 * @param {{ value: string, label: string }} wanted - The option that could not be found.
 * @param {{ value: string, label: string }[]} available - All options the dropdown offered.
 * @returns {string}
 */
export function formatMissingDropdownOption({ value, label }, available) {
  const list =
    available?.length > 0
      ? available.map((option) => `${option.value}: ${option.label}`).join("; ")
      : "(ninguna)";
  return `No existe la opción "${label || ""}" (value ${value || ""}) en el dropdown. Opciones disponibles: ${list}`;
}
