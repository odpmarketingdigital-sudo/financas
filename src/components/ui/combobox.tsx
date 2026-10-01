"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, LoaderCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Texto auxiliar exibido à direita (ex.: "Código 260"). */
  description?: string;
  /** Cor principal do selo (hex). */
  color?: string;
  /** Cor da sigla sobre `color` (hex). */
  foreground?: string;
  /** Sigla exibida no selo. */
  initials?: string;
  /** Termos extras considerados na busca local. */
  keywords?: string;
}

interface ComboboxProps {
  id?: string;
  label?: string;
  error?: string;
  hint?: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  /** Disparado a cada digitação: permite complementar a lista online. */
  onSearchChange?: (term: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  /** Mostra o indicador de carregamento da busca online. */
  loading?: boolean;
  className?: string;
}

/** Remove acentos e caixa para permitir buscar "itau" e encontrar "Itaú". */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchesTerm(option: ComboboxOption, term: string): boolean {
  if (!term) return true;

  const haystack = normalize(
    [option.label, option.description, option.keywords]
      .filter(Boolean)
      .join(" "),
  );

  return term.split(/\s+/).every((part) => haystack.includes(part));
}

function OptionBadge({ option }: { option: ComboboxOption }) {
  if (!option.initials) return null;

  return (
    <span
      aria-hidden
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-semibold uppercase"
      style={{
        backgroundColor: option.color ?? "#E2E8F0",
        color: option.foreground ?? "#0F172A",
      }}
    >
      {option.initials}
    </span>
  );
}

export function Combobox({
  id,
  label,
  error,
  hint,
  options,
  value,
  onChange,
  onSearchChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Nenhum resultado encontrado.",
  disabled,
  loading,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((option) => option.value === value) ?? null;
  const normalizedTerm = normalize(term);
  const filtered = useMemo(
    () => options.filter((option) => matchesTerm(option, normalizedTerm)),
    [options, normalizedTerm],
  );

  // Fecha ao clicar/tocar fora do componente.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  // Mantém o foco no campo de busca enquanto a lista está aberta.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  // Garante que o item destacado pelo teclado continue visível.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.children[highlighted] as
      | HTMLElement
      | undefined;
    node?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

  function openList() {
    const selectedIndex = options.findIndex((option) => option.value === value);
    setTerm("");
    setHighlighted(selectedIndex > 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function closeList() {
    setOpen(false);
    setTerm("");
  }

  function selectOption(option: ComboboxOption) {
    onChange(option.value);
    closeList();
  }

  function handleTermChange(nextTerm: string) {
    setTerm(nextTerm);
    setHighlighted(0);
    onSearchChange?.(nextTerm);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (filtered.length === 0) return;

      setHighlighted((current) => {
        const next = event.key === "ArrowDown" ? current + 1 : current - 1;
        return Math.min(Math.max(next, 0), filtered.length - 1);
      });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[highlighted];
      if (option) selectOption(option);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeList();
    }
  }

  const activeOption = filtered[highlighted] ?? null;


  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <div ref={containerRef} className="relative">
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => (open ? closeList() : openList())}
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:bg-slate-50",
            error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20",
            className,
          )}
        >
          {selected ? (
            <>
              <OptionBadge option={selected} />
              <span className="flex-1 truncate text-slate-900">
                {selected.label}
              </span>
              {selected.description && (
                <span className="hidden shrink-0 text-xs text-slate-400 sm:inline">
                  {selected.description}
                </span>
              )}
            </>
          ) : (
            <span className="flex-1 truncate text-slate-400">{placeholder}</span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-slate-400 transition",
              open && "rotate-180",
            )}
          />
        </button>

        {open && (
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center gap-2 border-b border-slate-100 px-3">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                role="combobox"
                aria-expanded={open}
                aria-controls={id ? `${id}-listbox` : undefined}
                aria-autocomplete="list"
                aria-activedescendant={
                  id && activeOption
                    ? `${id}-option-${activeOption.value}`
                    : undefined
                }
                value={term}
                onChange={(event) => handleTermChange(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="h-10 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              {loading && (
                <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-slate-400" />
              )}
            </div>

            <ul
              ref={listRef}
              id={id ? `${id}-listbox` : undefined}
              role="listbox"
              className="max-h-60 overflow-y-auto py-1"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-slate-500">
                  {loading ? "Buscando bancos..." : emptyMessage}
                </li>
              ) : (
                filtered.map((option, index) => (
                  <li
                    key={option.value}
                    id={id ? `${id}-option-${option.value}` : undefined}
                    role="option"
                    aria-selected={option.value === value}
                    onClick={() => selectOption(option)}
                    onMouseEnter={() => setHighlighted(index)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm",
                      index === highlighted && "bg-teal-50",
                    )}
                  >
                    <OptionBadge option={option} />
                    <span className="flex-1 truncate text-slate-900">
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="shrink-0 text-xs text-slate-400">
                        {option.description}
                      </span>
                    )}
                    {option.value === value && (
                      <Check className="h-4 w-4 shrink-0 text-teal-700" />
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

