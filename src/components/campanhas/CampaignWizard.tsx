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
import { ChevronLeft, ChevronRight, Loader2, Megaphone } from "lucide-react";
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

      // Insert recipients
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

  const stepTitles = ["Contexto & Mensagem", "Audiência", "Configuração"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Nova Campanha — {stepTitles[step]}
          </DialogTitle>
          <DialogDescription>
            Etapa {step + 1} de 3
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex gap-1.5 mb-2">
          {[0, 1, 2].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {step === 0 && (
            <CampaignContextStep
              draft={draft}
              setDraft={setDraft}
              companyName={companyName}
            />
          )}
          {step === 1 && (
            <CampaignAudienceStep
              draft={draft}
              setDraft={setDraft}
              companyId={companyId}
            />
          )}
          {step === 2 && (
            <CampaignConfigStep draft={draft} setDraft={setDraft} />
          )}
        </div>

        <div className="flex justify-between pt-3 border-t shrink-0">
          <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : onOpenChange(false)}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            {step === 0 ? "Cancelar" : "Voltar"}
          </Button>

          {step < 2 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 0 ? !canAdvanceStep0 : !canAdvanceStep1}
            >
              Próximo
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Criar e Iniciar Envio
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
