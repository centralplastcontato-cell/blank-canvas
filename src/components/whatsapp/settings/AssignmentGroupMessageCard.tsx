import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Loader2, Save, RotateCcw, UserCheck } from "lucide-react";

export const DEFAULT_ASSIGNMENT_GROUP_MESSAGE = `✅ *{titulo} — Escala Definida*

{lista_escalados}

🗓️ Período: {periodo}

{observacoes}`;

const VARIABLES = ["{titulo}", "{periodo}", "{lista_escalados}", "{observacoes}"];

export function AssignmentGroupMessageCard() {
  const { currentCompanyId } = useCompany();
  const [message, setMessage] = useState(DEFAULT_ASSIGNMENT_GROUP_MESSAGE);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentCompanyId) return;
    loadMessage();
  }, [currentCompanyId]);

  const loadMessage = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("companies")
      .select("settings")
      .eq("id", currentCompanyId!)
      .single();

    const settings = data?.settings as Record<string, any> | null;
    if (settings?.freelancer_assignment_group_message && typeof settings.freelancer_assignment_group_message === "string") {
      setMessage(settings.freelancer_assignment_group_message);
    } else {
      setMessage(DEFAULT_ASSIGNMENT_GROUP_MESSAGE);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!currentCompanyId) return;
    setIsSaving(true);

    const { data: current } = await supabase
      .from("companies")
      .select("settings")
      .eq("id", currentCompanyId)
      .single();

    const existingSettings = (current?.settings as Record<string, any>) || {};

    const { error } = await supabase
      .from("companies")
      .update({
        settings: { ...existingSettings, freelancer_assignment_group_message: message },
      })
      .eq("id", currentCompanyId);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Mensagem salva!", description: "O template de escalados para grupos foi atualizado." });
    }
    setIsSaving(false);
  };

  const handleReset = () => {
    setMessage(DEFAULT_ASSIGNMENT_GROUP_MESSAGE);
    toast({ title: "Mensagem restaurada", description: "Salve para aplicar a mensagem padrão." });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="w-5 h-5" />
          Mensagem de Escalados para Grupos
        </CardTitle>
        <CardDescription>
          Template enviado ao compartilhar a lista de freelancers escalados em grupos de WhatsApp. A variável <code>{"{lista_escalados}"}</code> é montada automaticamente.
          <span className="flex flex-wrap gap-1.5 mt-2">
            {VARIABLES.map(v => (
              <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
            ))}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={8}
          className="text-sm resize-none"
          placeholder="Template da mensagem..."
        />

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Mensagem
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
