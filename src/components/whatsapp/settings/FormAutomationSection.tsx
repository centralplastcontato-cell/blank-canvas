import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, PartyPopper, UtensilsCrossed, Star, Clock, Save, Loader2, FileSignature } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface FormConfig {
  id?: string;
  form_type: string;
  is_enabled: boolean;
  send_days_before: number;
  send_hour: number;
  send_minute: number;
  message_template: string;
}

const FORM_TYPES = [
  {
    type: "prefesta",
    label: "Pré-festa",
    description: "Formulário enviado antes do evento para coletar informações do anfitrião",
    icon: PartyPopper,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
    defaultMessage: "Olá {{nome}}! 🎉\n\nSua festa está chegando! Para garantir que tudo saia perfeito, precisamos de algumas informações.\n\nPreencha o formulário abaixo:\n{{link}}",
    defaultDays: 7,
  },
  {
    type: "cardapio",
    label: "Cardápio",
    description: "Formulário para escolha do cardápio da festa",
    icon: UtensilsCrossed,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    defaultMessage: "Olá {{nome}}! 🍽️\n\nVamos definir o cardápio da sua festa? Acesse o link abaixo e escolha as opções:\n\n{{link}}",
    defaultDays: 10,
  },
  {
    type: "contrato",
    label: "Contrato",
    description: "Envio automático do contrato para assinatura digital",
    icon: FileSignature,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    defaultMessage: "Olá {{nome}}! 📄\n\nSeu contrato está pronto! Acesse o link abaixo para revisar e assinar digitalmente:\n\n{{link}}",
    defaultDays: 5,
  },
  {
    type: "avaliacao",
    label: "Pós-festa",
    description: "Formulário de avaliação enviado após o evento",
    icon: Star,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
    defaultMessage: "Olá {{nome}}! ⭐\n\nEsperamos que a festa tenha sido incrível! 🎊\n\nNos ajude a melhorar cada vez mais respondendo nossa avaliação:\n{{link}}",
    defaultDays: 1,
  },
];

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7h to 22h

