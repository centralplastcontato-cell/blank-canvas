import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, CalendarClock } from "lucide-react";

export function PreReservationAutomationSection() {
  const { currentCompanyId } = useCompany();
  const [isEnabled, setIsEnabled] = useState(false);
  const [sendOnLastDay, setSendOnLastDay] = useState(true);
  const [hoursBeforeExpiry, setHoursBeforeExpiry] = useState("10");
  const [expiryMessage, setExpiryMessage] = useState(
    "Olá {{nome}}, sua pré-reserva para o dia {{data_festa}} vence hoje ({{data_validade}}). Gostaria de confirmar sua reserva? Estamos à disposição! 🎉"
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    if (currentCompanyId) fetchSettings();
  }, [currentCompanyId]);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("pre_reservation_settings")
      .select("*")
      .eq("company_id", currentCompanyId)
      .maybeSingle();

    if (data) {
      setSettingsId(data.id);
      setIsEnabled(data.is_enabled);
      setSendOnLastDay(data.send_on_last_day);
      setHoursBeforeExpiry(String(data.hours_before_expiry));
      setExpiryMessage(data.expiry_message || "");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!currentCompanyId) return;
    setSaving(true);

    const payload = {
      company_id: currentCompanyId,
      is_enabled: isEnabled,
      send_on_last_day: sendOnLastDay,
      hours_before_expiry: parseInt(hoursBeforeExpiry),
      expiry_message: expiryMessage,
    };

    let error;
    if (settingsId) {
      ({ error } = await (supabase as any).from("pre_reservation_settings").update(payload).eq("id", settingsId));
    } else {
      const res = await (supabase as any).from("pre_reservation_settings").insert(payload).select("id").single();
      error = res.error;
      if (res.data) setSettingsId(res.data.id);
    }

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configurações salvas!" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-pink-100">
            <CalendarClock className="h-5 w-5 text-pink-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Automação de Pré-reserva</CardTitle>
            <CardDescription>
              Configure mensagens automáticas de vencimento de pré-reservas.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Ativar automação</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Envia mensagem ao cliente quando a pré-reserva estiver vencendo
            </p>
          </div>
          <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
        </div>

        {isEnabled && (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Enviar no último dia</Label>
                  <p className="text-xs text-muted-foreground">Envia no dia do vencimento</p>
                </div>
                <Switch checked={sendOnLastDay} onCheckedChange={setSendOnLastDay} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Horas antes do vencimento</Label>
                <Select value={hoursBeforeExpiry} onValueChange={setHoursBeforeExpiry}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[6, 8, 10, 12, 18, 24].map(h => (
                      <SelectItem key={h} value={String(h)}>{h} horas antes</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Mensagem de vencimento</Label>
              <Textarea
                value={expiryMessage}
                onChange={(e) => setExpiryMessage(e.target.value)}
                rows={5}
                className="text-sm"
                placeholder="Digite a mensagem..."
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant="outline" className="text-[10px] font-mono cursor-help" title="Nome do cliente">{"{{nome}}"}</Badge>
                <Badge variant="outline" className="text-[10px] font-mono cursor-help" title="Data da festa">{"{{data_festa}}"}</Badge>
                <Badge variant="outline" className="text-[10px] font-mono cursor-help" title="Data de validade">{"{{data_validade}}"}</Badge>
                <Badge variant="outline" className="text-[10px] font-mono cursor-help" title="Unidade">{"{{unidade}}"}</Badge>
              </div>
            </div>
          </>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
}
