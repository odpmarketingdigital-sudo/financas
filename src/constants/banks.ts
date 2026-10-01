/**
 * Lista padrão de bancos e carteiras usada pelo seletor inteligente do
 * cadastro de contas (`src/components/bancos/banks-manager.tsx`).
 *
 * As cores são aproximações das marcas oficiais e servem apenas para
 * identificação visual (selo com a sigla) na interface.
 *
 * Bancos menores que não estão nesta lista podem ser buscados online na
 * BrasilAPI (`src/services/brasilApi.ts`) e mesclados com
 * `mergeBankOptions` (`src/lib/banks.ts`).
 */

export type BankOptionKind =
  /** Banco/carteira da lista principal. */
  | "bank"
  /** Dinheiro físico em espécie — nome fixo "Dinheiro em mãos". */
  | "cash"
  /** "Outro Banco" — o usuário digita o nome manualmente. */
  | "custom";

export interface BankOption {
  /** Identificador estável usado como valor no combobox. */
  id: string;
  /** Nome gravado em `bank_accounts.name`. */
  name: string;
  kind: BankOptionKind;
  /** Cor principal da marca (hex). */
  color: string;
  /** Cor do texto/sigla sobre `color` (hex). */
  foreground: string;
  /** Sigla exibida no selo visual. */
  initials: string;
  /** Código COMPE do banco, quando existir. */
  code?: number;
}

/** Id do item "Dinheiro em mãos". */
export const CASH_ACCOUNT_ID = "dinheiro-em-maos";
/** Nome fixo gravado nas contas de dinheiro físico. */
export const CASH_ACCOUNT_NAME = "Dinheiro em mãos";
/** Id do item "Outro Banco" (nome digitado manualmente). */
export const OTHER_BANK_ID = "outro-banco";
/** Rótulo do item que libera o campo de texto livre. */
export const OTHER_BANK_NAME = "Outro Banco";

export const BANKS: readonly BankOption[] = [
  {
    id: "nubank",
    name: "Nubank",
    kind: "bank",
    color: "#820AD1",
    foreground: "#FFFFFF",
    initials: "Nu",
    code: 260,
  },
  {
    id: "itau",
    name: "Itaú",
    kind: "bank",
    color: "#EC7000",
    foreground: "#FFFFFF",
    initials: "It",
    code: 341,
  },
  {
    id: "bradesco",
    name: "Bradesco",
    kind: "bank",
    color: "#CC092F",
    foreground: "#FFFFFF",
    initials: "Br",
    code: 237,
  },
  {
    id: "banco-do-brasil",
    name: "Banco do Brasil",
    kind: "bank",
    color: "#F9DD16",
    foreground: "#003399",
    initials: "BB",
    code: 1,
  },
  {
    id: "caixa-economica",
    name: "Caixa Econômica",
    kind: "bank",
    color: "#0070AF",
    foreground: "#FFFFFF",
    initials: "CE",
    code: 104,
  },
  {
    id: "santander",
    name: "Santander",
    kind: "bank",
    color: "#EC0000",
    foreground: "#FFFFFF",
    initials: "St",
    code: 33,
  },
  {
    id: "banco-inter",
    name: "Banco Inter",
    kind: "bank",
    color: "#FF7A00",
    foreground: "#FFFFFF",
    initials: "In",
    code: 77,
  },
  {
    id: "c6-bank",
    name: "C6 Bank",
    kind: "bank",
    color: "#242424",
    foreground: "#FFFFFF",
    initials: "C6",
    code: 336,
  },
  {
    id: "btg-pactual",
    name: "BTG Pactual",
    kind: "bank",
    color: "#003B70",
    foreground: "#FFFFFF",
    initials: "BT",
    code: 208,
  },
  {
    id: "mercado-pago",
    name: "Mercado Pago",
    kind: "bank",
    color: "#009EE3",
    foreground: "#FFFFFF",
    initials: "MP",
    code: 323,
  },
  {
    id: "picpay",
    name: "PicPay",
    kind: "bank",
    color: "#21C25E",
    foreground: "#FFFFFF",
    initials: "PP",
    code: 380,
  },
  {
    id: "pagbank",
    name: "PagBank",
    kind: "bank",
    color: "#00A868",
    foreground: "#FFFFFF",
    initials: "PB",
    code: 290,
  },
  {
    id: "neon",
    name: "Neon",
    kind: "bank",
    color: "#00AEEF",
    foreground: "#FFFFFF",
    initials: "Ne",
    code: 655,
  },
  {
    id: "sicoob",
    name: "Sicoob",
    kind: "bank",
    color: "#00683D",
    foreground: "#FFFFFF",
    initials: "Sc",
    code: 756,
  },
  {
    id: "sicredi",
    name: "Sicredi",
    kind: "bank",
    color: "#00923F",
    foreground: "#FFFFFF",
    initials: "Si",
    code: 748,
  },
];

/** Opções que não representam um banco específico. */
export const SPECIAL_BANK_OPTIONS: readonly BankOption[] = [
  {
    id: CASH_ACCOUNT_ID,
    name: CASH_ACCOUNT_NAME,
    kind: "cash",
    color: "#0F766E",
    foreground: "#FFFFFF",
    initials: "$",
  },
  {
    id: OTHER_BANK_ID,
    name: OTHER_BANK_NAME,
    kind: "custom",
    color: "#475569",
    foreground: "#FFFFFF",
    initials: "?",
  },
];

/** Lista completa exibida no seletor de contas. */
export const BANK_OPTIONS: readonly BankOption[] = [
  ...BANKS,
  ...SPECIAL_BANK_OPTIONS,
];
