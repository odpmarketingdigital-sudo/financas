import { DashboardHeader } from "@/components/layout/dashboard-header";
import { BanksManager } from "@/components/bancos/banks-manager";

export default function BancosPage() {
  return (
    <>
      <DashboardHeader
        title="Bancos / Carteiras"
        description="Cadastre contas bancárias e carteiras de dinheiro físico com seus saldos."
        showMonthFilter={false}
      />
      <BanksManager />
    </>
  );
}
