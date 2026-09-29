import { DashboardHeader } from "@/components/layout/dashboard-header";
import { CashFlow } from "@/components/caixa/cash-flow";

export default function CaixaPage() {
  return (
    <>
      <DashboardHeader
        title="Caixa"
        description="Fluxo de caixa diário do mês selecionado, do dia 1 ao último dia do mês."
      />
      <CashFlow />
    </>
  );
}