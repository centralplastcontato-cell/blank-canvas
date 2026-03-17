import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentCompanyId } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CalendarIcon, Loader2, ThumbsUp, Meh, ThumbsDown, Package, Check, Flame,
  MessageSquare, PenLine, AlertTriangle, Send, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const INTEREST_LEVELS = [
  { value: "alto", label: "Alto", description: "Quase fechando", icon: Flame, color: "text-orange-600 bg-orange-500/10 border-orange-300 hover:bg-orange-500/20" },
  { value: "medio", label: "Médio", description: "Avaliando opções", icon: Meh, color: "text-amber-600 bg-amber-500/10 border-amber-300 hover:bg-amber-500/20" },
  { value: "baixo", label: "Baixo", description: "Apenas pesquisando", icon: ThumbsDown, color: "text-muted-foreground bg-muted/50 border-border hover:bg-muted" },
];

const PAYMENT_OPTIONS = [
  { value: "a_vista", label: "À vista" },
  { value: "parcelado_cartao", label: "Parcelado no cartão" },
  { value: "pix", label: "Pix" },
  { value: "boleto", label: "Boleto" },
  { value: "nao_sabe", label: "Ainda não sabe" },
];

const RESTRICTION_OPTIONS = [
  { value: "preco", label: "Preço" },
  { value: "data", label: "Data" },
  { value: "localizacao", label: "Localização" },
  { value: "outro", label: "Outro" },
];

const CHANNEL_OPTIONS = [
  { value: "instagram_ads", label: "Anúncio Instagram" },
  { value: "site", label: "Site" },
  { value: "facebook", label: "Facebook" },
  { value: "indicacao", label: "Indicação" },
  { value: "ja_esteve_festa", label: "Já esteve em uma festa" },
  { value: "outro", label: "Outro" },
];

export interface VisitQualificationData {
  package_interest: string | null;
  guest_count: number | null;
  party_date_interest: string | null;
  payment_preference: string | null;
  interest_level: string | null;
  restrictions: string[];
  restriction_notes: string;
  client_questions: string | null;
  seller_notes: string | null;
  lead_channel: string | null;
}

interface VisitQualificationProps {
  visitId: string;
  initialData: VisitQualificationData;
  onSaved?: () => void;
}

const SectionHeader = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <div className="flex items-center gap-2.5 text-[11px] uppercase tracking-[0.18em] font-semibold text-muted-foreground mb-4 pb-2.5 border-b border-border/40">
    <div className="p-1.5 rounded-md bg-primary/8 ring-1 ring-primary/15">
      <Icon className="h-3.5 w-3.5 text-primary" />
    </div>
    {label}
  </div>
);

