import { useState, useEffect } from "react";
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
import { ChevronLeft, ChevronRight, Loader2, Megaphone, Check, Info, ChevronDown, Users } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

interface CampaignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
  onCampaignCreated: (campaign: any) => void;
  /** Quando passado, o wizard entra em modo "editar destinatários" focado no passo Audiência. */
  editingCampaign?: {
    id: string;
    name: string;
    total_recipients: number;
  } | null;
}

export interface CampaignDraft {
  name: string;
  campaignType: string;
  description: string;
  variations: { tone: string; text: string }[];
  imageUrl: string | null;
  selectedLeadIds: string[];
  leads: { id: string; name: string; whatsapp: string }[];
  delaySeconds: number;
  pauseBotOnReply: boolean;
  autoReplyMessage: string;
}

const STEPS = [
  { label: "Contexto", description: "Mensagem & IA" },
  { label: "Audiência", description: "Selecionar leads" },
  { label: "Configuração", description: "Revisar & enviar" },
];

const STEP_DESCRIPTIONS = [
  "Escolha um nome para sua campanha, descreva o objetivo e gere as variações de mensagem com a IA. Você também pode anexar uma imagem ou gerar uma arte com IA.",
  "Filtre e selecione os leads que receberão a campanha. Use os filtros de status, unidade e mês para refinar sua lista.",
  "Revise o resumo da campanha, ajuste o intervalo entre envios e confira a prévia da mensagem antes de criar.",
];

const EMPTY_DRAFT: CampaignDraft = {
  name: "",
  campaignType: "",
  description: "",
  variations: [],
  imageUrl: null,
  selectedLeadIds: [],
  leads: [],
  delaySeconds: 60,
};

