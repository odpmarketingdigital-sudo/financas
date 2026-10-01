import {
  BANK_OPTIONS,
  type BankOption,
} from "@/constants/banks";
import type { BrasilApiBank } from "@/services/brasilApi";

/**
 * Utilitários do seletor de bancos: busca/comparação sem acentos,
 * mesclagem da lista local com a lista completa da BrasilAPI e conversão
 * das opções para o componente `Combobox` (`src/components/ui/combobox.tsx`).
 */

/** Normaliza texto para busca/comparação (minúsculo e sem acentos). */
export function normalizeBankText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Encontra na lista padrão a opção correspondente ao nome informado. */
export function findBankOptionByName(name: string): BankOption | null {
  const key = normalizeBankText(name);
  if (!key) return null;

  return (
    BANK_OPTIONS.find((option) => normalizeBankText(option.name) === key) ??
    null
  );
}

/**
 * Filtra bancos por nome, sigla ou código COMPE.
 * Cada termo digitado precisa aparecer no texto (busca "sem acento").
 */
export function filterBankOptions(
  options: readonly BankOption[],
  term: string,
): BankOption[] {
  const terms = normalizeBankText(term).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...options];

  return options.filter((option) => {
    const haystack = normalizeBankText(
      `${option.name} ${option.initials} ${option.code ?? ""}`,
    );
    return terms.every((part) => haystack.includes(part));
  });
}

/**
 * Mescla listas de bancos removendo duplicatas pelo nome
 * (comparação sem diferenciar maiúsculas/minúsculas e acentos).
 */
export function mergeBankOptions(
  base: readonly BankOption[],
  extra: readonly BankOption[],
): BankOption[] {
  const merged = [...base];
  const seen = new Set(base.map((option) => normalizeBankText(option.name)));

  for (const option of extra) {
    const key = normalizeBankText(option.name);
    if (!key || seen.has(key)) continue;

    seen.add(key);
    merged.push(option);
  }

  return merged;
}

/** Descrição curta exibida ao lado do nome no seletor. */
export function bankOptionDescription(option: BankOption): string {
  if (option.kind === "cash") return "Espécie";
  if (option.kind === "custom") return "Digitar manualmente";
  return option.code ? `Código ${option.code}` : "Banco";
}

/** Converte as opções de banco no formato aceito pelo componente `Combobox`. */
export function toBankComboboxOptions(options: readonly BankOption[]) {
  return options.map((option) => ({
    value: option.id,
    label: option.name,
    description: bankOptionDescription(option),
    color: option.color,
    foreground: option.foreground,
    initials: option.initials,
    keywords: [option.kind, option.code ? String(option.code) : ""]
      .filter(Boolean)
      .join(" "),
  }));
}

/** Cores usadas para as instituições que chegam da BrasilAPI sem marca. */
const FALLBACK_COLORS = [
  "#0F766E",
  "#1D4ED8",
  "#7C3AED",
  "#B45309",
  "#BE123C",
  "#15803D",
  "#0369A1",
  "#4B5563",
];

function colorForName(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 997;
  }
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

/** Palavras genéricas ignoradas ao montar a sigla de um banco desconhecido. */
const GENERIC_NAME_WORDS = new Set([
  "banco",
  "bco",
  "s",
  "a",
  "sa",
  "do",
  "da",
  "de",
  "dos",
  "das",
  "e",
  "credito",
  "financiamento",
  "investimento",
  "cooperativa",
  "central",
  "instituto",
  "cambio",
  "cfi",
  "scm",
  "ip",
  "ltda",
]);

function toInitials(name: string): string {
  const allWords = name.split(/[\s.,\-/()]+/).filter(Boolean);
  const relevantWords = allWords.filter(
    (word) => !GENERIC_NAME_WORDS.has(normalizeBankText(word)),
  );
  const source = relevantWords.length > 0 ? relevantWords : allWords;

  const initials = source
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase();

  return initials || "#";
}

/** Converte um banco retornado pela BrasilAPI em opção do seletor. */
export function toBankOption(bank: BrasilApiBank): BankOption {
  const name = bank.fullName || bank.name;

  return {
    id: bank.ispb ? `brasilapi-${bank.ispb}` : `brasilapi-${normalizeBankText(name)}`,
    name,
    kind: "bank",
    color: colorForName(name),
    foreground: "#FFFFFF",
    initials: toInitials(name),
    code: bank.code ?? undefined,
  };
}
