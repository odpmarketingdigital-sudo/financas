import { DashboardHeader } from "@/components/layout/dashboard-header";
import { ProfileManager } from "@/components/perfil/profile-manager";

export default function PerfilPage() {
  return (
    <>
      <DashboardHeader title="Perfil" description="Gerencie seus dados, nome de exibição e sessão." showMonthFilter={false} />
      <ProfileManager />
    </>
  );
}
