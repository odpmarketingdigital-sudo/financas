import { Sidebar } from "@/components/layout/sidebar";
import { MonthProvider } from "@/contexts/month-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MonthProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden px-4 pb-10 pt-20 lg:px-8 lg:pt-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </MonthProvider>
  );
}
