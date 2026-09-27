export type ExpenseStatus = "paga" | "nao_paga";
export type ReceivableStatus = "recebido" | "a_receber";
export type CategoryType = "expense" | "receivable";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  created_at: string;
}

/** Legado: tabela `clients`, mantida apenas para dados históricos. */
export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  description: string;
  category: string | null;
  amount: number;
  due_date: string;
  status: ExpenseStatus;
  payment_date: string | null;
  reference_month: string;
  created_at: string;
}

export interface Receivable {
  id: string;
  user_id: string;
  category: string | null;
  description: string;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  status: ReceivableStatus;
  payment_date: string | null;
  reference_month: string;
  created_at: string;
}

export interface DashboardSummary {
  totalAPagar: number;
  totalPago: number;
  totalAReceber: number;
  totalRecebido: number;
  resultadoLiquidoPrevisto: number;
  resultadoLiquidoRealizado: number;
}
