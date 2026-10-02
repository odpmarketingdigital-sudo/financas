import { DashboardHeader } from "@/components/layout/dashboard-header";
import { CashFlow } from "@/components/caixa/cash-flow";

// O Fluxo de caixa é sempre dinâmico: não servir esta rota a partir do cache de
// rotas do Next.js (os dados reais são buscados do Supabase no cliente).
export const revalidate = 0;

export default function CaixaPage() {
  return (
    <>
      <DashboardHeader
        title="Fluxo de caixa"
        description="Fluxo de caixa diário do mês selecionado, do dia 1 ao último dia do mês."
      />
      <CashFlow />
    </>
  );
}