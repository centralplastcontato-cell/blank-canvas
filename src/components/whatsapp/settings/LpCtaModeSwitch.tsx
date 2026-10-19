import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

type Hero = Record<string, unknown> & { cta_mode?: string };

/**
 * Site feito sob medida (ex.: Planeta Divertido): liga/desliga as perguntas da
 * LP. Desligado (hero.cta_mode = "whatsapp"), todos os botões abrem o WhatsApp
 * do buffet direto e o botão da hero vira "Chamar no WhatsApp". As perguntas
 * continuam salvas: é só ligar de novo. Só a equipe Celebrei vê.
 */
export function LpCtaModeSwitch({ companyId }: { companyId: string }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [hero, setHero] = useState<Hero | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: admin } = await supabase.rpc("is_admin", { _user_id: user.id });
      if (cancelled || admin !== true) return;
      setIsAdmin(true);
      const { data } = await supabase.from("company_landing_pages").select("hero").eq("company_id", companyId).maybeSingle();
      if (!cancelled) setHero((data?.hero as Hero) || null);
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  if (!isAdmin || !hero) return null;
  const withQuestions = hero.cta_mode !== "whatsapp";

  const toggle = async (on: boolean) => {
    const next = { ...hero, cta_mode: on ? "chatbot" : "whatsapp" };
    setSaving(true);
    const { error } = await supabase.from("company_landing_pages").update({ hero: next as never }).eq("company_id", companyId);
    setSaving(false);
    if (error) {
      toast({ title: "Não consegui salvar", description: error.message, variant: "destructive" });
      return;
    }
    setHero(next);
    toast({ title: on ? "Perguntas ligadas no site" : "Botões do site vão direto para o WhatsApp" });
  };

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-dashed p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">Perguntas antes do WhatsApp <span className="text-xs font-normal text-muted-foreground">(só a equipe Celebrei vê)</span></p>
        <p className="text-xs text-muted-foreground">
          Ligado: o cliente responde as perguntas no site (mês, convidados…). Desligado: todos os botões abrem o WhatsApp
          do buffet na hora e o botão principal vira "Chamar no WhatsApp". As perguntas ficam guardadas para ligar de novo.
        </p>
      </div>
      <Switch checked={withQuestions} disabled={saving} onCheckedChange={toggle} aria-label="Perguntas antes do WhatsApp" />
    </div>
  );
}
