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
import { Loader2, ArrowLeft, ArrowRight, Upload, X, CheckCircle2, PartyPopper, Camera, Video, FileText, MessageSquare, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const TOTAL_STEPS = 10;

const LEAD_SOURCE_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google" },
  { value: "indicacao", label: "Indicação" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "outros", label: "Outros" },
];




interface AttendantProfile {
  name: string;
  email: string;
  password: string;
}

interface OperationalData {
  event_types: { value: string; label: string }[];
  packages: { name: string; base_price: string; image_url: string }[];
  guest_ranges: string[];
  units: { name: string }[];
  party_schedules: { label: string; start: string; end: string }[];
  working_days: string[];
  optionals: { name: string; value: string }[];
  differentials: string;
  company_legal_name: string;
  cnpj: string;
  bank_info: string;
  attendants: AttendantProfile[];
}

const initialOperationalData: OperationalData = {
  event_types: [],
  packages: [],
  guest_ranges: [],
  units: [],
  party_schedules: [],
  working_days: [],
  optionals: [],
  differentials: "",
  company_legal_name: "",
  cnpj: "",
  bank_info: "",
  attendants: [],
};

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
  has_automation_system: boolean;
  automation_system_name: string;
  budget_format: string;
  budget_file_urls: string[];
  service_screenshots: string[];
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
  has_automation_system: false, automation_system_name: "", budget_format: "",
  budget_file_urls: [], service_screenshots: [],
  uses_paid_traffic: false, monthly_investment: "", cost_per_lead: "", current_agency: "",
  whatsapp_numbers: [""], attendants_count: 1, service_hours: "", multiple_units: false,
  logo_url: "", photo_urls: [], video_urls: [], brand_notes: "",
  main_goal: "", additional_notes: "",
};

