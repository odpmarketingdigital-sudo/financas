import { DashboardHeader } from "@/components/layout/dashboard-header";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { CategoryCharts } from "@/components/dashboard/category-charts";

export default function DashboardPage() {
  return (
    <>
      <DashboardHeader
        title="Painel"
        description="Resumo financeiro do mês selecionado para a família."
      />
      <div className="space-y-4">
        <SummaryCards />
        <CategoryCharts />
      </div>
    </>
  );
}
