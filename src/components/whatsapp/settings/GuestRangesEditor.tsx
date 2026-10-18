import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Save, X } from "lucide-react";
import { upcomingMonthOptions } from "@/lib/partyDate";

const DEFAULT_GUEST_OPTIONS = ["Até 50 pessoas", "51 a 70 pessoas", "71 a 100 pessoas", "101 a 150 pessoas", "Mais de 150 pessoas"];

/**
 * Faixas de convidados das perguntas do site (as mesmas de Automações → Bot LP).
 * Se ainda não há configuração, cria com os meses no formato do Castelo.
 */
export function GuestRangesEditor({ companyId }: { companyId: string }) {
  const [options, setOptions] = useState<string[]>(DEFAULT_GUEST_OPTIONS);
  const [rowId, setRowId] = useState<string | null>(null);
  const [newOption, setNewOption] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.from("lp_bot_settings").select("id, guest_options").eq("company_id", companyId).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setRowId(data.id);
          const saved = data.guest_options as string[] | null;
          if (Array.isArray(saved) && saved.length) setOptions(saved);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [companyId]);

  const change = (next: string[]) => { setOptions(next); setDirty(true); };

  const add = () => {
    const v = newOption.trim();
    if (!v || options.includes(v)) return;
    change([...options, v]);
    setNewOption("");
  };

  const save = async () => {
    if (!options.length) {
      toast({ title: "Deixe pelo menos uma faixa", variant: "destructive" });
      return;
    }
    setSaving(true);
    // A chave das perguntas pode ter acabado de criar a configuração
    let id = rowId;
    if (!id) {
      const { data } = await supabase.from("lp_bot_settings").select("id").eq("company_id", companyId).maybeSingle();
      id = data?.id ?? null;
      if (id) setRowId(id);
    }
    const { error } = id
      ? await supabase.from("lp_bot_settings").update({ guest_options: options }).eq("id", id)
      : await supabase.from("lp_bot_settings").insert({
          company_id: companyId, guest_options: options, month_options: upcomingMonthOptions(), auto_rotate_months: true,
        });
    setSaving(false);
    if (error) {
      toast({ title: "Não consegui salvar as faixas", description: error.message, variant: "destructive" });
      return;
    }
    setDirty(false);
    toast({ title: "Faixas de convidados salvas" });
  };

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">Faixas de convidados</p>
        <p className="text-xs text-muted-foreground">As opções que o cliente toca em "Para quantas pessoas será a festa?". Use as faixas dos seus pacotes.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt, i) => (
          <span key={opt} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-sm">
            {opt}
            <button type="button" onClick={() => change(options.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive" aria-label={`Tirar ${opt}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={newOption} onChange={(e) => setNewOption(e.target.value)} placeholder="Ex: 80 a 120 pessoas" maxLength={40}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <Button type="button" variant="outline" size="icon" onClick={add} aria-label="Adicionar faixa"><Plus className="h-4 w-4" /></Button>
      </div>
      <Button type="button" size="sm" onClick={save} disabled={saving || !dirty}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar faixas
      </Button>
    </div>
  );
}
