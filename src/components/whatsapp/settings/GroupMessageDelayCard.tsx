import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";

export const DEFAULT_GROUP_MESSAGE_DELAY = 60;

export function GroupMessageDelayCard() {
  const { currentCompanyId } = useCompany();
  const [delay, setDelay] = useState(DEFAULT_GROUP_MESSAGE_DELAY);
  const [initialDelay, setInitialDelay] = useState(DEFAULT_GROUP_MESSAGE_DELAY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentCompanyId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("companies")
        .select("settings")
        .eq("id", currentCompanyId)
        .single();

      const settings = data?.settings as Record<string, any> | null;
      const val =
        typeof settings?.group_message_delay_seconds === "number"
          ? settings.group_message_delay_seconds
          : DEFAULT_GROUP_MESSAGE_DELAY;
      setDelay(val);
      setInitialDelay(val);
      setLoading(false);
    })();
  }, [currentCompanyId]);

  const handleSave = async () => {
    if (!currentCompanyId) return;
    const clamped = Math.max(5, Math.min(120, delay));
    setSaving(true);

    // Fetch current settings to merge
    const { data: current } = await supabase
      .from("companies")
      .select("settings")
      .eq("id", currentCompanyId)
      .single();

    const currentSettings = (current?.settings as Record<string, any>) || {};

    const { error } = await supabase
      .from("companies")
      .update({
        settings: { ...currentSettings, group_message_delay_seconds: clamped },
      })
      .eq("id", currentCompanyId);

    setSaving(false);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      setDelay(clamped);
      setInitialDelay(clamped);
      toast({ title: "Intervalo salvo!", description: `${clamped} segundos entre mensagens.` });
    }
  };

  const isDirty = delay !== initialDelay;

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="w-4 h-4 text-primary" />
          Intervalo de Segurança
        </CardTitle>
        <CardDescription>
          Tempo de espera entre cada mensagem enviada para grupos de WhatsApp. Um intervalo maior reduz o risco de bloqueio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="delay-input" className="text-sm">
            Intervalo (segundos)
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="delay-input"
              type="number"
              min={5}
              max={120}
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
              className="w-28"
            />
            <span className="text-sm text-muted-foreground">
              {delay >= 60 ? `${Math.floor(delay / 60)}min ${delay % 60 ? `${delay % 60}s` : ""}` : `${delay}s`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Mínimo: 5s · Máximo: 120s · Recomendado: 60s. Uma variação aleatória de +0 a +2s é adicionada automaticamente.
          </p>
        </div>

        {isDirty && (
          <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
