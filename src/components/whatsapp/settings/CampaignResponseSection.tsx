import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Save, Loader2, MessageSquareReply, Calendar, Headset, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";

type ActionType = "create_visit" | "pause_bot_notify" | "schedule_followup";

interface Settings {
  id?: string;
  is_enabled: boolean;
  main_message: string;
  option_1_label: string;
  option_2_label: string;
  option_3_label: string;
  option_1_action: ActionType;
  option_2_action: ActionType;
  option_3_action: ActionType;
  followup_days: number;
}

const ACTION_OPTIONS: { value: ActionType; label: string; description: string }[] = [
  { value: "create_visit", label: "📅 Criar visita / agendar", description: "Aciona o fluxo de agendamento de visita" },
  { value: "pause_bot_notify", label: "🙋 Pausar bot e notificar atendente", description: "Pausa o bot e avisa um atendente humano" },
  { value: "schedule_followup", label: "⏰ Agendar follow-up automático", description: "Programa um lembrete para retomar o contato" },
];

const DEFAULTS: Settings = {
  is_enabled: true,
  main_message: "Olá {{nome}}! 😊 Que bom ter sua atenção! Como podemos te ajudar agora? Escolha uma das opções abaixo:",
  option_1_label: "Agendar uma visita",
  option_2_label: "Falar com atendente",
  option_3_label: "Analisar com calma",
  option_1_action: "create_visit",
  option_2_action: "pause_bot_notify",
  option_3_action: "schedule_followup",
  followup_days: 7,
};

export function CampaignResponseSection() {
  const { currentCompany } = useCompany();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentCompany?.id) return;
    setLoading(true);
    supabase
      .from("campaign_response_settings")
      .select("*")
      .eq("company_id", currentCompany.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSettings({
            id: data.id,
            is_enabled: data.is_enabled,
            main_message: data.main_message,
            option_1_label: data.option_1_label,
            option_2_label: data.option_2_label,
            option_3_label: data.option_3_label,
            option_1_action: data.option_1_action as ActionType,
            option_2_action: data.option_2_action as ActionType,
            option_3_action: data.option_3_action as ActionType,
            followup_days: data.followup_days,
          });
        }
        setLoading(false);
      });
  }, [currentCompany?.id]);

  const handleSave = async () => {
    if (!currentCompany?.id) return;
    setSaving(true);
    const payload = {
      company_id: currentCompany.id,
      is_enabled: settings.is_enabled,
      main_message: settings.main_message,
      option_1_label: settings.option_1_label,
      option_2_label: settings.option_2_label,
      option_3_label: settings.option_3_label,
      option_1_action: settings.option_1_action,
      option_2_action: settings.option_2_action,
      option_3_action: settings.option_3_action,
      followup_days: settings.followup_days,
    };
    const { error } = await supabase
      .from("campaign_response_settings")
      .upsert(payload, { onConflict: "company_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configurações salvas", description: "Resposta automática de campanhas atualizada." });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const renderOption = (
    idx: 1 | 2 | 3,
    Icon: typeof Calendar,
  ) => {
    const labelKey = `option_${idx}_label` as const;
    const actionKey = `option_${idx}_action` as const;
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
            {idx}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Icon className="w-3.5 h-3.5" />
            <span>Opção {idx}</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Texto exibido ao lead</Label>
          <Input
            value={settings[labelKey]}
            onChange={(e) => setSettings({ ...settings, [labelKey]: e.target.value })}
            placeholder="Ex: Agendar uma visita"
            maxLength={60}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Ação ao receber esta resposta</Label>
          <Select
            value={settings[actionKey]}
            onValueChange={(v: ActionType) => setSettings({ ...settings, [actionKey]: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Megaphone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Resposta Automática de Campanhas
                  {settings.is_enabled ? (
                    <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Ativo</Badge>
                  ) : (
                    <Badge variant="secondary">Desativado</Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  Quando o lead responder a uma campanha, o bot envia uma mensagem com 3 opções de ação.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.is_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, is_enabled: v })}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MessageSquareReply className="w-4 h-4" />
              Mensagem principal
            </Label>
            <Textarea
              value={settings.main_message}
              onChange={(e) => setSettings({ ...settings, main_message: e.target.value })}
              rows={4}
              placeholder="Mensagem enviada após o lead responder à campanha"
            />
            <p className="text-xs text-muted-foreground">
              Use <code className="bg-muted px-1 rounded">{"{{nome}}"}</code> para inserir o nome do lead.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {renderOption(1, Calendar)}
            {renderOption(2, Headset)}
            {renderOption(3, Clock)}
          </div>

          <div className="space-y-2 max-w-xs">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Dias para follow-up automático
            </Label>
            <Input
              type="number"
              min={1}
              max={60}
              value={settings.followup_days}
              onChange={(e) => setSettings({ ...settings, followup_days: parseInt(e.target.value) || 7 })}
            />
            <p className="text-xs text-muted-foreground">
              Usado quando a ação é "Agendar follow-up automático".
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
