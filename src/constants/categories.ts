export const EXPENSE_CATEGORIES = [
  "Dízimo",
  "Jejum",
  "Aluguel",
  "Água",
  "Luz",
  "Internet",
  "Alimentação",
  "Restaurante",
  "Outros",
] as const;

export const RECEIVABLE_CATEGORIES = [
  "Salário",
  "Serviço diverso",
  "Pensão",
  "Aposentadoria",
  "Outros",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type ReceivableCategory = (typeof RECEIVABLE_CATEGORIES)[number];
