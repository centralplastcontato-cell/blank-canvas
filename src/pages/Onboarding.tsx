import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, ArrowRight, Upload, X, CheckCircle2, PartyPopper, Camera, Video } from "lucide-react";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 7;

const LEAD_SOURCE_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google" },
  { value: "indicacao", label: "Indicação" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "outros", label: "Outros" },
];

interface OnboardingData {
  buffet_name: string;
  city: string;
  state: string;
  full_address: string;
  instagram: string;
  website: string;
  contact_name: string;
  contact_role: string;
  contact_phone: string;
  contact_email: string;
  secondary_contact: string;
  lead_volume: string;
  lead_sources: string[];
  current_service_method: string;
  uses_paid_traffic: boolean;
  monthly_investment: string;
  cost_per_lead: string;
  current_agency: string;
  whatsapp_numbers: string[];
  attendants_count: number;
  service_hours: string;
  multiple_units: boolean;
  logo_url: string;
  photo_urls: string[];
  video_urls: string[];
  brand_notes: string;
  main_goal: string;
  additional_notes: string;
}

const initialData: OnboardingData = {
  buffet_name: "", city: "", state: "", full_address: "", instagram: "", website: "",
  contact_name: "", contact_role: "", contact_phone: "", contact_email: "", secondary_contact: "",
  lead_volume: "", lead_sources: [], current_service_method: "",
  uses_paid_traffic: false, monthly_investment: "", cost_per_lead: "", current_agency: "",
  whatsapp_numbers: [""], attendants_count: 1, service_hours: "", multiple_units: false,
  logo_url: "", photo_urls: [], video_urls: [], brand_notes: "",
  main_goal: "", additional_notes: "",
};

