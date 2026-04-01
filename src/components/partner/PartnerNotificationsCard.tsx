import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

interface NotificationSettings {
  new_orders: boolean;
  order_status_change: boolean;
  daily_summary: boolean;
}

const DEFAULTS: NotificationSettings = {
  new_orders: true,
  order_status_change: true,
  daily_summary: false,
};

export function PartnerNotificationsCard() {
  const { currentCompany, refreshCompanies } = useCompany();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULTS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentCompany?.settings) {
      const s = currentCompany.settings as Record<string, unknown>;
      const notif = s.partner_notifications as NotificationSettings | undefined;
      if (notif) setSettings({ ...DEFAULTS, ...notif });
    }
  }, [currentCompany]);

  const handleToggle = async (key: keyof NotificationSettings) => {
    if (!currentCompany) return;
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    setIsSaving(true);
    try {
      const currentSettings = (currentCompany.settings || {}) as Record<string, unknown>;
      const newSettings = JSON.parse(JSON.stringify({ ...currentSettings, partner_notifications: updated }));
      const { error } = await supabase
        .from("companies")
        .update({ settings: newSettings })
        .eq("id", currentCompany.id);
      if (error) throw error;
      await refreshCompanies();
      toast.success("Notificação atualizada!");
    } catch {
      setSettings(settings);
      toast.error("Erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  const options: { key: keyof NotificationSettings; label: string; desc: string }[] = [
    { key: "new_orders", label: "Novos Pedidos", desc: "Receba alertas quando um novo pedido for criado" },
    { key: "order_status_change", label: "Mudança de Status", desc: "Alerta quando um pedido mudar de status" },
    { key: "daily_summary", label: "Resumo Diário", desc: "Receba um resumo diário dos pedidos" },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
          <Bell className="h-5 w-5 text-orange-500" />
        </div>
        <CardTitle className="text-base">Notificações</CardTitle>
        {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />}
      </CardHeader>
      <CardContent className="space-y-4">
        {options.map((opt) => (
          <div key={opt.key} className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <Label className="text-sm font-medium">{opt.label}</Label>
              <p className="text-xs text-muted-foreground">{opt.desc}</p>
            </div>
            <Switch
              checked={settings[opt.key]}
              onCheckedChange={() => handleToggle(opt.key)}
              disabled={isSaving}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
