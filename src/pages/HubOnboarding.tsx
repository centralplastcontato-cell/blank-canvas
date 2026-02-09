import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HubLayout } from "@/components/hub/HubLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Eye, Loader2, Copy, Building2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface OnboardingRecord {
  id: string;
  company_id: string;
  status: string;
  current_step: number;
  buffet_name: string | null;
  city: string | null;
  state: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  logo_url: string | null;
  photo_urls: string[] | null;
  video_urls: string[] | null;
  main_goal: string | null;
  created_at: string;
  updated_at: string;
  // All fields
  full_address: string | null;
  instagram: string | null;
  website: string | null;
  contact_role: string | null;
  secondary_contact: string | null;
  lead_volume: string | null;
  lead_sources: string[] | null;
  current_service_method: string | null;
  uses_paid_traffic: boolean | null;
  monthly_investment: string | null;
  cost_per_lead: string | null;
  current_agency: string | null;
  whatsapp_numbers: string[] | null;
  attendants_count: number | null;
  service_hours: string | null;
  multiple_units: boolean | null;
  brand_notes: string | null;
  additional_notes: string | null;
}

interface CompanyInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pendente: { label: "Pendente", color: "bg-muted text-muted-foreground", icon: Clock },
  em_andamento: { label: "Em andamento", color: "bg-secondary text-secondary-foreground", icon: AlertCircle },
  completo: { label: "Completo", color: "bg-accent text-accent-foreground", icon: CheckCircle2 },
};

const GOAL_MAP: Record<string, string> = {
  mais_leads: "Gerar mais leads",
  melhor_atendimento: "Melhorar atendimento",
  organizar_processos: "Organizar processos",
  automatizar: "Automatizar WhatsApp",
  aumentar_conversao: "Aumentar conversão",
  tudo: "Todos os anteriores",
};

export default function HubOnboarding() {
  return (
    <HubLayout
      currentPage="onboarding"
      header={
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-5 w-5" /> Onboarding
          </h1>
          <p className="text-xs text-muted-foreground">Acompanhe o setup de novos buffets</p>
        </div>
      }
    >
      {() => <HubOnboardingContent />}
    </HubLayout>
  );
}