export default function Onboarding() {
  const { slug } = useParams<{ slug: string }>();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [onboardingId, setOnboardingId] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);

  useEffect(() => {
    const fetchCompany = async () => {
      if (!slug) { setLoading(false); return; }
      const { data: branding } = await supabase.rpc("get_company_branding_by_slug", { _slug: slug });
      if (branding && branding.length > 0) {
        setCompanyName(branding[0].name);
        setCompanyLogo(branding[0].logo_url);
      }
      const { data: company } = await supabase.from("companies").select("id").eq("slug", slug).single();
      if (company) {
        setCompanyId(company.id);
        const { data: existing } = await supabase
          .from("company_onboarding")
          .select("*")
          .eq("company_id", company.id)
          .order("created_at", { ascending: false })
          .limit(1);
        if (existing && existing.length > 0) {
          const e = existing[0] as any;
          if (e.status === 'completo') {
            setSubmitted(true);
          } else {
            setOnboardingId(e.id);
            setStep(e.current_step || 1);
            setData({
              buffet_name: e.buffet_name || "", city: e.city || "", state: e.state || "",
              full_address: e.full_address || "", instagram: e.instagram || "", website: e.website || "",
              contact_name: e.contact_name || "", contact_role: e.contact_role || "",
              contact_phone: e.contact_phone || "", contact_email: e.contact_email || "",
              secondary_contact: e.secondary_contact || "",
              lead_volume: e.lead_volume || "", lead_sources: e.lead_sources || [],
              current_service_method: e.current_service_method || "",
              uses_paid_traffic: e.uses_paid_traffic || false, monthly_investment: e.monthly_investment || "",
              cost_per_lead: e.cost_per_lead || "", current_agency: e.current_agency || "",
              whatsapp_numbers: e.whatsapp_numbers?.length ? e.whatsapp_numbers : [""],
              attendants_count: e.attendants_count || 1, service_hours: e.service_hours || "",
              multiple_units: e.multiple_units || false,
              logo_url: e.logo_url || "", photo_urls: e.photo_urls || [],
              video_urls: e.video_urls || [], brand_notes: e.brand_notes || "",
              main_goal: e.main_goal || "", additional_notes: e.additional_notes || "",
            });
          }
        }
      }
      setLoading(false);
    };
    fetchCompany();
  }, [slug]);

  const update = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const saveProgress = async (nextStep: number) => {
    if (!companyId) return;
    const payload: any = { ...data, company_id: companyId, current_step: nextStep, status: 'em_andamento' };
    delete payload.photo_urls_files;
    if (onboardingId) {
      await supabase.from("company_onboarding").update(payload).eq("id", onboardingId);
    } else {
      const { data: inserted } = await supabase.from("company_onboarding").insert(payload).select("id").single();
      if (inserted) setOnboardingId(inserted.id);
    }
  };

  const handleNext = () => {
    if (!validateStep()) return;
    const nextStep = step + 1;
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    saveProgress(nextStep); // fire-and-forget, sem bloquear UI
  };

  const handleBack = () => {
    setStep(s => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!companyId || !onboardingId) return;
    setSubmitting(true);
    const payload: any = { ...data, current_step: TOTAL_STEPS, status: 'completo' };
    await supabase.from("company_onboarding").update(payload).eq("id", onboardingId);
    setSubmitting(false);
    setSubmitted(true);
  };

  const validateStep = (): boolean => {
    switch (step) {
      case 1:
        if (!data.buffet_name.trim()) { toast({ title: "Campo obrigatório", description: "Informe o nome do buffet", variant: "destructive" }); return false; }
        if (!data.city.trim()) { toast({ title: "Campo obrigatório", description: "Informe a cidade", variant: "destructive" }); return false; }
        return true;
      case 2:
        if (!data.contact_name.trim()) { toast({ title: "Campo obrigatório", description: "Informe o nome do responsável", variant: "destructive" }); return false; }
        if (!data.contact_phone.trim()) { toast({ title: "Campo obrigatório", description: "Informe o telefone", variant: "destructive" }); return false; }
        return true;
      default:
        return true;
    }
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `${companyId}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("onboarding-uploads").upload(path, file);
    if (error) { toast({ title: "Erro no upload", description: error.message, variant: "destructive" }); return null; }
    const { data: urlData } = supabase.storage.from("onboarding-uploads").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const url = await uploadFile(file, "logos");
    if (url) update("logo_url", url);
    setUploadingLogo(false);
  };

  const handlePhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + data.photo_urls.length > 10) {
      toast({ title: "Limite excedido", description: "Máximo de 10 fotos", variant: "destructive" });
      return;
    }
    setUploadingPhotos(true);
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadFile(file, "photos");
      if (url) urls.push(url);
    }
    update("photo_urls", [...data.photo_urls, ...urls]);
    setUploadingPhotos(false);
  };

  const handleVideosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + data.video_urls.length > 2) {
      toast({ title: "Limite excedido", description: "Máximo de 2 vídeos", variant: "destructive" });
      return;
    }
    setUploadingVideos(true);
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadFile(file, "videos");
      if (url) urls.push(url);
    }
    update("video_urls", [...data.video_urls, ...urls]);
    setUploadingVideos(false);
  };

  const removePhoto = (index: number) => {
    update("photo_urls", data.photo_urls.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    update("video_urls", data.video_urls.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-foreground">Link inválido</h1>
          <p className="text-muted-foreground">Este link de onboarding não é válido ou a empresa não foi encontrada.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Onboarding concluído! 🎉</h1>
          <p className="text-muted-foreground">
            Obrigado por preencher todas as informações do <strong>{companyName}</strong>. 
            Nossa equipe vai analisar os dados e entrar em contato em breve para o setup da plataforma.
          </p>
          <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
            <PartyPopper className="h-6 w-6 text-accent mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Fique de olho no WhatsApp para as próximas etapas!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border px-4 py-3 shadow-subtle">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            {companyLogo && (
              <img src={companyLogo} alt={companyName} className="h-9 w-9 rounded-xl object-contain" />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-foreground truncate">{companyName}</h1>
              <p className="text-xs text-muted-foreground">Passo {step} de {TOTAL_STEPS}</p>
            </div>
          </div>
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i < step
                    ? "bg-primary h-2 flex-1"
                    : i === step - 1
                    ? "bg-primary h-2.5 flex-1 ring-2 ring-primary/30"
                    : "bg-border h-1.5 flex-1"
                )}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-32">
        {step === 1 && <Step1 data={data} update={update} />}
        {step === 2 && <Step2 data={data} update={update} />}
        {step === 3 && <Step3 data={data} update={update} />}
        {step === 4 && <Step4 data={data} update={update} />}
        {step === 5 && <Step5 data={data} update={update} />}
        {step === 6 && (
          <Step6
            data={data} update={update}
            onLogoUpload={handleLogoUpload} uploadingLogo={uploadingLogo}
            onPhotosUpload={handlePhotosUpload} uploadingPhotos={uploadingPhotos}
            onVideosUpload={handleVideosUpload} uploadingVideos={uploadingVideos}
            removePhoto={removePhoto} removeVideo={removeVideo}
          />
        )}
        {step === 7 && <Step7 data={data} update={update} />}
      </main>

      {/* Footer navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-border px-4 py-3 z-50 shadow-elevated">
        <div className="max-w-2xl mx-auto flex gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button onClick={handleNext} className="flex-1">
              Próximo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-accent hover:bg-accent/90">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Finalizar Onboarding
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

// --- Shared Components ---

interface StepProps {
  data: OnboardingData;
  update: (field: keyof OnboardingData, value: any) => void;
}

function StepHeader({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
  return (
    <div className="mb-5 px-1">
      <span className="text-4xl">{emoji}</span>
      <h2 className="text-2xl font-bold text-foreground mt-2">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-5 space-y-5">
      {children}
    </div>
  );
}

function FieldSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      {title && (
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 border-b border-border/40 pb-1.5">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

// --- Step Components ---

function Step1({ data, update }: StepProps) {
  return (
    <>
      <StepHeader emoji="🏰" title="Identidade do Buffet" subtitle="Conte-nos sobre o seu espaço de festas" />
      <FieldGroup>
        <FieldSection title="Sobre o buffet">
          <Field label="Nome do buffet" required>
            <Input value={data.buffet_name} onChange={e => update("buffet_name", e.target.value)} placeholder="Ex: Castelo da Diversão" />
          </Field>
        </FieldSection>

        <FieldSection title="Localização">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label="Cidade" required>
                <Input value={data.city} onChange={e => update("city", e.target.value)} placeholder="São Paulo" />
              </Field>
            </div>
            <Field label="Estado">
              <Input value={data.state} onChange={e => update("state", e.target.value)} placeholder="SP" maxLength={2} />
            </Field>
          </div>
          <Field label="Endereço completo">
            <Input value={data.full_address} onChange={e => update("full_address", e.target.value)} placeholder="Rua, número, bairro..." />
          </Field>
        </FieldSection>

        <FieldSection title="Presença online">
          <Field label="Instagram">
            <Input value={data.instagram} onChange={e => update("instagram", e.target.value)} placeholder="@seubuffet" />
          </Field>
          <Field label="Site (opcional)">
            <Input value={data.website} onChange={e => update("website", e.target.value)} placeholder="https://seubuffet.com.br" />
          </Field>
        </FieldSection>
      </FieldGroup>
    </>
  );
}

function Step2({ data, update }: StepProps) {
  return (
    <>
      <StepHeader emoji="👤" title="Contato Principal" subtitle="Quem será o responsável pelo atendimento?" />
      <FieldGroup>
        <FieldSection title="Responsável">
          <Field label="Nome do responsável" required>
            <Input value={data.contact_name} onChange={e => update("contact_name", e.target.value)} placeholder="Maria Silva" />
          </Field>
          <Field label="Cargo">
            <Input value={data.contact_role} onChange={e => update("contact_role", e.target.value)} placeholder="Gerente, Proprietário..." />
          </Field>
        </FieldSection>

        <FieldSection title="Contato">
          <Field label="Telefone (WhatsApp)" required>
            <Input value={data.contact_phone} onChange={e => update("contact_phone", e.target.value)} placeholder="(11) 99999-9999" />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={data.contact_email} onChange={e => update("contact_email", e.target.value)} placeholder="contato@seubuffet.com" />
          </Field>
          <Field label="Contato secundário (opcional)">
            <Input value={data.secondary_contact} onChange={e => update("secondary_contact", e.target.value)} placeholder="Nome e telefone de outro contato" />
          </Field>
        </FieldSection>
      </FieldGroup>
    </>
  );
}

function Step3({ data, update }: StepProps) {
  return (
    <>
      <StepHeader emoji="📊" title="Operação Atual" subtitle="Como funciona o atendimento hoje?" />
      <FieldGroup>
        <FieldSection title="Volume de leads">
          <Field label="Volume médio de leads">
            <Select value={data.lead_volume} onValueChange={v => update("lead_volume", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1-5/dia">1-5 por dia</SelectItem>
                <SelectItem value="5-15/dia">5-15 por dia</SelectItem>
                <SelectItem value="15-30/dia">15-30 por dia</SelectItem>
                <SelectItem value="30+/dia">30+ por dia</SelectItem>
                <SelectItem value="poucos/semana">Poucos por semana</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FieldSection>

        <FieldSection title="Origem dos leads">
          <Field label="De onde vêm seus leads?">
            <div className="grid grid-cols-2 gap-2">
              {LEAD_SOURCE_OPTIONS.map(opt => (
                <label key={opt.value} className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                  data.lead_sources.includes(opt.value) ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                )}>
                  <Checkbox
                    checked={data.lead_sources.includes(opt.value)}
                    onCheckedChange={(checked) => {
                      const sources = checked
                        ? [...data.lead_sources, opt.value]
                        : data.lead_sources.filter(s => s !== opt.value);
                      update("lead_sources", sources);
                    }}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </Field>
        </FieldSection>

        <FieldSection title="Método de atendimento">
          <Field label="Forma atual de atendimento">
            <Select value={data.current_service_method} onValueChange={v => update("current_service_method", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual (WhatsApp direto)</SelectItem>
                <SelectItem value="bot">Bot / Automação</SelectItem>
                <SelectItem value="misto">Misto (Bot + Manual)</SelectItem>
                <SelectItem value="crm">CRM externo</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FieldSection>
      </FieldGroup>
    </>
  );
}

function Step4({ data, update }: StepProps) {
  return (
    <>
      <StepHeader emoji="📢" title="Tráfego Pago" subtitle="Sobre seus investimentos em anúncios" />
      <FieldGroup>
        <FieldSection title="Investimento em anúncios">
          <Field label="Investe em tráfego pago?">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <Switch checked={data.uses_paid_traffic} onCheckedChange={v => update("uses_paid_traffic", v)} />
              <span className="text-sm font-medium">{data.uses_paid_traffic ? "Sim, invisto em anúncios" : "Não invisto em anúncios"}</span>
            </div>
          </Field>
        </FieldSection>

        {data.uses_paid_traffic && (
          <FieldSection title="Detalhes do investimento">
            <Field label="Investimento mensal">
              <Input value={data.monthly_investment} onChange={e => update("monthly_investment", e.target.value)} placeholder="R$ 2.000,00" />
            </Field>
            <Field label="Custo médio por lead">
              <Input value={data.cost_per_lead} onChange={e => update("cost_per_lead", e.target.value)} placeholder="R$ 5,00" />
            </Field>
            <Field label="Agência atual (opcional)">
              <Input value={data.current_agency} onChange={e => update("current_agency", e.target.value)} placeholder="Nome da agência" />
            </Field>
          </FieldSection>
        )}
      </FieldGroup>
    </>
  );
}

function Step5({ data, update }: StepProps) {
  const addWhatsApp = () => update("whatsapp_numbers", [...data.whatsapp_numbers, ""]);
  const updateWhatsApp = (i: number, v: string) => {
    const nums = [...data.whatsapp_numbers];
    nums[i] = v;
    update("whatsapp_numbers", nums);
  };
  const removeWhatsApp = (i: number) => {
    if (data.whatsapp_numbers.length <= 1) return;
    update("whatsapp_numbers", data.whatsapp_numbers.filter((_, idx) => idx !== i));
  };

  return (
    <>
      <StepHeader emoji="💬" title="WhatsApp e Atendimento" subtitle="Detalhes sobre sua operação de atendimento" />
      <FieldGroup>
        <FieldSection title="Números de WhatsApp">
          <Field label="Número(s) de WhatsApp">
            <div className="space-y-2">
              {data.whatsapp_numbers.map((num, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={num} onChange={e => updateWhatsApp(i, e.target.value)} placeholder="(11) 99999-9999" />
                  {data.whatsapp_numbers.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeWhatsApp(i)} className="shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addWhatsApp} className="w-full">
                + Adicionar outro número
              </Button>
            </div>
          </Field>
        </FieldSection>

        <FieldSection title="Operação">
          <Field label="Quantidade de atendentes">
            <Input type="number" min={1} value={data.attendants_count} onChange={e => update("attendants_count", parseInt(e.target.value) || 1)} />
          </Field>
          <Field label="Horário de atendimento">
            <Input value={data.service_hours} onChange={e => update("service_hours", e.target.value)} placeholder="Ex: Seg a Sex, 9h às 18h" />
          </Field>
          <Field label="Possui mais de uma unidade?">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <Switch checked={data.multiple_units} onCheckedChange={v => update("multiple_units", v)} />
              <span className="text-sm font-medium">{data.multiple_units ? "Sim, múltiplas unidades" : "Unidade única"}</span>
            </div>
          </Field>
        </FieldSection>
      </FieldGroup>
    </>
  );
}

interface Step6Props extends StepProps {
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingLogo: boolean;
  onPhotosUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingPhotos: boolean;
  onVideosUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingVideos: boolean;
  removePhoto: (i: number) => void;
  removeVideo: (i: number) => void;
}

function Step6({ data, update, onLogoUpload, uploadingLogo, onPhotosUpload, uploadingPhotos, onVideosUpload, uploadingVideos, removePhoto, removeVideo }: Step6Props) {
  return (
    <>
      <StepHeader emoji="🎨" title="Marca e Identidade" subtitle="Envie seus materiais visuais" />
      <FieldGroup>
        <FieldSection title="Logotipo">
          <Field label="Logotipo da empresa">
            {data.logo_url ? (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
                <img src={data.logo_url} alt="Logo" className="h-16 w-16 rounded-xl object-contain bg-card" />
                <Button variant="outline" size="sm" onClick={() => update("logo_url", "")}>Remover</Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/40 transition-colors bg-muted/20">
                {uploadingLogo ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <Upload className="h-8 w-8 text-muted-foreground" />}
                <span className="text-sm text-muted-foreground mt-2">{uploadingLogo ? "Enviando..." : "Clique para enviar"}</span>
                <input type="file" accept="image/*" onChange={onLogoUpload} className="hidden" />
              </label>
            )}
          </Field>
        </FieldSection>

        <FieldSection title={`Fotos do buffet (${data.photo_urls.length}/10)`}>
          <div className="grid grid-cols-3 gap-2">
            {data.photo_urls.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {data.photo_urls.length < 10 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 transition-colors bg-muted/20">
                {uploadingPhotos ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Camera className="h-5 w-5 text-muted-foreground" />}
                <span className="text-xs text-muted-foreground mt-1">{uploadingPhotos ? "..." : "Adicionar"}</span>
                <input type="file" accept="image/*" multiple onChange={onPhotosUpload} className="hidden" />
              </label>
            )}
          </div>
        </FieldSection>

        <FieldSection title={`Vídeos (${data.video_urls.length}/2)`}>
          <div className="space-y-2">
            {data.video_urls.map((url, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
                <Video className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm truncate flex-1">Vídeo {i + 1}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeVideo(i)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {data.video_urls.length < 2 && (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/40 transition-colors bg-muted/20">
                {uploadingVideos ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Video className="h-6 w-6 text-muted-foreground" />}
                <span className="text-xs text-muted-foreground mt-1">{uploadingVideos ? "Enviando..." : "Adicionar vídeo"}</span>
                <input type="file" accept="video/*" onChange={onVideosUpload} className="hidden" />
              </label>
            )}
          </div>
        </FieldSection>

        <FieldSection title="Identidade visual">
          <Field label="Observações de identidade visual">
            <Textarea
              value={data.brand_notes}
              onChange={e => update("brand_notes", e.target.value)}
              placeholder="Cores principais, tom de voz, estilo visual preferido..."
              rows={3}
            />
          </Field>
        </FieldSection>
      </FieldGroup>
    </>
  );
}

function Step7({ data, update }: StepProps) {
  return (
    <>
      <StepHeader emoji="🎯" title="Objetivos" subtitle="O que você espera da plataforma?" />
      <FieldGroup>
        <FieldSection title="Meta principal">
          <Field label="Principal objetivo">
            <Select value={data.main_goal} onValueChange={v => update("main_goal", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mais_leads">Gerar mais leads</SelectItem>
                <SelectItem value="melhor_atendimento">Melhorar atendimento</SelectItem>
                <SelectItem value="organizar_processos">Organizar processos</SelectItem>
                <SelectItem value="automatizar">Automatizar WhatsApp</SelectItem>
                <SelectItem value="aumentar_conversao">Aumentar conversão</SelectItem>
                <SelectItem value="tudo">Todos os anteriores</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FieldSection>

        <FieldSection title="Informações adicionais">
          <Field label="Observações livres">
            <Textarea
              value={data.additional_notes}
              onChange={e => update("additional_notes", e.target.value)}
              placeholder="Conte-nos mais sobre suas necessidades, desafios ou expectativas..."
              rows={4}
            />
          </Field>
        </FieldSection>
      </FieldGroup>
    </>
  );
}
