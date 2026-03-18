import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, FileText, MessageSquare, Info, RotateCcw } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ContractMessageSettings {
  id?: string;
  company_id: string;
  is_enabled: boolean;
  message_template: string;
}

const DEFAULT_MESSAGE = `Olá {{nome}} 😊

Estamos finalizando o contrato da sua festa no {{empresa}} no dia {{data_festa}}.

Para seguirmos, preciso que você preencha seus dados pessoais no link abaixo:

{{link_formulario_contrato}}

Leva menos de 2 minutos! Qualquer dúvida, estamos por aqui. 🎉`;

const AVAILABLE_VARIABLES = [
  "{{nome}}",
  "{{primeiro_nome}}",
  "{{empresa}}",
  "{{buffet}}",
  "{{data_festa}}",
  "{{tipo_festa}}",
  "{{pacote}}",
  "{{link_formulario_contrato}}",
];

export function ContractMessageSection() {
  const { currentCompany } = useCompany();
  const [settings, setSettings] = useState<ContractMessageSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentCompany?.id) return;
    loadSettings();
  }, [currentCompany?.id]);

  const loadSettings = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("contract_message_settings")
      .select("*")
      .eq("company_id", currentCompany!.id)
      .maybeSingle();

    if (error) {
      console.error("Error loading contract message settings:", error);
    }

    if (data) {
      setSettings(data);
    } else {
      setSettings({
        company_id: currentCompany!.id,
        is_enabled: true,
        message_template: DEFAULT_MESSAGE,
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings || !currentCompany?.id) return;
    setSaving(true);

    const payload = {
      company_id: currentCompany.id,
      is_enabled: settings.is_enabled,
      message_template: settings.message_template,
    };

    let error;
    if (settings.id) {
      ({ error } = await (supabase as any)
        .from("contract_message_settings")
        .update(payload)
        .eq("id", settings.id));
    } else {
      const { data, error: insertError } = await (supabase as any)
        .from("contract_message_settings")
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

  const update = (key: keyof ContractMessageSettings, value: any) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const resetToDefault = () => {
    update("message_template", DEFAULT_MESSAGE);
    toast({ title: "Mensagem restaurada para o padrão" });
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

  // Simple preview: replace variables with example values
  const previewText = settings.message_template
    .replace(/\{\{nome\}\}/gi, "Maria Silva")
    .replace(/\{\{primeiro_nome\}\}/gi, "Maria")
    .replace(/\{\{empresa\}\}/gi, currentCompany?.name || "Buffet Exemplo")
    .replace(/\{\{buffet\}\}/gi, currentCompany?.name || "Buffet Exemplo")
    .replace(/\{\{data_festa\}\}/gi, "15/04/2026")
    .replace(/\{\{tipo_festa\}\}/gi, "Infantil")
    .replace(/\{\{pacote\}\}/gi, "Super Festa")
    .replace(/\{\{link_formulario_contrato\}\}/gi, "https://celebrei.app/dados-contratante/abc123");

  return (
    <TooltipProvider>
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Dados do Contratante</CardTitle>
                <CardDescription className="text-xs">
                  Mensagem enviada ao cliente para preenchimento dos dados do contrato
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
            {/* Message Template */}
            <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">Mensagem para o cliente</p>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Esta mensagem será enviada ao cliente quando você solicitar os dados do contratante. Use as variáveis abaixo para personalizar.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetToDefault}
                  className="text-xs gap-1.5 text-muted-foreground"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restaurar padrão
                </Button>
              </div>

              <Textarea
                value={settings.message_template}
                onChange={(e) => update("message_template", e.target.value)}
                rows={8}
                className="text-sm resize-none rounded-xl"
              />

              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_VARIABLES.map((v) => (
                  <Badge
                    key={v}
                    variant="outline"
                    className="text-[10px] cursor-pointer hover:bg-primary/10"
                    onClick={() =>
                      update(
                        "message_template",
                        settings.message_template + ` ${v}`
                      )
                    }
                  >
                    {v}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
              <p className="text-sm font-semibold text-muted-foreground">Pré-visualização</p>
              <div className="rounded-lg bg-muted/50 border border-border/30 p-4">
                <p className="text-sm whitespace-pre-line leading-relaxed">{previewText}</p>
              </div>
            </div>

            {/* Info */}
            <div className="rounded-xl bg-muted/30 border border-border/30 p-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Como funciona:</strong> Ao clicar em "Solicitar dados do contratante" no detalhe da festa, o sistema usa esta mensagem para compor o envio ao cliente. A variável{" "}
                <Badge variant="outline" className="text-[10px] mx-0.5">
                  {"{{link_formulario_contrato}}"}
                </Badge>{" "}
                será substituída automaticamente pelo link único do formulário.
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