export default function Onboarding() {
  const { slug } = useParams<{ slug: string }>();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [opData, setOpData] = useState<OperationalData>(initialOperationalData);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [onboardingId, setOnboardingId] = useState<string | null>(null);
  const [wasCompleted, setWasCompleted] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);
  const [uploadingBudget, setUploadingBudget] = useState(false);
  const [uploadingScreenshots, setUploadingScreenshots] = useState(false);

  const isOptionalStep = step >= 8;

  useEffect(() => {
    const fetchCompany = async () => {
      if (!slug) { setLoading(false); return; }
      const { data: branding } = await supabase.rpc("get_company_branding_by_slug", { _slug: slug });
      if (branding && branding.length > 0) {
        setCompanyName(branding[0].name);
        setCompanyLogo(branding[0].logo_url);
      }
      const companyIdResult = await supabase.rpc("get_company_id_by_slug", { _slug: slug });
      const company = companyIdResult.data ? { id: companyIdResult.data } : null;
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
            setWasCompleted(true);
          }
            setOnboardingId(e.id);
            setStep(e.status === 'completo' ? 1 : (e.current_step || 1));
            setData({
              buffet_name: e.buffet_name || "", city: e.city || "", state: e.state || "",
              full_address: e.full_address || "", instagram: e.instagram || "", website: e.website || "",
              contact_name: e.contact_name || "", contact_role: e.contact_role || "",
              contact_phone: e.contact_phone || "", contact_email: e.contact_email || "",
              secondary_contact: e.secondary_contact || "",
              lead_volume: e.lead_volume || "", lead_sources: e.lead_sources || [],
              current_service_method: e.current_service_method || "",
              has_automation_system: e.has_automation_system || false,
              automation_system_name: e.automation_system_name || "",
              budget_format: e.budget_format || "",
              budget_file_urls: e.budget_file_urls || [],
              service_screenshots: e.service_screenshots || [],
              uses_paid_traffic: e.uses_paid_traffic || false, monthly_investment: e.monthly_investment || "",
              cost_per_lead: e.cost_per_lead || "", current_agency: e.current_agency || "",
              whatsapp_numbers: e.whatsapp_numbers?.length ? e.whatsapp_numbers : [""],
              attendants_count: e.attendants_count || 1, service_hours: e.service_hours || "",
              multiple_units: e.multiple_units || false,
              logo_url: e.logo_url || "", photo_urls: e.photo_urls || [],
              video_urls: e.video_urls || [], brand_notes: e.brand_notes || "",
              main_goal: e.main_goal || "", additional_notes: e.additional_notes || "",
            });
            if (e.operational_data) {
              setOpData({ ...initialOperationalData, ...(e.operational_data as any) });
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
    const payload: any = { ...data, company_id: companyId, current_step: nextStep, status: wasCompleted ? 'completo' : 'em_andamento', operational_data: opData };
    delete payload.photo_urls_files;

    let targetId = onboardingId;
    if (!targetId) {
      const { data: existing } = await supabase
        .from("company_onboarding")
        .select("id")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      targetId = existing?.id || null;
      if (targetId) setOnboardingId(targetId);
    }

    if (targetId) {
      await supabase.from("company_onboarding").update(payload).eq("id", targetId);
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
    saveProgress(nextStep);
  };

  const handleBack = () => {
    setStep(s => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const syncOperationalDataToSettings = async (cId: string, op: OperationalData) => {
    try {
      // Fetch current company settings
      const { data: company } = await supabase
        .from("companies")
        .select("settings")
        .eq("id", cId)
        .single();

      const currentSettings = (company?.settings as Record<string, unknown>) || {};
      const newSettings: Record<string, unknown> = { ...currentSettings };

      // Sync event_types
      if (op.event_types.length > 0) {
        newSettings.event_types = op.event_types;
      }

      // Sync guest_ranges
      if (op.guest_ranges.length > 0) {
        newSettings.guest_ranges = op.guest_ranges;
      }

      // Sync party_schedules
      if (op.party_schedules.length > 0) {
        newSettings.party_schedules = op.party_schedules;
      }

      // Sync working_days
      if (op.working_days.length > 0) {
        newSettings.working_days = op.working_days;
      }

      // Sync legal info
      if (op.company_legal_name) newSettings.company_legal_name = op.company_legal_name;
      if (op.cnpj) newSettings.cnpj = op.cnpj;
      if (op.bank_info) newSettings.bank_info = op.bank_info;
      if (op.differentials) newSettings.differentials = op.differentials;

      // Update company settings
      await supabase.from("companies").update({ settings: newSettings as any }).eq("id", cId);

      // Sync packages to company_packages table
      if (op.packages.length > 0) {
        const packageRows = op.packages.map((pkg, i) => ({
          company_id: cId,
          name: pkg.name,
          description: `Valor base: R$ ${pkg.base_price}`,
          sort_order: i,
          is_active: true,
          preco_separado: false,
        }));
        await supabase.from("company_packages").insert(packageRows);
      }

      // Sync optionals to company_optionals table
      if (op.optionals.length > 0) {
        const optRows = op.optionals.map((opt, i) => ({
          company_id: cId,
          name: opt.name,
          value: opt.value ? parseFloat(opt.value.replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0,
          sort_order: i,
          is_active: true,
        }));
        await supabase.from("company_optionals").insert(optRows);
      }

      // Sync units to company_units table
      if (op.units.length > 0) {
        const unitRows = op.units.map((u, i) => ({
          company_id: cId,
          name: u.name,
          slug: u.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          sort_order: i,
          is_active: true,
        }));
        await supabase.from("company_units").insert(unitRows);
      }
    } catch (err) {
      console.error('Erro ao sincronizar dados operacionais:', err);
      // Non-blocking - onboarding still completes
    }
  };

  const createAttendantUsers = async (cId: string, attendants: AttendantProfile[]) => {
    const validAttendants = attendants.filter(a => a.name.trim() && a.email.trim() && a.password.trim());
    if (validAttendants.length === 0) return;

    for (const att of validAttendants) {
      try {
        await supabase.functions.invoke('manage-user', {
          body: {
            action: 'create',
            email: att.email.trim(),
            password: att.password,
            full_name: att.name.trim(),
            role: 'comercial',
            company_id: cId,
            company_role: 'member',
          },
        });
      } catch (err) {
        console.error('Erro ao criar atendente:', att.email, err);
      }
    }
  };

  const handleSubmit = async () => {
    if (!companyId) return;
    setSubmitting(true);
    try {
      const payload: any = { ...data, company_id: companyId, current_step: TOTAL_STEPS, status: 'completo', operational_data: opData };
      delete payload.photo_urls_files;

      let targetId = onboardingId;
      if (!targetId) {
        const { data: existing } = await supabase
          .from("company_onboarding")
          .select("id")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        targetId = existing?.id || null;
      }

      if (targetId) {
        const { error } = await supabase.from("company_onboarding").update(payload).eq("id", targetId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("company_onboarding")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        if (inserted) setOnboardingId(inserted.id);
      }
      // Auto-import operational data into company settings
      await syncOperationalDataToSettings(companyId, opData);

      // Create attendant user accounts
      await createAttendantUsers(companyId, opData.attendants);

      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Erro ao finalizar", description: err.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
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

  const handleBudgetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + data.budget_file_urls.length > 3) {
      toast({ title: "Limite excedido", description: "Máximo de 3 arquivos de orçamento", variant: "destructive" });
      return;
    }
    setUploadingBudget(true);
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadFile(file, "budget");
      if (url) urls.push(url);
    }
    update("budget_file_urls", [...data.budget_file_urls, ...urls]);
    setUploadingBudget(false);
  };

  const handleScreenshotsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + data.service_screenshots.length > 5) {
      toast({ title: "Limite excedido", description: "Máximo de 5 prints", variant: "destructive" });
      return;
    }
    setUploadingScreenshots(true);
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadFile(file, "screenshots");
      if (url) urls.push(url);
    }
    update("service_screenshots", [...data.service_screenshots, ...urls]);
    setUploadingScreenshots(false);
  };

  const removePhoto = (index: number) => {
    update("photo_urls", data.photo_urls.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    update("video_urls", data.video_urls.filter((_, i) => i !== index));
  };

  const removeBudgetFile = (index: number) => {
    update("budget_file_urls", data.budget_file_urls.filter((_, i) => i !== index));
  };

  const removeScreenshot = (index: number) => {
    update("service_screenshots", data.service_screenshots.filter((_, i) => i !== index));
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
            Obrigado por preencher todas as informações do <strong>{companyName}</strong>.{" "}
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
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-foreground truncate">{companyName}</h1>
                {isOptionalStep && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Opcional</Badge>
                )}
              </div>
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
                    : i >= 7
                    ? "bg-border/50 h-1.5 flex-1 border border-dashed border-border"
                    : "bg-border h-1.5 flex-1"
                )}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-32">
        {wasCompleted && (
          <div className="mb-4 p-3 rounded-xl bg-accent/10 border border-accent/30 text-sm text-accent-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
            <span>Onboarding já preenchido. Você pode atualizar as informações abaixo.</span>
          </div>
        )}
        {step === 1 && <Step1 data={data} update={update} />}
        {step === 2 && <Step2 data={data} update={update} />}
        {step === 3 && (
          <Step3
            data={data} update={update}
            onBudgetUpload={handleBudgetUpload} uploadingBudget={uploadingBudget} removeBudgetFile={removeBudgetFile}
            onScreenshotsUpload={handleScreenshotsUpload} uploadingScreenshots={uploadingScreenshots} removeScreenshot={removeScreenshot}
            opData={opData} setOpData={setOpData}
            uploadFile={uploadFile}
          />
        )}
        {step === 4 && <Step4 data={data} update={update} />}
        {step === 5 && <Step5 data={data} update={update} opData={opData} setOpData={setOpData} />}
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
        {step === 8 && <Step8 opData={opData} setOpData={setOpData} />}
        {step === 9 && <Step9 opData={opData} setOpData={setOpData} multipleUnits={data.multiple_units} />}
        {step === 10 && <Step10 opData={opData} setOpData={setOpData} />}
      </main>

      {/* Footer navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-border px-4 py-3 z-50 shadow-elevated">
        <div className="max-w-2xl mx-auto flex gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
          )}
          {isOptionalStep && (
            <Button variant="secondary" onClick={handleSubmit} disabled={submitting} className="flex-1">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Pular e Finalizar
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

interface Step3Props extends StepProps {
  onBudgetUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingBudget: boolean;
  removeBudgetFile: (i: number) => void;
  onScreenshotsUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingScreenshots: boolean;
  removeScreenshot: (i: number) => void;
  opData: OperationalData;
  setOpData: React.Dispatch<React.SetStateAction<OperationalData>>;
  uploadFile: (file: File, folder: string) => Promise<string | null>;
}

function Step3({ data, update, onScreenshotsUpload, uploadingScreenshots, removeScreenshot, opData, setOpData, uploadFile }: Step3Props) {
  const [uploadingPkgIdx, setUploadingPkgIdx] = useState<number | null>(null);

  const addPackage = () => setOpData(prev => ({ ...prev, packages: [...prev.packages, { name: "", base_price: "", image_url: "" }] }));
  const updatePackageName = (i: number, name: string) => {
    const pkgs = [...opData.packages];
    pkgs[i] = { ...pkgs[i], name };
    setOpData(prev => ({ ...prev, packages: pkgs }));
  };
  const removePackage = (i: number) => {
    setOpData(prev => ({ ...prev, packages: prev.packages.filter((_, idx) => idx !== i) }));
  };

  const handlePackageFileUpload = async (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPkgIdx(i);
    const url = await uploadFile(file, "budget");
    if (url) {
      setOpData(prev => ({
        ...prev,
        packages: prev.packages.map((pk, idx) => idx === i ? { ...pk, image_url: url } : pk),
      }));
    }
    setUploadingPkgIdx(null);
  };

  const removePackageFile = (i: number) => {
    setOpData(prev => ({
      ...prev,
      packages: prev.packages.map((pk, idx) => idx === i ? { ...pk, image_url: "" } : pk),
    }));
  };

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

        <FieldSection title="Sistema de automação">
          <Field label="Já utiliza ou utilizou algum sistema de atendimento automático?">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <Switch checked={data.has_automation_system} onCheckedChange={v => update("has_automation_system", v)} />
              <span className="text-sm font-medium">{data.has_automation_system ? "Sim, já utilizei/utilizo" : "Não"}</span>
            </div>
          </Field>
          {data.has_automation_system && (
            <Field label="Qual sistema?">
              <Input value={data.automation_system_name} onChange={e => update("automation_system_name", e.target.value)} placeholder="Ex: ManyChat, Botconversa, Leadster..." />
            </Field>
          )}
        </FieldSection>

        <FieldSection title="Pacotes / Orçamentos do Buffet">
          <p className="text-xs text-muted-foreground mb-3">
            Adicione cada pacote que você envia para os clientes, com o nome e o arquivo (PDF ou imagem) correspondente.
          </p>
          <div className="space-y-4">
            {opData.packages.map((pkg, i) => (
              <div key={i} className="rounded-xl border border-border p-3 space-y-2 bg-muted/20">
                <div className="flex gap-2">
                  <Input
                    value={pkg.name}
                    onChange={e => updatePackageName(i, e.target.value)}
                    placeholder={`Ex: Festa Almoço, Festa Lanche...`}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removePackage(i)} className="shrink-0 text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {pkg.image_url ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm truncate flex-1">Arquivo enviado</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => window.open(pkg.image_url, "_blank")}>
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removePackageFile(i)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/40 transition-colors bg-muted/10">
                    {uploadingPkgIdx === i ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="text-xs text-muted-foreground mt-1">
                      {uploadingPkgIdx === i ? "Enviando..." : "Enviar PDF ou imagem deste pacote"}
                    </span>
                    <input type="file" accept="image/*,.pdf" onChange={e => handlePackageFileUpload(i, e)} className="hidden" />
                  </label>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addPackage} className="w-full">
              + Adicionar pacote
            </Button>
          </div>
        </FieldSection>

        <FieldSection title="Prints do atendimento">
          <Field label="Envie prints de como você atende um lead novo">
            <p className="text-xs text-muted-foreground -mt-1 mb-2">
              Isso nos ajuda a estruturar melhor as respostas do bot (até 5 prints)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {data.service_screenshots.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                  <img src={url} alt={`Print ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeScreenshot(i)}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {data.service_screenshots.length < 5 && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 transition-colors bg-muted/20">
                  {uploadingScreenshots ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <MessageSquare className="h-5 w-5 text-muted-foreground" />}
                  <span className="text-xs text-muted-foreground mt-1">{uploadingScreenshots ? "..." : "Adicionar"}</span>
                  <input type="file" accept="image/*" multiple onChange={onScreenshotsUpload} className="hidden" />
                </label>
              )}
            </div>
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

function Step5({ data, update, opData, setOpData }: StepProps & { opData: OperationalData; setOpData: React.Dispatch<React.SetStateAction<OperationalData>> }) {
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

  const handleCountChange = (count: number) => {
    update("attendants_count", count);
    const current = [...opData.attendants];
    if (count > current.length) {
      for (let i = current.length; i < count; i++) {
        current.push({ name: "", email: "", password: "" });
      }
    } else {
      current.splice(count);
    }
    setOpData(prev => ({ ...prev, attendants: current }));
  };

  const updateAttendant = (i: number, field: keyof AttendantProfile, value: string) => {
    const updated = [...opData.attendants];
    updated[i] = { ...updated[i], [field]: value };
    setOpData(prev => ({ ...prev, attendants: updated }));
  };

  // Initialize attendants array if empty but count > 0
  useEffect(() => {
    if (opData.attendants.length === 0 && data.attendants_count > 0) {
      const initial: AttendantProfile[] = Array.from({ length: data.attendants_count }, () => ({ name: "", email: "", password: "" }));
      setOpData(prev => ({ ...prev, attendants: initial }));
    }
  }, []);

  return (
    <>
      <StepHeader emoji="💬" title="WhatsApp e Atendimento" subtitle="Detalhes sobre sua operação de atendimento" />
      <FieldGroup>
        <FieldSection title="WhatsApp para Conexão">
          <p className="text-xs text-muted-foreground mb-2">
            Informe o número do WhatsApp que será conectado à plataforma para responder os clientes automaticamente.
          </p>
          <Field label="Número principal (será conectado)">
            <div className="flex gap-2">
              <Input
                value={data.whatsapp_numbers[0] || ""}
                onChange={e => updateWhatsApp(0, e.target.value)}
                placeholder="(11) 99999-9999"
                className="border-primary/50 ring-1 ring-primary/20"
              />
            </div>
            <p className="text-xs text-primary/70 mt-1 flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Este número receberá e responderá mensagens pela plataforma
            </p>
          </Field>
        </FieldSection>

        {data.whatsapp_numbers.length > 1 && (
          <FieldSection title="Números adicionais">
            <div className="space-y-2">
              {data.whatsapp_numbers.slice(1).map((num, i) => (
                <div key={i + 1} className="flex gap-2">
                  <Input value={num} onChange={e => updateWhatsApp(i + 1, e.target.value)} placeholder="(11) 99999-9999" />
                  <Button variant="ghost" size="icon" onClick={() => removeWhatsApp(i + 1)} className="shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </FieldSection>
        )}
        <Button variant="outline" size="sm" onClick={addWhatsApp} className="w-full">
          + Adicionar outro número
        </Button>

        <FieldSection title="Operação">
          <Field label="Quantidade de atendentes">
            <Input type="number" min={1} max={20} value={data.attendants_count} onChange={e => handleCountChange(parseInt(e.target.value) || 1)} />
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

        {opData.attendants.length > 0 && (
          <FieldSection title="Perfis dos Atendentes">
            <p className="text-xs text-muted-foreground mb-3">
              Crie o acesso de cada atendente. Eles poderão usar esses dados para entrar na plataforma.
            </p>
            <div className="space-y-4">
              {opData.attendants.map((att, i) => (
                <div key={i} className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                  <p className="text-sm font-semibold text-foreground">Atendente {i + 1}</p>
                  <div>
                    <Label className="text-xs text-muted-foreground">Nome completo</Label>
                    <Input value={att.name} onChange={e => updateAttendant(i, "name", e.target.value)} placeholder="Nome do atendente" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">E-mail de acesso</Label>
                    <Input type="email" value={att.email} onChange={e => updateAttendant(i, "email", e.target.value)} placeholder="atendente@email.com" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Senha</Label>
                    <Input type="password" value={att.password} onChange={e => updateAttendant(i, "password", e.target.value)} placeholder="Mínimo 6 caracteres" />
                  </div>
                </div>
              ))}
            </div>
          </FieldSection>
        )}
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
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 mb-2">
        <p className="text-sm text-amber-800 font-medium">⭐ Capriche na seleção!</p>
        <p className="text-xs text-amber-700 mt-1">
          Essas fotos e vídeos serão usados pelo <strong>bot para enviar aos clientes</strong> durante o atendimento automático e também serão exibidos na sua <strong>Landing Page de captura de leads</strong>. Escolha as melhores imagens do seu buffet!
        </p>
      </div>
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
          <p className="text-xs text-muted-foreground mb-2">
            📸 Envie as melhores fotos do espaço, decoração e festas — elas aparecerão na sua <strong>Landing Page</strong> e serão enviadas pelo <strong>bot aos leads</strong>.
          </p>
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
          <p className="text-xs text-muted-foreground mb-2">
            🎬 Vídeos do buffet que serão enviados automaticamente pelo bot e exibidos na Landing Page.
          </p>
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

// --- Optional Steps Props ---
interface OpStepProps {
  opData: OperationalData;
  setOpData: React.Dispatch<React.SetStateAction<OperationalData>>;
}

function OptionalBanner() {
  return (
    <div className="mb-4 p-3 rounded-xl bg-secondary/50 border border-secondary text-sm text-muted-foreground flex items-center gap-2">
      <Badge variant="secondary" className="text-[10px] shrink-0">Opcional</Badge>
      <span>Preencha se desejar — você pode pular e finalizar a qualquer momento.</span>
    </div>
  );
}

function Step8({ opData, setOpData }: OpStepProps) {
  const addEventType = () => setOpData(p => ({ ...p, event_types: [...p.event_types, { value: "", label: "" }] }));
  const removeEventType = (i: number) => setOpData(p => ({ ...p, event_types: p.event_types.filter((_, idx) => idx !== i) }));
  const updateEventType = (i: number, label: string) => {
    setOpData(p => ({
      ...p,
      event_types: p.event_types.map((et, idx) => idx === i ? { value: label.toLowerCase().replace(/\s+/g, '_'), label } : et),
    }));
  };

  const addPackage = () => setOpData(p => ({ ...p, packages: [...p.packages, { name: "", base_price: "", image_url: "" }] }));
  const removePackage = (i: number) => setOpData(p => ({ ...p, packages: p.packages.filter((_, idx) => idx !== i) }));
  const updatePackage = (i: number, field: 'name' | 'base_price', value: string) => {
    setOpData(p => ({
      ...p,
      packages: p.packages.map((pk, idx) => idx === i ? { ...pk, [field]: value } : pk),
    }));
  };

  const GUEST_OPTIONS = ["20", "30", "40", "50", "60", "80", "100", "120", "150", "200+"];
  const toggleGuest = (v: string) => {
    setOpData(p => ({
      ...p,
      guest_ranges: p.guest_ranges.includes(v) ? p.guest_ranges.filter(g => g !== v) : [...p.guest_ranges, v],
    }));
  };

  return (
    <>
      <StepHeader emoji="🎉" title="Tipos de Festa e Pacotes" subtitle="Quais festas e pacotes seu buffet oferece?" />
      <OptionalBanner />
      <FieldGroup>
        <FieldSection title="Tipos de festa">
          <Field label="Quais tipos de festa você oferece?">
            <div className="space-y-2">
              {opData.event_types.map((et, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={et.label}
                    onChange={e => updateEventType(i, e.target.value)}
                    placeholder="Ex: Infantil, Adulto, Corporativo..."
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeEventType(i)} className="shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addEventType} className="w-full">
                + Adicionar tipo de festa
              </Button>
            </div>
          </Field>
        </FieldSection>

        <FieldSection title="Pacotes">
          <Field label="Seus pacotes (nome e valor base)">
            <div className="space-y-2">
              {opData.packages.map((pk, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={pk.name}
                    onChange={e => updatePackage(i, 'name', e.target.value)}
                    placeholder="Nome do pacote"
                    className="flex-1"
                  />
                  <Input
                    value={pk.base_price}
                    onChange={e => updatePackage(i, 'base_price', e.target.value)}
                    placeholder="R$ valor"
                    className="w-28"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removePackage(i)} className="shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addPackage} className="w-full">
                + Adicionar pacote
              </Button>
            </div>
          </Field>
        </FieldSection>

        <FieldSection title="Faixas de convidados">
          <Field label="Quantidades de convidados que você atende">
            <div className="flex flex-wrap gap-2">
              {GUEST_OPTIONS.map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggleGuest(v)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-sm transition-colors",
                    opData.guest_ranges.includes(v)
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </Field>
        </FieldSection>
      </FieldGroup>
    </>
  );
}

function Step9({ opData, setOpData, multipleUnits }: OpStepProps & { multipleUnits: boolean }) {
  const addUnit = () => setOpData(p => ({ ...p, units: [...p.units, { name: "" }] }));
  const removeUnit = (i: number) => setOpData(p => ({ ...p, units: p.units.filter((_, idx) => idx !== i) }));
  const updateUnit = (i: number, name: string) => {
    setOpData(p => ({ ...p, units: p.units.map((u, idx) => idx === i ? { name } : u) }));
  };

  const addSchedule = () => setOpData(p => ({ ...p, party_schedules: [...p.party_schedules, { label: "", start: "", end: "" }] }));
  const removeSchedule = (i: number) => setOpData(p => ({ ...p, party_schedules: p.party_schedules.filter((_, idx) => idx !== i) }));
  const updateSchedule = (i: number, field: 'label' | 'start' | 'end', value: string) => {
    setOpData(p => ({
      ...p,
      party_schedules: p.party_schedules.map((s, idx) => idx === i ? { ...s, [field]: value } : s),
    }));
  };

  const WEEKDAYS_LIST = [
    { value: "seg", label: "Seg" },
    { value: "ter", label: "Ter" },
    { value: "qua", label: "Qua" },
    { value: "qui", label: "Qui" },
    { value: "sex", label: "Sex" },
    { value: "sab", label: "Sáb" },
    { value: "dom", label: "Dom" },
  ];

  const toggleDay = (v: string) => {
    setOpData(p => ({
      ...p,
      working_days: p.working_days.includes(v) ? p.working_days.filter(d => d !== v) : [...p.working_days, v],
    }));
  };

  return (
    <>
      <StepHeader emoji="🏢" title="Unidades e Horários" subtitle="Detalhes da sua estrutura de atendimento" />
      <OptionalBanner />
      <FieldGroup>
        {multipleUnits && (
          <FieldSection title="Unidades">
            <Field label="Nomes das suas unidades">
              <div className="space-y-2">
                {opData.units.map((u, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={u.name}
                      onChange={e => updateUnit(i, e.target.value)}
                      placeholder="Ex: Unidade Centro, Unidade Sul..."
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeUnit(i)} className="shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addUnit} className="w-full">
                  + Adicionar unidade
                </Button>
              </div>
            </Field>
          </FieldSection>
        )}

        <FieldSection title="Horários de festa">
          <Field label="Horários padrão das festas">
            <div className="space-y-2">
              {opData.party_schedules.map((s, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    value={s.label}
                    onChange={e => updateSchedule(i, 'label', e.target.value)}
                    placeholder="Manhã, Tarde..."
                    className="flex-1"
                  />
                  <Input
                    type="time"
                    value={s.start}
                    onChange={e => updateSchedule(i, 'start', e.target.value)}
                    className="w-24"
                  />
                  <span className="text-muted-foreground text-sm">às</span>
                  <Input
                    type="time"
                    value={s.end}
                    onChange={e => updateSchedule(i, 'end', e.target.value)}
                    className="w-24"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeSchedule(i)} className="shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addSchedule} className="w-full">
                + Adicionar horário
              </Button>
            </div>
          </Field>
        </FieldSection>

        <FieldSection title="Dias de funcionamento">
          <Field label="Em quais dias da semana você realiza festas?">
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS_LIST.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-sm transition-colors",
                    opData.working_days.includes(d.value)
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </Field>
        </FieldSection>
      </FieldGroup>
    </>
  );
}

function Step10({ opData, setOpData }: OpStepProps) {
  const addOptional = () => setOpData(p => ({ ...p, optionals: [...p.optionals, { name: "", value: "" }] }));
  const removeOptional = (i: number) => setOpData(p => ({ ...p, optionals: p.optionals.filter((_, idx) => idx !== i) }));
  const updateOptional = (i: number, field: 'name' | 'value', value: string) => {
    setOpData(p => ({
      ...p,
      optionals: p.optionals.map((o, idx) => idx === i ? { ...o, [field]: value } : o),
    }));
  };

  return (
    <>
      <StepHeader emoji="✨" title="Opcionais e Diferenciais" subtitle="O que mais seu buffet oferece?" />
      <OptionalBanner />
      <FieldGroup>
        <FieldSection title="Itens opcionais / extras">
          <Field label="Extras que você oferece (nome e valor)">
            <div className="space-y-2">
              {opData.optionals.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={o.name}
                    onChange={e => updateOptional(i, 'name', e.target.value)}
                    placeholder="Ex: Pula-pula, Algodão doce..."
                    className="flex-1"
                  />
                  <Input
                    value={o.value}
                    onChange={e => updateOptional(i, 'value', e.target.value)}
                    placeholder="R$ valor"
                    className="w-28"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeOptional(i)} className="shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addOptional} className="w-full">
                + Adicionar opcional
              </Button>
            </div>
          </Field>
        </FieldSection>

        <FieldSection title="Diferenciais">
          <Field label="O que torna seu buffet especial?">
            <Textarea
              value={opData.differentials}
              onChange={e => setOpData(p => ({ ...p, differentials: e.target.value }))}
              placeholder="Conte sobre seus diferenciais: decoração personalizada, espaço kids, estacionamento, etc..."
              rows={4}
            />
          </Field>
        </FieldSection>

        <FieldSection title="Dados para contrato (opcional)">
          <Field label="Razão social">
            <Input
              value={opData.company_legal_name}
              onChange={e => setOpData(p => ({ ...p, company_legal_name: e.target.value }))}
              placeholder="Razão social da empresa"
            />
          </Field>
          <Field label="CNPJ">
            <Input
              value={opData.cnpj}
              onChange={e => setOpData(p => ({ ...p, cnpj: e.target.value }))}
              placeholder="00.000.000/0000-00"
            />
          </Field>
          <Field label="Dados bancários">
            <Textarea
              value={opData.bank_info}
              onChange={e => setOpData(p => ({ ...p, bank_info: e.target.value }))}
              placeholder="Banco, agência, conta, PIX..."
              rows={3}
            />
          </Field>
        </FieldSection>
      </FieldGroup>
    </>
  );
}
