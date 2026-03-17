import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, MapPin, Clock, MessageSquare, Bell, Info } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VisitConfirmationSettings {
  id?: string;
  company_id: string;
  is_enabled: boolean;
  hours_before_visit: number;
  confirmation_message: string;
  second_message_enabled: boolean;
  second_message_hours_after: number;
  second_message_text: string;
  send_window_start: number;
  send_window_end: number;
  reply_confirmed_message: string;
  reply_reschedule_message: string;
}

const DEFAULT_SETTINGS: Omit<VisitConfirmationSettings, "company_id"> = {
  is_enabled: false,
  hours_before_visit: 24,
  confirmation_message: `Olá {{nome}} 😊

Passando para confirmar sua visita ao {{nome_buffet}} no dia {{data_visita}} às {{hora_visita}}.

Pode me responder com:

1️⃣ Confirmo
2️⃣ Preciso remarcar`,
  second_message_enabled: false,
  second_message_hours_after: 6,
  second_message_text: `Olá {{nome}} 😊

Só passando para lembrar da sua visita hoje às {{hora_visita}} no {{nome_buffet}}.

Estamos te aguardando! 🎉`,
  send_window_start: 8,
  send_window_end: 22,
  reply_confirmed_message: `Ótimo, sua visita está *confirmada*! ✅

Estamos te esperando! Qualquer dúvida, é só chamar aqui. 😊`,
  reply_reschedule_message: `Entendido! 📝

Nossa equipe vai entrar em contato para remarcar sua visita. Aguarde! 😊`,
};

const HOURS_OPTIONS = [
  { value: 3, label: "3 horas antes" },
  { value: 6, label: "6 horas antes" },
  { value: 12, label: "12 horas antes" },
  { value: 24, label: "24 horas antes" },
  { value: 48, label: "48 horas antes" },
];

const SECOND_MSG_OPTIONS = [
  { value: 2, label: "2 horas depois" },
  { value: 4, label: "4 horas depois" },
  { value: 6, label: "6 horas depois" },
  { value: 8, label: "8 horas depois" },
  { value: 12, label: "12 horas depois" },
];