function HubOnboardingContent() {
  const [records, setRecords] = useState<OnboardingRecord[]>([]);
  const [companies, setCompanies] = useState<Record<string, CompanyInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<OnboardingRecord | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [{ data: onboardings }, { data: comps }] = await Promise.all([
      supabase.from("company_onboarding").select("*").order("created_at", { ascending: false }),
      supabase.from("companies").select("id, name, slug, logo_url"),
    ]);

    if (onboardings) setRecords(onboardings as OnboardingRecord[]);
    if (comps) {
      const map: Record<string, CompanyInfo> = {};
      (comps as CompanyInfo[]).forEach(c => { map[c.id] = c; });
      setCompanies(map);
    }
    setIsLoading(false);
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/onboarding/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!", description: url });
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      {/* Detail Sheet */}
      <Sheet open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <SheetContent className="w-full sm:max-w-lg p-0">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="text-left">Detalhes do Onboarding</SheetTitle>
          </SheetHeader>
          {selectedRecord && (
            <ScrollArea className="h-[calc(100vh-80px)]">
              <OnboardingDetail record={selectedRecord} company={companies[selectedRecord.company_id]} />
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      {records.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Nenhum onboarding recebido ainda.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Envie o link de onboarding para seus novos clientes na página de Empresas.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {records.map(record => {
            const company = companies[record.company_id];
            const statusInfo = STATUS_MAP[record.status] || STATUS_MAP.pendente;
            const StatusIcon = statusInfo.icon;
            return (
              <div key={record.id} className="rounded-xl border bg-card p-5 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {record.logo_url ? (
                      <img src={record.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain bg-muted shrink-0" />
                    ) : company?.logo_url ? (
                      <img src={company.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain bg-muted shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{record.buffet_name || company?.name || "Sem nome"}</h3>
                      <p className="text-xs text-muted-foreground">{record.city}{record.state ? `, ${record.state}` : ""}</p>
                    </div>
                  </div>
                  <Badge className={statusInfo.color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusInfo.label}
                  </Badge>
                </div>

                {record.contact_name && (
                  <p className="text-sm text-muted-foreground truncate">
                    👤 {record.contact_name} {record.contact_phone ? `• ${record.contact_phone}` : ""}
                  </p>
                )}

                <p className="text-xs text-muted-foreground">
                  Passo {record.current_step}/7 • {new Date(record.updated_at).toLocaleDateString("pt-BR")}
                </p>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedRecord(record)}>
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> Ver detalhes
                  </Button>
                  {company && (
                    <Button variant="ghost" size="sm" onClick={() => copyLink(company.slug)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function OnboardingDetail({ record }: { record: OnboardingRecord; company?: CompanyInfo }) {
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );

  const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex justify-between text-sm py-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium text-right max-w-[60%]">{value}</span>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-5">
      <Section title="🏰 Identidade">
        <InfoRow label="Nome" value={record.buffet_name} />
        <InfoRow label="Cidade" value={record.city} />
        <InfoRow label="Estado" value={record.state} />
        <InfoRow label="Endereço" value={record.full_address} />
        <InfoRow label="Instagram" value={record.instagram} />
        <InfoRow label="Site" value={record.website} />
      </Section>
      <Separator />
      <Section title="👤 Contato">
        <InfoRow label="Nome" value={record.contact_name} />
        <InfoRow label="Cargo" value={record.contact_role} />
        <InfoRow label="Telefone" value={record.contact_phone} />
        <InfoRow label="E-mail" value={record.contact_email} />
        <InfoRow label="Contato secundário" value={record.secondary_contact} />
      </Section>
      <Separator />
      <Section title="📊 Operação">
        <InfoRow label="Volume de leads" value={record.lead_volume} />
        <InfoRow label="Fontes" value={record.lead_sources?.join(", ")} />
        <InfoRow label="Atendimento" value={record.current_service_method} />
      </Section>
      <Separator />
      <Section title="📢 Tráfego Pago">
        <InfoRow label="Investe?" value={record.uses_paid_traffic ? "Sim" : "Não"} />
        <InfoRow label="Investimento mensal" value={record.monthly_investment} />
        <InfoRow label="Custo por lead" value={record.cost_per_lead} />
        <InfoRow label="Agência" value={record.current_agency} />
      </Section>
      <Separator />
      <Section title="💬 WhatsApp">
        <InfoRow label="Números" value={record.whatsapp_numbers?.filter(Boolean).join(", ")} />
        <InfoRow label="Atendentes" value={record.attendants_count?.toString()} />
        <InfoRow label="Horário" value={record.service_hours} />
        <InfoRow label="Múltiplas unidades" value={record.multiple_units ? "Sim" : "Não"} />
      </Section>
      <Separator />
      <Section title="🎨 Marca">
        {record.logo_url && (
          <div className="mb-2">
            <span className="text-sm text-muted-foreground">Logo:</span>
            <img src={record.logo_url} alt="Logo" className="h-16 w-16 rounded-xl object-contain bg-muted mt-1" />
          </div>
        )}
        {record.photo_urls && record.photo_urls.length > 0 && (
          <div className="mb-2">
            <span className="text-sm text-muted-foreground">Fotos ({record.photo_urls.length}):</span>
            <div className="grid grid-cols-4 gap-1 mt-1">
              {record.photo_urls.map((url, i) => (
                <img key={i} src={url} alt={`Foto ${i + 1}`} className="aspect-square rounded-lg object-cover bg-muted" />
              ))}
            </div>
          </div>
        )}
        {record.video_urls && record.video_urls.length > 0 && (
          <InfoRow label="Vídeos" value={`${record.video_urls.length} enviado(s)`} />
        )}
        <InfoRow label="Observações visuais" value={record.brand_notes} />
      </Section>
      <Separator />
      <Section title="🎯 Objetivos">
        <InfoRow label="Principal objetivo" value={record.main_goal ? (GOAL_MAP[record.main_goal] || record.main_goal) : null} />
        <InfoRow label="Observações" value={record.additional_notes} />
      </Section>
    </div>
  );
}
