import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CampaignContextStep } from "./CampaignContextStep";
import { CampaignAudienceStep } from "./CampaignAudienceStep";
import { CampaignConfigStep } from "./CampaignConfigStep";
import { ChevronLeft, ChevronRight, Loader2, Megaphone, Check, Info } from "lucide-react";
import { toast } from "sonner";

interface CampaignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
  onCampaignCreated: (campaign: any) => void;
}

export interface CampaignDraft {
  name: string;
  description: string;
  variations: { tone: string; text: string }[];
  imageUrl: string | null;
  selectedLeadIds: string[];
  leads: { id: string; name: string; whatsapp: string }[];
  delaySeconds: number;
}

const STEPS = [
  { label: "Contexto", description: "Mensagem & IA" },
  { label: "Audiência", description: "Selecionar leads" },
  { label: "Configuração", description: "Revisar & enviar" },
];

const STEP_DESCRIPTIONS = [
  "Escolha um nome para sua campanha, descreva o objetivo e gere as variações de mensagem com a IA. Você também pode anexar uma imagem.",
  "Filtre e selecione os leads que receberão a campanha. Use os filtros de status, unidade e mês para refinar sua lista.",
  "Revise o resumo da campanha, ajuste o intervalo entre envios e confira a prévia da mensagem antes de criar.",
];

export function CampaignWizard({ open, onOpenChange, companyId, companyName, onCampaignCreated }: CampaignWizardProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<CampaignDraft>({
    name: "",
    description: "",
    variations: [],
    imageUrl: null,
    selectedLeadIds: [],
    leads: [],
    delaySeconds: 60,
  });

  const canAdvanceStep0 = draft.name.trim() && draft.variations.length >= 1;
  const canAdvanceStep1 = draft.selectedLeadIds.length > 0;

  const handleCreate = async () => {
    if (!companyId) return;
    setSaving(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) throw new Error("Não autenticado");

      const selectedLeads = draft.leads.filter((l) => draft.selectedLeadIds.includes(l.id));

      const { data: campaign, error } = await supabase
        .from("campaigns")
        .insert({
          company_id: companyId,
          created_by: user.user.id,
          name: draft.name.trim(),
          description: draft.description.trim() || null,
          message_variations: draft.variations,
          image_url: draft.imageUrl,
          delay_seconds: draft.delaySeconds,
          status: "draft",
          total_recipients: selectedLeads.length,
        })
        .select()
        .single();

      if (error) throw error;

      const recipients = selectedLeads.map((lead, i) => ({
        campaign_id: campaign.id,
        lead_id: lead.id,
        phone: lead.whatsapp,
        lead_name: lead.name,
        variation_index: i % draft.variations.length,
        status: "pending",
      }));

      const { error: recipErr } = await supabase
        .from("campaign_recipients")
        .insert(recipients);

      if (recipErr) throw recipErr;

      toast.success("Campanha criada!");
      setStep(0);
      setDraft({ name: "", description: "", variations: [], imageUrl: null, selectedLeadIds: [], leads: [], delaySeconds: 60 });
      onCampaignCreated(campaign);
    } catch (err: any) {
      console.error("Error creating campaign:", err);
      toast.error(err.message || "Erro ao criar campanha");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden p-0">
        {/* Premium header */}
        <div className="px-5 pt-5 pb-0">
          <DialogHeader className="pb-3">
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Megaphone className="w-4 h-4 text-primary" />
              </div>
              Nova Campanha
            </DialogTitle>
            <DialogDescription className="sr-only">
              Criar nova campanha de marketing
            </DialogDescription>
          </DialogHeader>

          {/* Step indicators - premium style */}
          <div className="flex items-center gap-2 pb-4">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-lg transition-all text-xs font-medium ${
                  i === step
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : i < step
                    ? "bg-muted text-muted-foreground"
                    : "bg-muted/40 text-muted-foreground/50"
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    i < step
                      ? "bg-primary text-primary-foreground"
                      : i === step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted-foreground/20 text-muted-foreground/50"
                  }`}>
                    {i < step ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  <span className="hidden sm:inline truncate">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-4 h-px shrink-0 ${i < step ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step description */}
          <p className="flex items-start gap-1.5 text-base text-muted-foreground pb-3">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {STEP_DESCRIPTIONS[step]}
          </p>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-2">
          {step === 0 && (
            <CampaignContextStep draft={draft} setDraft={setDraft} companyName={companyName} />
          )}
          {step === 1 && (
            <CampaignAudienceStep draft={draft} setDraft={setDraft} companyId={companyId} />
          )}
          {step === 2 && (
            <CampaignConfigStep draft={draft} setDraft={setDraft} />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-5 py-3.5 border-t bg-muted/30 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => step > 0 ? setStep(step - 1) : onOpenChange(false)}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            {step === 0 ? "Cancelar" : "Voltar"}
          </Button>

          {step < 2 ? (
            <Button
              size="sm"
              onClick={() => setStep(step + 1)}
              disabled={step === 0 ? !canAdvanceStep0 : !canAdvanceStep1}
            >
              Próximo
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Criar e Iniciar Envio
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