export function VisitConfirmationSection() {
  const { currentCompany } = useCompany();
  const [settings, setSettings] = useState<VisitConfirmationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentCompany?.id) return;
    loadSettings();
  }, [currentCompany?.id]);

  const loadSettings = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("visit_confirmation_settings")
      .select("*")
      .eq("company_id", currentCompany!.id)
      .maybeSingle();

    if (error) {
      console.error("Error loading visit confirmation settings:", error);
    }

    if (data) {
      setSettings(data);
    } else {
      setSettings({ ...DEFAULT_SETTINGS, company_id: currentCompany!.id });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings || !currentCompany?.id) return;
    setSaving(true);

    const payload = {
      company_id: currentCompany.id,
      is_enabled: settings.is_enabled,
      hours_before_visit: settings.hours_before_visit,
      confirmation_message: settings.confirmation_message,
      second_message_enabled: settings.second_message_enabled,
      second_message_hours_after: settings.second_message_hours_after,
      second_message_text: settings.second_message_text,
      send_window_start: settings.send_window_start,
      send_window_end: settings.send_window_end,
      reply_confirmed_message: settings.reply_confirmed_message,
      reply_reschedule_message: settings.reply_reschedule_message,
    };

    let error;
    if (settings.id) {
      ({ error } = await (supabase as any)
        .from("visit_confirmation_settings")
        .update(payload)
        .eq("id", settings.id));
    } else {
      const { data, error: insertError } = await (supabase as any)
        .from("visit_confirmation_settings")
        .insert(payload)
        .select()
        .single();
      error = insertError;
      if (data) setSettings(data);
    }

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configurações salvas!" });
    }
    setSaving(false);
  };

  const update = (key: keyof VisitConfirmationSettings, value: any) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) return null;

  return (
    <TooltipProvider>
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Confirmação de Visitas</CardTitle>
                <CardDescription className="text-xs">
                  Envie confirmações automáticas antes das visitas agendadas
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.is_enabled}
              onCheckedChange={(v) => update("is_enabled", v)}
            />
          </div>
        </CardHeader>

        {settings.is_enabled && (
          <CardContent className="space-y-6">
            {/* Timing */}
            <div className="rounded-xl border border-border/40 bg-card p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Tempo de envio</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Enviar confirmação antes da visita
                </Label>
                <Select
                  value={String(settings.hours_before_visit)}
                  onValueChange={(v) => update("hours_before_visit", parseInt(v))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={String(o.value)}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Horário início</Label>
                  <Select
                    value={String(settings.send_window_start)}
                    onValueChange={(v) => update("send_window_start", parseInt(v))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {String(i).padStart(2, "0")}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Horário fim</Label>
                  <Select
                    value={String(settings.send_window_end)}
                    onValueChange={(v) => update("send_window_end", parseInt(v))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {String(i).padStart(2, "0")}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Confirmation Message */}
            <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Mensagem de confirmação</p>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Variáveis disponíveis: {"{{nome}}"}, {"{{data_visita}}"},{" "}
                      {"{{hora_visita}}"}, {"{{nome_buffet}}"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <Textarea
                value={settings.confirmation_message}
                onChange={(e) => update("confirmation_message", e.target.value)}
                rows={8}
                className="text-sm resize-none rounded-xl"
              />

              <div className="flex flex-wrap gap-1.5">
                {["{{nome}}", "{{data_visita}}", "{{hora_visita}}", "{{nome_buffet}}"].map(
                  (v) => (
                    <Badge
                      key={v}
                      variant="outline"
                      className="text-[10px] cursor-pointer hover:bg-primary/10"
                      onClick={() =>
                        update(
                          "confirmation_message",
                          settings.confirmation_message + ` ${v}`
                        )
                      }
                    >
                      {v}
                    </Badge>
                  )
                )}
              </div>
            </div>

            {/* Second Message */}
            <div className="rounded-xl border border-border/40 bg-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">Segunda mensagem (lembrete)</p>
                </div>
                <Switch
                  checked={settings.second_message_enabled}
                  onCheckedChange={(v) => update("second_message_enabled", v)}
                />
              </div>

              {settings.second_message_enabled && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Enviar se não houver resposta após
                    </Label>
                    <Select
                      value={String(settings.second_message_hours_after)}
                      onValueChange={(v) =>
                        update("second_message_hours_after", parseInt(v))
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SECOND_MSG_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={String(o.value)}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Textarea
                    value={settings.second_message_text}
                    onChange={(e) => update("second_message_text", e.target.value)}
                    rows={6}
                    className="text-sm resize-none rounded-xl"
                  />
                </>
              )}
            </div>

            {/* Reply Messages */}
            <div className="rounded-xl border border-border/40 bg-card p-4 space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Respostas automáticas</p>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Mensagens enviadas ao lead após ele confirmar ou solicitar remarcação.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Quando o lead <strong>confirma</strong> a visita
                </Label>
                <Textarea
                  value={settings.reply_confirmed_message}
                  onChange={(e) => update("reply_confirmed_message", e.target.value)}
                  rows={4}
                  className="text-sm resize-none rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Quando o lead pede para <strong>remarcar</strong>
                </Label>
                <Textarea
                  value={settings.reply_reschedule_message}
                  onChange={(e) => update("reply_reschedule_message", e.target.value)}
                  rows={4}
                  className="text-sm resize-none rounded-xl"
                />
              </div>
            </div>

            {/* Info */}
            <div className="rounded-xl bg-muted/30 border border-border/30 p-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Como funciona:</strong> Quando o cliente responde{" "}
                <Badge variant="outline" className="text-[10px] mx-0.5">
                  1
                </Badge>{" "}
                ou "confirmo", a visita é marcada como <strong>Confirmada</strong>. Se
                responder{" "}
                <Badge variant="outline" className="text-[10px] mx-0.5">
                  2
                </Badge>{" "}
                ou "remarcar", é marcada como <strong>Remarcada</strong> e a equipe é
                notificada. Visitas canceladas, já confirmadas ou com "não compareceu" são
                ignoradas.
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Save className="h-4 w-4 mr-2" />
              Salvar configurações
            </Button>
          </CardContent>
        )}
      </Card>
    </TooltipProvider>
  );
}
