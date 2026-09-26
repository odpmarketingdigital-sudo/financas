import { DashboardHeader } from "@/components/layout/dashboard-header";
import { SettingsManager } from "@/components/configuracoes/settings-manager";

export default function ConfiguracoesPage() {
  return (
    <>
      <DashboardHeader
        title="Configurações"
        description="Gerencie fontes de renda e categorias de despesas."
      />
      <SettingsManager />
    </>
  );
}
