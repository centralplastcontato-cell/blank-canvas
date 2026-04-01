import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PartnerSidebar } from "@/components/partner/PartnerSidebar";
import { PartnerCompanyDataCard } from "@/components/partner/PartnerCompanyDataCard";
import { PartnerNotificationsCard } from "@/components/partner/PartnerNotificationsCard";
import { PartnerAppearanceCard } from "@/components/partner/PartnerAppearanceCard";
import { PartnerAdvancedCard } from "@/components/partner/PartnerAdvancedCard";

export default function PartnerConfig() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <PartnerSidebar />
        <main className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
              <p className="text-sm text-muted-foreground">Gerencie as configurações da sua empresa parceira</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <PartnerCompanyDataCard />
            <PartnerNotificationsCard />
            <PartnerAppearanceCard />
            <PartnerAdvancedCard />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
