import { DashboardHeader } from "@/components/layout/dashboard-header";
import { ReceivablesManager } from "@/components/recebiveis/receivables-manager";

export default function RecebiveisPage() {
  return (
    <>
      <DashboardHeader
        title="Entradas"
        description="Valores a receber associados a cada fonte de renda."
      />
      <ReceivablesManager />
    </>
  );
}