export function VisitQualification({ visitId, initialData, onSaved }: VisitQualificationProps) {
  const [data, setData] = useState<VisitQualificationData>(initialData);
  const [saving, setSaving] = useState(false);
  const [packages, setPackages] = useState<{ name: string }[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setData(initialData);
    setDirty(false);
  }, [visitId]);

  // Load company packages
  useEffect(() => {
    const companyId = getCurrentCompanyId();
    if (!companyId) return;
    supabase
      .from("company_packages")
      .select("name")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => { if (data) setPackages(data); });
  }, []);

  const update = (field: keyof VisitQualificationData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const restrictionsJson = data.restrictions.length > 0
      ? data.restrictions.map(r => r === "outro" ? { type: r, notes: data.restriction_notes } : { type: r })
      : [];

    const payload: Record<string, any> = {
      package_interest: data.package_interest || null,
      guest_count: data.guest_count || null,
      party_date_interest: data.party_date_interest || null,
      payment_preference: data.payment_preference || null,
      interest_level: data.interest_level || null,
      restrictions: restrictionsJson,
      client_questions: data.client_questions || null,
      seller_notes: data.seller_notes || null,
      lead_channel: data.lead_channel || null,
    };

    const { error } = await (supabase as any)
      .from("lead_visits")
      .update(payload)
      .eq("id", visitId);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Qualificação salva!" });
      setDirty(false);
      onSaved?.();
    }
    setSaving(false);
  };

  const setQuickInterest = (level: string) => {
    update("interest_level", level);
  };

  const interestConfig = data.interest_level
    ? INTEREST_LEVELS.find(l => l.value === data.interest_level)
    : null;

  return (
    <div className="space-y-4">
      {/* Quick Action Buttons */}
      <div className="rounded-xl border border-border/40 bg-card p-4">
        <SectionHeader icon={Sparkles} label="Impressão Rápida" />
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-auto py-3 flex flex-col gap-1.5 text-xs font-medium transition-all",
              data.interest_level === "alto" && "bg-orange-500/10 border-orange-400 text-orange-700 ring-1 ring-orange-300"
            )}
            onClick={() => setQuickInterest("alto")}
          >
            <ThumbsUp className="h-5 w-5" />
            <span>Gostou muito</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-auto py-3 flex flex-col gap-1.5 text-xs font-medium transition-all",
              data.interest_level === "medio" && "bg-amber-500/10 border-amber-400 text-amber-700 ring-1 ring-amber-300"
            )}
            onClick={() => setQuickInterest("medio")}
          >
            <Meh className="h-5 w-5" />
            <span>Indeciso</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-auto py-3 flex flex-col gap-1.5 text-xs font-medium transition-all",
              data.interest_level === "baixo" && "bg-muted border-border text-muted-foreground ring-1 ring-border"
            )}
            onClick={() => setQuickInterest("baixo")}
          >
            <ThumbsDown className="h-5 w-5" />
            <span>Sem interesse</span>
          </Button>
        </div>

        {/* Smart suggestion based on interest */}
        {interestConfig && (
          <div className={cn(
            "mt-3 p-3 rounded-lg border text-sm flex items-center gap-2",
            data.interest_level === "alto" && "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300",
            data.interest_level === "medio" && "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300",
            data.interest_level === "baixo" && "bg-muted/50 border-border text-muted-foreground",
          )}>
            {data.interest_level === "alto" && (
              <>
                <Send className="h-4 w-4 shrink-0" />
                <span>💡 Sugestão: <strong>Enviar proposta</strong> ou <strong>gerar contrato</strong></span>
              </>
            )}
            {data.interest_level === "medio" && (
              <>
                <CalendarIcon className="h-4 w-4 shrink-0" />
                <span>💡 Sugestão: Agendar <strong>follow-up em 24h</strong></span>
              </>
            )}
            {data.interest_level === "baixo" && (
              <>
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>💡 Sugestão: Incluir no <strong>fluxo de reativação</strong></span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Party Data */}
      <div className="rounded-xl border border-border/40 bg-card p-4">
        <SectionHeader icon={Package} label="Dados da Festa" />
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Pacote de Interesse</Label>
              <Select value={data.package_interest || "none"} onValueChange={(v) => update("package_interest", v === "none" ? null : v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não definido</SelectItem>
                  {packages.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Convidados</Label>
              <Input
                type="number"
                placeholder="Ex: 80"
                value={data.guest_count || ""}
                onChange={(e) => update("guest_count", e.target.value ? parseInt(e.target.value) : null)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Data de Interesse</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full h-9 justify-start text-left font-normal text-sm", !data.party_date_interest && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {data.party_date_interest ? format(new Date(data.party_date_interest + "T12:00:00"), "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={data.party_date_interest ? new Date(data.party_date_interest + "T12:00:00") : undefined}
                    onSelect={(d) => update("party_date_interest", d ? format(d, "yyyy-MM-dd") : null)}
                    locale={ptBR}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Pagamento Preferido</Label>
              <Select value={data.payment_preference || "none"} onValueChange={(v) => update("payment_preference", v === "none" ? null : v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não definido</SelectItem>
                  {PAYMENT_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Restrictions */}
      <div className="rounded-xl border border-border/40 bg-card p-4">
        <SectionHeader icon={AlertTriangle} label="Restrições do Cliente" />
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {RESTRICTION_OPTIONS.map(r => {
              const checked = data.restrictions.includes(r.value);
              return (
                <label
                  key={r.value}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-all",
                    checked
                      ? "bg-destructive/10 border-destructive/40 text-destructive font-medium"
                      : "bg-card border-border/60 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => {
                      const next = c
                        ? [...data.restrictions, r.value]
                        : data.restrictions.filter(v => v !== r.value);
                      update("restrictions", next);
                    }}
                  />
                  {r.label}
                </label>
              );
            })}
          </div>
          {data.restrictions.includes("outro") && (
            <Input
              placeholder="Descreva a restrição..."
              value={data.restriction_notes}
              onChange={(e) => update("restriction_notes" as any, e.target.value)}
              className="h-9 text-sm"
            />
          )}
        </div>
      </div>

      {/* Client Questions */}
      <div className="rounded-xl border border-border/40 bg-card p-4">
        <SectionHeader icon={MessageSquare} label="Dúvidas do Cliente" />
        <Textarea
          placeholder="Dúvidas ou objeções levantadas durante a visita..."
          value={data.client_questions || ""}
          onChange={(e) => update("client_questions", e.target.value)}
          rows={3}
          className="text-sm"
        />
      </div>

      {/* Seller Notes */}
      <div className="rounded-xl border border-border/40 bg-card p-4">
        <SectionHeader icon={PenLine} label="Observações do Vendedor" />
        <Textarea
          placeholder="Notas estratégicas: perfil do cliente, comparando com concorrente, veio por indicação..."
          value={data.seller_notes || ""}
          onChange={(e) => update("seller_notes", e.target.value)}
          rows={4}
          className="text-sm"
        />
      </div>

      {/* Save button */}
      {dirty && (
        <div className="sticky bottom-0 pt-3 pb-1 bg-gradient-to-t from-background via-background to-transparent">
          <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl font-semibold shadow-md">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
            Salvar Qualificação
          </Button>
        </div>
      )}
    </div>
  );
}