export function CampaignWizard({ open, onOpenChange, companyId, companyName, onCampaignCreated, editingCampaign }: CampaignWizardProps) {
  const isEditingAudience = !!editingCampaign;
  const [step, setStep] = useState(isEditingAudience ? 1 : 0);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<CampaignDraft>(EMPTY_DRAFT);

  // Quando entra em modo edição de audiência, pré-carrega destinatários atuais (status=pending) como pré-selecionados.
  useEffect(() => {
    if (!open) return;
    if (isEditingAudience && editingCampaign) {
      setStep(1);
      (async () => {
        const { data } = await supabase
          .from("campaign_recipients")
          .select("lead_id, phone, lead_name, status")
          .eq("campaign_id", editingCampaign.id)
          .eq("status", "pending");

        const preSelected = (data || []).map((r) => r.lead_id ?? `base_${r.phone}`);
        setDraft({
          ...EMPTY_DRAFT,
          name: editingCampaign.name,
          selectedLeadIds: preSelected.filter(Boolean) as string[],
        });
      })();
    } else {
      setStep(0);
      setDraft(EMPTY_DRAFT);
    }
  }, [open, isEditingAudience, editingCampaign?.id]);

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

      const recipients = selectedLeads.map((lead, i) => {
        const isBase = lead.id.startsWith("base_");
        return {
          campaign_id: campaign.id,
          lead_id: isBase ? null : lead.id,
          phone: lead.whatsapp,
          lead_name: lead.name,
          variation_index: i % draft.variations.length,
          status: "pending",
        };
      });

      const { error: recipErr } = await supabase
        .from("campaign_recipients")
        .insert(recipients);

      if (recipErr) throw recipErr;

      // Link image to campaign in gallery
      if (draft.imageUrl && campaign.id) {
        await (supabase as any)
          .from("campaign_images")
          .update({ campaign_id: campaign.id })
          .eq("company_id", companyId)
          .eq("image_url", draft.imageUrl)
          .is("campaign_id", null);
      }

      toast.success("Campanha criada!");
      setStep(0);
      setDraft(EMPTY_DRAFT);
      onCampaignCreated(campaign);
    } catch (err: any) {
      console.error("Error creating campaign:", err);
      toast.error(err.message || "Erro ao criar campanha");
    } finally {
      setSaving(false);
    }
  };

  // Atualiza apenas a lista de destinatários (status=pending) preservando enviados/erros.
  const handleSaveAudience = async () => {
    if (!editingCampaign) return;
    setSaving(true);
    try {
      const selectedLeads = draft.leads.filter((l) => draft.selectedLeadIds.includes(l.id));

      // Carrega quantas variações a campanha tem para distribuir corretamente
      const { data: campData } = await supabase
        .from("campaigns")
        .select("message_variations, sent_count, error_count")
        .eq("id", editingCampaign.id)
        .single();

      const variations = Array.isArray(campData?.message_variations) ? campData!.message_variations : [{}];
      const variationCount = Math.max(1, variations.length);

      // Apaga os pendentes antigos e insere os novos selecionados
      const { error: delErr } = await supabase
        .from("campaign_recipients")
        .delete()
        .eq("campaign_id", editingCampaign.id)
        .eq("status", "pending");
      if (delErr) throw delErr;

      const recipients = selectedLeads.map((lead, i) => {
        const isBase = lead.id.startsWith("base_");
        return {
          campaign_id: editingCampaign.id,
          lead_id: isBase ? null : lead.id,
          phone: lead.whatsapp,
          lead_name: lead.name,
          variation_index: i % variationCount,
          status: "pending",
        };
      });

      if (recipients.length > 0) {
        const { error: insErr } = await supabase
          .from("campaign_recipients")
          .insert(recipients);
        if (insErr) throw insErr;
      }

      // Atualiza total = enviados + erros + novos pendentes
      const newTotal = (campData?.sent_count || 0) + (campData?.error_count || 0) + recipients.length;
      await supabase
        .from("campaigns")
        .update({ total_recipients: newTotal })
        .eq("id", editingCampaign.id);

      toast.success(`Lista atualizada: ${recipients.length} destinatário(s)`);
      onOpenChange(false);
      onCampaignCreated({ id: editingCampaign.id });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao atualizar destinatários");
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
                {isEditingAudience ? <Users className="w-4 h-4 text-primary" /> : <Megaphone className="w-4 h-4 text-primary" />}
              </div>
              {isEditingAudience ? `Editar destinatários — ${editingCampaign?.name}` : "Nova Campanha"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {isEditingAudience ? "Reabrir filtros e regerar lista de destinatários" : "Criar nova campanha de marketing"}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicators - escondidos no modo edição */}
          {!isEditingAudience && (
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
          )}

          {!isEditingAudience && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors pb-2 cursor-pointer">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Instruções</span>
                <ChevronDown className="w-3 h-3" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p className="text-xs text-muted-foreground pb-3 pl-5">
                  {STEP_DESCRIPTIONS[step]}
                </p>
              </CollapsibleContent>
            </Collapsible>
          )}

          {isEditingAudience && (
            <p className="text-xs text-muted-foreground pb-3">
              Ajuste os filtros e a seleção. Apenas os <strong>destinatários pendentes</strong> serão substituídos — quem já recebeu ou deu erro permanece intocado.
            </p>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-2">
          {!isEditingAudience && step === 0 && (
            <CampaignContextStep draft={draft} setDraft={setDraft} companyName={companyName} />
          )}
          {step === 1 && (
            <CampaignAudienceStep draft={draft} setDraft={setDraft} companyId={companyId} />
          )}
          {!isEditingAudience && step === 2 && (
            <CampaignConfigStep draft={draft} setDraft={setDraft} />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-5 py-3.5 border-t bg-muted/30 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => {
            if (isEditingAudience) { onOpenChange(false); return; }
            step > 0 ? setStep(step - 1) : onOpenChange(false);
          }}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            {isEditingAudience ? "Cancelar" : (step === 0 ? "Cancelar" : "Voltar")}
          </Button>

          {isEditingAudience ? (
            <Button size="sm" onClick={handleSaveAudience} disabled={saving || !canAdvanceStep1}>
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Salvar destinatários ({draft.selectedLeadIds.length})
            </Button>
          ) : step < 2 ? (
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
