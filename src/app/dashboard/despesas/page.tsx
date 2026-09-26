import { DashboardHeader } from "@/components/layout/dashboard-header";
import { ExpensesManager } from "@/components/despesas/expenses-manager";

export default function DespesasPage() {
  return (
    <>
      <DashboardHeader
        title="Despesas"
        description="Cadastre e acompanhe as contas a pagar do mês."
      />
      <ExpensesManager />
    </>
  );
}