export function FormAutomationSection() {
  const { currentCompanyId } = useCompany();
  const [configs, setConfigs] = useState<FormConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingType, setSavingType] = useState<string | null>(null);

  useEffect(() => {
    if (currentCompanyId) fetchConfigs();
  }, [currentCompanyId]);

  const fetchConfigs = async () => {
    if (!currentCompanyId) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from("form_automation_settings")
      .select("*")
      .eq("company_id", currentCompanyId);

    if (error) {
      console.error("Error fetching form configs:", error);
      setIsLoading(false);
      return;
    }

    // Merge with defaults for any missing types
    const merged = FORM_TYPES.map((ft) => {
      const existing = data?.find((d: any) => d.form_type === ft.type);
      if (existing) {
        return {
          id: existing.id,
          form_type: existing.form_type,
          is_enabled: existing.is_enabled,
          send_days_before: existing.send_days_before,
          send_hour: existing.send_hour,
          send_minute: existing.send_minute,
          message_template: existing.message_template || ft.defaultMessage,
        };
      }
      return {
        form_type: ft.type,
        is_enabled: false,
        send_days_before: ft.defaultDays,
        send_hour: 10,
        send_minute: 0,
        message_template: ft.defaultMessage,
      };
    });

    setConfigs(merged);
    setIsLoading(false);
  };

  const updateConfig = (type: string, field: keyof FormConfig, value: any) => {
    setConfigs((prev) =>
      prev.map((c) => (c.form_type === type ? { ...c, [field]: value } : c))
    );
  };

  const saveConfig = async (config: FormConfig) => {
    if (!currentCompanyId) return;
    setSavingType(config.form_type);

    const payload = {
      company_id: currentCompanyId,
      form_type: config.form_type,
      is_enabled: config.is_enabled,
      send_days_before: config.send_days_before,
      send_hour: config.send_hour,
      send_minute: config.send_minute,
      message_template: config.message_template,
    };

    let error;
    if (config.id) {
      ({ error } = await supabase
        .from("form_automation_settings")
        .update(payload)
        .eq("id", config.id));
    } else {
      const { data, error: insertError } = await supabase
        .from("form_automation_settings")
        .insert(payload)
        .select()
        .single();
      error = insertError;
      if (data) {
        setConfigs((prev) =>
          prev.map((c) =>
            c.form_type === config.form_type ? { ...c, id: (data as any).id } : c
          )
        );
      }
    }

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configuração salva!", description: `Formulário de ${FORM_TYPES.find((f) => f.type === config.form_type)?.label} atualizado.` });
    }
    setSavingType(null);
  };

  const toggleEnabled = async (config: FormConfig, checked: boolean) => {
    updateConfig(config.form_type, "is_enabled", checked);
    await saveConfig({ ...config, is_enabled: checked });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <ClipboardList className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-base">Envio Automático de Formulários</h3>
          <p className="text-sm text-muted-foreground">
            Configure quando e como os formulários serão enviados automaticamente para os anfitriões
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {configs.map((config) => {
          const ft = FORM_TYPES.find((f) => f.type === config.form_type)!;
          const Icon = ft.icon;

          return (
            <Card key={config.form_type} className={`border ${ft.borderColor} transition-all ${config.is_enabled ? "shadow-sm" : "opacity-75"}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${ft.bgColor}`}>
                      <Icon className={`w-5 h-5 ${ft.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {ft.label}
                        <Badge variant={config.is_enabled ? "default" : "secondary"} className="text-[10px]">
                          {config.is_enabled ? "Ativo" : "Inativo"}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {ft.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={config.is_enabled}
                    onCheckedChange={(checked) => toggleEnabled(config, checked)}
                  />
                </div>
              </CardHeader>

              {config.is_enabled && (
                <CardContent className="space-y-4 pt-0">
                  {/* Timing */}
                  <div className="rounded-lg bg-muted/50 p-4 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      Agendamento de envio
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          {config.form_type === "avaliacao" ? "Dias depois do evento" : "Dias antes do evento"}
                        </Label>
                        <Select
                          value={String(config.send_days_before)}
                          onValueChange={(v) => updateConfig(config.form_type, "send_days_before", parseInt(v))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 5, 7, 10, 14, 21, 30].map((d) => (
                              <SelectItem key={d} value={String(d)}>
                                {d} {d === 1 ? "dia" : "dias"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Hora</Label>
                        <Select
                          value={String(config.send_hour)}
                          onValueChange={(v) => updateConfig(config.form_type, "send_hour", parseInt(v))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {HOURS.map((h) => (
                              <SelectItem key={h} value={String(h)}>
                                {String(h).padStart(2, "0")}h
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Minuto</Label>
                        <Select
                          value={String(config.send_minute)}
                          onValueChange={(v) => updateConfig(config.form_type, "send_minute", parseInt(v))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 15, 30, 45].map((m) => (
                              <SelectItem key={m} value={String(m)}>
                                {String(m).padStart(2, "0")}min
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      📅 O formulário será enviado{" "}
                      <strong>
                        {config.send_days_before} {config.send_days_before === 1 ? "dia" : "dias"}{" "}
                        {config.form_type === "avaliacao" ? "depois" : "antes"}
                      </strong>{" "}
                      do evento às{" "}
                      <strong>
                        {String(config.send_hour).padStart(2, "0")}:{String(config.send_minute).padStart(2, "0")}
                      </strong>
                    </p>
                  </div>

                  {/* Message Template */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Mensagem de envio</Label>
                    <Textarea
                      value={config.message_template}
                      onChange={(e) => updateConfig(config.form_type, "message_template", e.target.value)}
                      className="min-h-[120px] text-sm"
                      placeholder="Digite a mensagem..."
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {["{{nome}}", "{{link}}", "{{data_evento}}", "{{empresa}}"].map((v) => (
                        <Badge key={v} variant="outline" className="text-[10px] font-mono cursor-default">
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => saveConfig(config)}
                      disabled={savingType === config.form_type}
                    >
                      {savingType === config.form_type ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Salvar
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
