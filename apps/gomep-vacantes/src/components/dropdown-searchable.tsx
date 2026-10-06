"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type DropdownOption = { value: string; label: string };

export type DropdownSearchableProps = {
  options: DropdownOption[];
  value: string[];
  onChange: (value: string[]) => void;
  nombre?: string;
  multiple?: boolean;
  max?: number;
  idPrefix: string;
  buttonClassName?: string;
};

const defaultTriggerClass =
  "h-10 w-full appearance-none rounded-lg border border-input bg-background pr-9 pl-3 text-sm font-normal text-left outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function normalizeForSearch(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function matchesSearch(label: string, query: string) {
  if (!query) return true;
  return normalizeForSearch(label).includes(normalizeForSearch(query));
}

export function DropdownSearchable({
  options,
  value,
  onChange,
  nombre,
  multiple = false,
  max: maxProp,
  idPrefix,
  buttonClassName,
}: DropdownSearchableProps) {
  const listId = `${idPrefix}-lista`;
  const todasId = `${idPrefix}-todas`;
  const searchId = `${idPrefix}-buscar`;
  const maximoId = `${idPrefix}-maximo`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const max = multiple ? (maxProp ?? 5) : 1;
  const nombrePlural = nombre ?? "[...]";
  const todasLabel = `Todas las ${nombrePlural}`;
  const selected = useMemo(() => new Set(value), [value]);
  const labelByValue = useMemo(
    () => new Map(options.map((row) => [row.value, row.label])),
    [options],
  );

  const visibleOptions = useMemo(
    () => options.filter((row) => matchesSearch(row.label, search)),
    [options, search],
  );

  const atMax = multiple && value.length >= max;

  const closedLabel = useMemo(() => {
    if (value.length === 0) return todasLabel;
    if (value.length === 1) {
      return labelByValue.get(value[0]) ?? value[0];
    }
    return `${value.length} ${nombrePlural}`;
  }, [value, labelByValue, todasLabel, nombrePlural]);

  const rowIds = useMemo(() => {
    const ids = [todasId];
    for (const row of visibleOptions) {
      ids.push(`${idPrefix}-opcion-${row.value}`);
    }
    return ids;
  }, [visibleOptions, idPrefix, todasId]);

  const closePanel = useCallback((returnFocus = true) => {
    setOpen(false);
    setSearch("");
    setActiveIndex(null);
    if (returnFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  const openPanel = useCallback(() => {
    setOpen(true);
    setActiveIndex(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closePanel(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closePanel]);

  const activateTodas = useCallback(() => {
    onChange([]);
    setSearch("");
    if (multiple) {
      setActiveIndex(null);
    } else {
      closePanel();
    }
  }, [onChange, multiple, closePanel]);

  const activateOption = useCallback(
    (optionValue: string) => {
      if (multiple) {
        if (selected.has(optionValue)) {
          onChange(value.filter((v) => v !== optionValue));
        } else if (!atMax) {
          onChange([...value, optionValue]);
        }
        return;
      }
      onChange([optionValue]);
      closePanel();
    },
    [multiple, selected, atMax, value, onChange, closePanel],
  );

  const activateActiveRow = useCallback(() => {
    if (activeIndex === null) return;
    if (activeIndex === 0) {
      activateTodas();
      return;
    }
    const row = visibleOptions[activeIndex - 1];
    if (!row) return;
    if (multiple && atMax && !selected.has(row.value)) return;
    activateOption(row.value);
  }, [activeIndex, visibleOptions, activateTodas, activateOption, multiple, atMax, selected]);

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closePanel();
      return;
    }
    if (event.key === "Tab") {
      closePanel(false);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      activateActiveRow();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const last = rowIds.length - 1;
      if (last < 0) return;
      setActiveIndex((prev) => {
        if (prev === null) return 0;
        return Math.min(prev + 1, last);
      });
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const last = rowIds.length - 1;
      if (last < 0) return;
      setActiveIndex((prev) => {
        if (prev === null) return last;
        return Math.max(prev - 1, 0);
      });
    }
  }

  useEffect(() => {
    if (!open || activeIndex === null) return;
    const id = rowIds[activeIndex];
    if (!id) return;
    const el = document.getElementById(id);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, rowIds, open]);

  const activeDescendant =
    open && activeIndex !== null && rowIds[activeIndex]
      ? rowIds[activeIndex]
      : undefined;

  return (
    <div className="DropdownSearchable relative" ref={rootRef}>
      <span className="relative block">
        <button
          ref={triggerRef}
          type="button"
          className={cn(defaultTriggerClass, buttonClassName)}
          data-testid={idPrefix}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => (open ? closePanel() : openPanel())}
        >
          <span className="block truncate">{closedLabel}</span>
        </button>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
      </span>
      {open ? (
        <div
          className="absolute top-full right-0 left-0 z-20 mt-1 max-h-70 overflow-hidden rounded-lg border bg-popover shadow-md"
        >
          <div className="border-b p-1">
            <Input
              ref={inputRef}
              id={searchId}
              data-testid={searchId}
              type="search"
              placeholder="Buscar"
              value={search}
              onChange={(event) => {
                const next = event.target.value;
                setSearch(next);
                if (!next) {
                  setActiveIndex(null);
                  return;
                }
                const filtered = options.filter((row) => matchesSearch(row.label, next));
                setActiveIndex(filtered.length > 0 ? 1 : null);
              }}
              onKeyDown={onInputKeyDown}
              aria-controls={listId}
              aria-activedescendant={activeDescendant}
              autoComplete="off"
              className="h-8"
            />
          </div>
          {multiple ? (
            <p
              id={maximoId}
              data-testid={maximoId}
              className="px-2 py-1 text-xxs text-muted-foreground"
            >
              <span className={cn(!atMax && "invisible")}>
                Máximo {max} {nombrePlural}
              </span>
            </p>
          ) : null}
          <ul
            id={listId}
            data-testid={listId}
            role="listbox"
            aria-multiselectable={multiple ? "true" : undefined}
            className="max-h-48 overflow-y-auto p-1 [&>li]:mb-[3px]"
          >
            <li>
              <button
                type="button"
                id={todasId}
                role="option"
                data-testid={todasId}
                aria-selected={value.length === 0}
                tabIndex={-1}
                onClick={activateTodas}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50",
                  activeIndex === 0 && "bg-muted ring-2 ring-ring/50",
                )}
              >
                <span className="flex size-4 shrink-0 items-center justify-center">
                  {value.length === 0 ? <Check aria-hidden className="size-4" /> : null}
                </span>
                {todasLabel}
              </button>
            </li>
            {visibleOptions.map((row, index) => {
              const elegida = selected.has(row.value);
              const disabled = multiple && atMax && !elegida;
              const rowIndex = index + 1;
              const optionId = `${idPrefix}-opcion-${row.value}`;
              return (
                <li key={row.value}>
                  <button
                    type="button"
                    id={optionId}
                    role="option"
                    data-testid={optionId}
                    aria-selected={elegida}
                    aria-disabled={disabled || undefined}
                    disabled={disabled}
                    tabIndex={-1}
                    onClick={() => !disabled && activateOption(row.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
                      elegida && "bg-muted",
                      activeIndex === rowIndex && "ring-2 ring-ring/50",
                    )}
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center">
                      {elegida ? <Check aria-hidden className="size-4" /> : null}
                    </span>
                    {row.label}
                  </button>
                </li>
              );
            })}
            {search && visibleOptions.length === 0 ? (
              <li
                className="px-2 py-1.5 text-sm text-muted-foreground"
                data-testid={`${idPrefix}-sin-coincidencias`}
              >
                Sin coincidencias
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
