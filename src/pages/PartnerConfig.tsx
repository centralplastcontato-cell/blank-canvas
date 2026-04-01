import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PartnerSidebar } from "@/components/partner/PartnerSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Store, Bell, Palette } from "lucide-react";

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
            <Card>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">Dados da Empresa</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Nome, logo e informações de contato da sua empresa parceira.</p>
                <p className="text-xs text-muted-foreground/60 mt-2 italic">Em breve</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-orange-500" />
                </div>
                <CardTitle className="text-base">Notificações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Configure alertas para novos pedidos e atualizações.</p>
                <p className="text-xs text-muted-foreground/60 mt-2 italic">Em breve</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Palette className="h-5 w-5 text-emerald-500" />
                </div>
                <CardTitle className="text-base">Aparência</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Personalize cores e identidade visual do seu painel.</p>
                <p className="text-xs text-muted-foreground/60 mt-2 italic">Em breve</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-purple-500" />
                </div>
                <CardTitle className="text-base">Avançado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Configurações avançadas e integrações.</p>
                <p className="text-xs text-muted-foreground/60 mt-2 italic">Em breve</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
