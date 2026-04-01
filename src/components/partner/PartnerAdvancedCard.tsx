import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Settings, Check, Loader2, Pencil, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

interface AdvancedSettings {
  contact_phone: string;
  contact_email: string;
  delivery_notes: string;
  auto_accept_orders: boolean;
}

const DEFAULTS: AdvancedSettings = {
  contact_phone: "",
  contact_email: "",
  delivery_notes: "",
  auto_accept_orders: false,
};

export function PartnerAdvancedCard() {
  const { currentCompany, refreshCompanies } = useCompany();
  const [isEditing, setIsEditing] = useState(false);
  const [settings, setSettings] = useState<AdvancedSettings>(DEFAULTS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentCompany?.settings) {
      const s = currentCompany.settings as Record<string, unknown>;
      const adv = s.partner_advanced as AdvancedSettings | undefined;
      if (adv) setSettings({ ...DEFAULTS, ...adv });
    }
  }, [currentCompany]);

  const handleSave = async () => {
    if (!currentCompany) return;
    setIsSaving(true);
    try {
      const currentSettings = (currentCompany.settings || {}) as Record<string, unknown>;
      const { error } = await supabase
        .from("companies")
        .update({ settings: { ...currentSettings, partner_advanced: settings as unknown as Record<string, unknown> } as unknown as Record<string, unknown> })
        .eq("id", currentCompany.id);
      if (error) throw error;
      await refreshCompanies();
      setIsEditing(false);
      toast.success("Configurações salvas!");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (currentCompany?.settings) {
      const s = currentCompany.settings as Record<string, unknown>;
      const adv = s.partner_advanced as AdvancedSettings | undefined;
      setSettings(adv ? { ...DEFAULTS, ...adv } : DEFAULTS);
    }
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Settings className="h-5 w-5 text-purple-500" />
          </div>
          <CardTitle className="text-base">Avançado</CardTitle>
        </div>
        {!isEditing && (
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contact Phone */}
        <div>
          <Label className="text-xs text-muted-foreground">Telefone de Contato</Label>
          {isEditing ? (
            <Input
              value={settings.contact_phone}
              onChange={(e) => setSettings((s) => ({ ...s, contact_phone: e.target.value }))}
              placeholder="(11) 99999-9999"
              className="mt-1"
            />
          ) : (
            <p className="text-sm mt-1">{settings.contact_phone || "—"}</p>
          )}
        </div>

        {/* Contact Email */}
        <div>
          <Label className="text-xs text-muted-foreground">E-mail de Contato</Label>
          {isEditing ? (
            <Input
              type="email"
              value={settings.contact_email}
              onChange={(e) => setSettings((s) => ({ ...s, contact_email: e.target.value }))}
              placeholder="contato@empresa.com"
              className="mt-1"
            />
          ) : (
            <p className="text-sm mt-1">{settings.contact_email || "—"}</p>
          )}
        </div>

        {/* Delivery Notes */}
        <div>
          <Label className="text-xs text-muted-foreground">Observações de Entrega</Label>
          {isEditing ? (
            <Textarea
              value={settings.delivery_notes}
              onChange={(e) => setSettings((s) => ({ ...s, delivery_notes: e.target.value }))}
              placeholder="Horários, restrições, instruções..."
              className="mt-1"
              rows={3}
            />
          ) : (
            <p className="text-sm mt-1 whitespace-pre-wrap">{settings.delivery_notes || "—"}</p>
          )}
        </div>

        {/* Auto Accept */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label className="text-sm font-medium">Aceitar Pedidos Automaticamente</Label>
            <p className="text-xs text-muted-foreground">Novos pedidos serão confirmados automaticamente</p>
          </div>
          <Switch
            checked={settings.auto_accept_orders}
            onCheckedChange={(v) => {
              setSettings((s) => ({ ...s, auto_accept_orders: v }));
              if (!isEditing) setIsEditing(true);
            }}
            disabled={isSaving}
          />
        </div>

        {isEditing && (
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Salvar
            </Button>
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
