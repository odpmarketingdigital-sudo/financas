import { DashboardHeader } from "@/components/layout/dashboard-header";
import { SummaryCards } from "@/components/dashboard/summary-cards";

export default function DashboardPage() {
  return (
    <>
      <DashboardHeader
        title="Painel"
        description="Resumo financeiro do mês selecionado para a família."
      />
      <SummaryCards />
    </>
  );
}
