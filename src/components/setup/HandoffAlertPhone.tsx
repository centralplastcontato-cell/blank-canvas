import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

const digits = (v: string) => v.replace(/\D/g, "");

/**
 * WhatsApp que recebe o alerta "cliente sem resposta" (opcional). O alerta sai do
 * próprio número do buffet, só no horário de atendimento e só se ninguém
 * responder em X minutos (follow-up-check → ai_agent_settings.handoff_alert_phone).
 */
export function HandoffAlertPhone({ companyId }: { companyId: string }) {
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(false);
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("ai_agent_settings").select("*").eq("company_id", companyId).maybeSingle()
      .then(({ data }: { data: Record<string, unknown> | null }) => {
        if (cancelled) return;
        const p = String(data?.handoff_alert_phone || "");
        setExists(!!data);
        setPhone(p);
        setSaved(p);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [companyId]);

  const save = async (value: string) => {
    const d = digits(value);
    if (d && (d.length < 10 || d.length > 13)) {
      toast({ title: "Confira o número", description: "Escreva com DDD, por exemplo (15) 99999-0000.", variant: "destructive" });
      return;
    }
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("ai_agent_settings").update({ handoff_alert_phone: d || null }).eq("company_id", companyId);
    setSaving(false);
    if (error) {
      toast({ title: "Não consegui salvar", description: error.message, variant: "destructive" });
      return;
    }
    setPhone(d);
    setSaved(d);
    toast({ title: d ? "Alerta por WhatsApp ligado" : "Alerta por WhatsApp desligado" });
  };

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (!exists) return <p className="text-xs text-muted-foreground">Responda as perguntas da IA antes de configurar o alerta.</p>;

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Quando a IA passa um cliente para a equipe e ninguém responde em 10 minutos (no horário de atendimento), mandamos um
        WhatsApp de alerta para este número. Pode ser o celular da atendente. Em branco, o aviso aparece só na plataforma.
      </p>
      <div className="flex gap-2">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="(15) 99999-0000 (opcional)"
          aria-label="WhatsApp do alerta" className="text-base" />
        <Button type="button" onClick={() => save(phone)} disabled={saving || digits(phone) === digits(saved)}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
        </Button>
      </div>
      {saved && (
        <button type="button" className="text-xs text-muted-foreground underline hover:text-foreground" onClick={() => save("")}>
          Não quero alerta por WhatsApp
        </button>
      )}
    </div>
  );
}
