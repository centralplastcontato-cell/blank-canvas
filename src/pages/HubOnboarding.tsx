import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HubLayout } from "@/components/hub/HubLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ClipboardList, Eye, Loader2, Copy, Building2, CheckCircle2, Clock, AlertCircle, Download, Pencil, Save, X, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import jsPDF from "jspdf";

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
  const [isEditing, setIsEditing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchData();
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.rpc("is_admin", { _user_id: user.id });
    setIsAdmin(!!data);
  };

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

  const handleRecordUpdated = (updated: OnboardingRecord) => {
    setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
    setSelectedRecord(updated);
    setIsEditing(false);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <Sheet open={!!selectedRecord} onOpenChange={(open) => { if (!open) { setSelectedRecord(null); setIsEditing(false); } }}>
        <SheetContent className="w-full sm:max-w-lg p-0">
          <SheetHeader className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-left">Detalhes do Onboarding</SheetTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => selectedRecord && exportToPDF(selectedRecord, companies[selectedRecord.company_id])} title="Exportar PDF">
                  <Download className="h-4 w-4" />
                </Button>
                {isAdmin && !isEditing && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditing(true)} title="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {isEditing && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditing(false)} title="Cancelar edição">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </SheetHeader>
          {selectedRecord && (
            <ScrollArea className="h-[calc(100vh-80px)]">
              {isEditing ? (
                <OnboardingEditForm record={selectedRecord} onSave={handleRecordUpdated} onCancel={() => setIsEditing(false)} />
              ) : (
                <OnboardingDetail record={selectedRecord} company={companies[selectedRecord.company_id]} />
              )}
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
                    <>
                      <Button variant="ghost" size="sm" onClick={() => window.open(`/onboarding/${company.slug}`, '_blank')} title="Abrir formulário de onboarding">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => copyLink(company.slug)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </>
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

// ======= PDF Export =======
function exportToPDF(record: OnboardingRecord, company?: CompanyInfo) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  const addTitle = (text: string) => {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(text, 14, y);
    y += 8;
  };

  const addRow = (label: string, value: string | null | undefined) => {
    if (!value) return;
    if (y > 275) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${label}:`, 14, y);
    doc.setFont("helvetica", "bold");
    const lines = doc.splitTextToSize(value, pageWidth - 80);
    doc.text(lines, 70, y);
    y += 6 * Math.max(lines.length, 1);
  };

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Onboarding - " + (record.buffet_name || company?.name || "Sem nome"), 14, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, 14, y);
  y += 12;

  addTitle("Identidade");
  addRow("Nome", record.buffet_name);
  addRow("Cidade", record.city);
  addRow("Estado", record.state);
  addRow("Endereço", record.full_address);
  addRow("Instagram", record.instagram);
  addRow("Site", record.website);
  y += 4;

  addTitle("Contato");
  addRow("Nome", record.contact_name);
  addRow("Cargo", record.contact_role);
  addRow("Telefone", record.contact_phone);
  addRow("E-mail", record.contact_email);
  addRow("Contato secundário", record.secondary_contact);
  y += 4;

  addTitle("Operação");
  addRow("Volume de leads", record.lead_volume);
  addRow("Fontes", record.lead_sources?.join(", "));
  addRow("Atendimento", record.current_service_method);
  y += 4;

  addTitle("Tráfego Pago");
  addRow("Investe?", record.uses_paid_traffic ? "Sim" : "Não");
  addRow("Investimento mensal", record.monthly_investment);
  addRow("Custo por lead", record.cost_per_lead);
  addRow("Agência", record.current_agency);
  y += 4;

  addTitle("WhatsApp");
  addRow("Números", record.whatsapp_numbers?.filter(Boolean).join(", "));
  addRow("Atendentes", record.attendants_count?.toString());
  addRow("Horário", record.service_hours);
  addRow("Múltiplas unidades", record.multiple_units ? "Sim" : "Não");
  y += 4;

  addTitle("Marca");
  if (record.logo_url) addRow("Logo URL", record.logo_url);
  if (record.photo_urls?.length) addRow("Fotos", `${record.photo_urls.length} enviada(s)`);
  if (record.video_urls?.length) addRow("Vídeos", `${record.video_urls.length} enviado(s)`);
  addRow("Observações visuais", record.brand_notes);
  y += 4;

  addTitle("Objetivos");
  addRow("Principal objetivo", record.main_goal ? (GOAL_MAP[record.main_goal] || record.main_goal) : null);
  addRow("Observações", record.additional_notes);

  const fileName = `onboarding-${(record.buffet_name || "buffet").replace(/\s+/g, "-").toLowerCase()}.pdf`;
  doc.save(fileName);
  toast({ title: "PDF exportado!", description: fileName });
}

// ======= Edit Form =======
function OnboardingEditForm({ record, onSave, onCancel }: { record: OnboardingRecord; onSave: (r: OnboardingRecord) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ ...record });
  const [isSaving, setIsSaving] = useState(false);

  const update = (field: keyof OnboardingRecord, value: string | boolean | number | null) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from("company_onboarding")
      .update({
        buffet_name: form.buffet_name,
        city: form.city,
        state: form.state,
        full_address: form.full_address,
        instagram: form.instagram,
        website: form.website,
        contact_name: form.contact_name,
        contact_role: form.contact_role,
        contact_phone: form.contact_phone,
        contact_email: form.contact_email,
        secondary_contact: form.secondary_contact,
        lead_volume: form.lead_volume,
        lead_sources: form.lead_sources,
        current_service_method: form.current_service_method,
        uses_paid_traffic: form.uses_paid_traffic,
        monthly_investment: form.monthly_investment,
        cost_per_lead: form.cost_per_lead,
        current_agency: form.current_agency,
        whatsapp_numbers: form.whatsapp_numbers,
        attendants_count: form.attendants_count,
        service_hours: form.service_hours,
        multiple_units: form.multiple_units,
        brand_notes: form.brand_notes,
        main_goal: form.main_goal,
        additional_notes: form.additional_notes,
      })
      .eq("id", record.id);

    setIsSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Salvo com sucesso!" });
      onSave(form as OnboardingRecord);
    }
  };

  const Field = ({ label, field, type = "text" }: { label: string; field: keyof OnboardingRecord; type?: string }) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        value={(form[field] as string) ?? ""}
        onChange={(e) => update(field, e.target.value || null)}
        type={type}
        className="h-9 text-sm"
      />
    </div>
  );

  const TextareaField = ({ label, field }: { label: string; field: keyof OnboardingRecord }) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Textarea
        value={(form[field] as string) ?? ""}
        onChange={(e) => update(field, e.target.value || null)}
        className="text-sm min-h-[60px]"
      />
    </div>
  );

  const SwitchField = ({ label, field }: { label: string; field: keyof OnboardingRecord }) => (
    <div className="flex items-center justify-between">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <Switch checked={!!form[field]} onCheckedChange={(v) => update(field, v)} />
    </div>
  );

  const ArrayField = ({ label, field }: { label: string; field: keyof OnboardingRecord }) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label} (separados por vírgula)</Label>
      <Input
        value={((form[field] as string[] | null) ?? []).join(", ")}
        onChange={(e) => update(field, e.target.value.split(",").map(s => s.trim()).filter(Boolean) as never)}
        className="h-9 text-sm"
      />
    </div>
  );

  const SectionTitle = ({ title }: { title: string }) => (
    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider pt-2">{title}</h3>
  );

  return (
    <div className="p-4 space-y-4">
      <SectionTitle title="🏰 Identidade" />
      <Field label="Nome do Buffet" field="buffet_name" />
      <Field label="Cidade" field="city" />
      <Field label="Estado" field="state" />
      <Field label="Endereço completo" field="full_address" />
      <Field label="Instagram" field="instagram" />
      <Field label="Site" field="website" />

      <Separator />
      <SectionTitle title="👤 Contato" />
      <Field label="Nome" field="contact_name" />
      <Field label="Cargo" field="contact_role" />
      <Field label="Telefone" field="contact_phone" />
      <Field label="E-mail" field="contact_email" type="email" />
      <Field label="Contato secundário" field="secondary_contact" />

      <Separator />
      <SectionTitle title="📊 Operação" />
      <Field label="Volume de leads" field="lead_volume" />
      <ArrayField label="Fontes de leads" field="lead_sources" />
      <Field label="Método de atendimento" field="current_service_method" />

      <Separator />
      <SectionTitle title="📢 Tráfego Pago" />
      <SwitchField label="Investe em tráfego pago?" field="uses_paid_traffic" />
      <Field label="Investimento mensal" field="monthly_investment" />
      <Field label="Custo por lead" field="cost_per_lead" />
      <Field label="Agência" field="current_agency" />

      <Separator />
      <SectionTitle title="💬 WhatsApp" />
      <ArrayField label="Números de WhatsApp" field="whatsapp_numbers" />
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Atendentes</Label>
        <Input
          type="number"
          value={form.attendants_count ?? ""}
          onChange={(e) => update("attendants_count", e.target.value ? parseInt(e.target.value) : null)}
          className="h-9 text-sm"
        />
      </div>
      <Field label="Horário de atendimento" field="service_hours" />
      <SwitchField label="Múltiplas unidades?" field="multiple_units" />

      <Separator />
      <SectionTitle title="🎨 Marca" />
      <TextareaField label="Observações visuais" field="brand_notes" />

      <Separator />
      <SectionTitle title="🎯 Objetivos" />
      <Field label="Principal objetivo" field="main_goal" />
      <TextareaField label="Observações gerais" field="additional_notes" />

      <div className="flex gap-2 pt-4 pb-8 sticky bottom-0 bg-background">
        <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar alterações
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

// ======= Detail View =======
async function downloadFile(url: string, filename: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
}

function OnboardingDetail({ record }: { record: OnboardingRecord; company?: CompanyInfo }) {
  const buffetName = record.buffet_name?.replace(/\s+/g, "-").toLowerCase() || "buffet";

  const downloadAllPhotos = () => {
    if (!record.photo_urls) return;
    record.photo_urls.forEach((url, i) => {
      setTimeout(() => downloadFile(url, `${buffetName}-foto-${i + 1}.jpg`), i * 400);
    });
  };

  const Section = ({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) => (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
        <span className="text-base">{emoji}</span>
        <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">{title}</h3>
      </div>
      <div className="divide-y divide-border/60">{children}</div>
    </div>
  );

  const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 px-4 py-2.5">
        <span className="text-xs text-muted-foreground w-32 shrink-0 pt-0.5">{label}</span>
        <span className="text-sm text-foreground font-medium flex-1 text-right">{value}</span>
      </div>
    );
  };

  const hasAnyPaidTraffic = record.uses_paid_traffic !== null || record.monthly_investment || record.cost_per_lead || record.current_agency;

  return (
    <div className="p-4 space-y-3 pb-8">

      {/* Identidade */}
      <Section emoji="🏰" title="Identidade">
        <InfoRow label="Nome do Buffet" value={record.buffet_name} />
        <InfoRow label="Cidade" value={record.city} />
        <InfoRow label="Estado" value={record.state} />
        <InfoRow label="Endereço" value={record.full_address} />
        <InfoRow label="Instagram" value={record.instagram} />
        <InfoRow label="Site" value={record.website} />
      </Section>

      {/* Contato */}
      <Section emoji="👤" title="Contato">
        <InfoRow label="Nome" value={record.contact_name} />
        <InfoRow label="Cargo" value={record.contact_role} />
        <InfoRow label="Telefone" value={record.contact_phone} />
        <InfoRow label="E-mail" value={record.contact_email} />
        <InfoRow label="Contato secundário" value={record.secondary_contact} />
      </Section>

      {/* Operação */}
      <Section emoji="📊" title="Operação">
        <InfoRow label="Volume de leads" value={record.lead_volume} />
        <InfoRow label="Fontes" value={record.lead_sources?.join(", ")} />
        <InfoRow label="Atendimento" value={record.current_service_method} />
      </Section>

      {/* Tráfego Pago */}
      {hasAnyPaidTraffic && (
        <Section emoji="📢" title="Tráfego Pago">
          {record.uses_paid_traffic !== null && (
            <InfoRow label="Investe?" value={record.uses_paid_traffic ? "✅ Sim" : "❌ Não"} />
          )}
          <InfoRow label="Invest. mensal" value={record.monthly_investment} />
          <InfoRow label="Custo por lead" value={record.cost_per_lead} />
          <InfoRow label="Agência" value={record.current_agency} />
        </Section>
      )}

      {/* WhatsApp */}
      <Section emoji="💬" title="WhatsApp">
        <InfoRow label="Números" value={record.whatsapp_numbers?.filter(Boolean).join(", ")} />
        <InfoRow label="Atendentes" value={record.attendants_count?.toString()} />
        <InfoRow label="Horário" value={record.service_hours} />
        <InfoRow label="Múltiplas unidades" value={record.multiple_units ? "✅ Sim" : "❌ Não"} />
      </Section>

      {/* Marca */}
      <Section emoji="🎨" title="Marca">
        {record.logo_url ? (
          <div className="px-4 py-3 flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-32 shrink-0">Logo</span>
            <div className="flex items-center gap-2 flex-1 justify-end">
              <img src={record.logo_url} alt="Logo" className="h-14 w-14 rounded-xl object-contain bg-muted border border-border" />
              <div className="flex flex-col gap-1">
                <Button
                  variant="outline" size="icon"
                  className="h-7 w-7"
                  onClick={() => downloadFile(record.logo_url!, `${buffetName}-logo.png`)}
                  title="Baixar logo"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline" size="icon"
                  className="h-7 w-7"
                  onClick={() => window.open(record.logo_url!, "_blank")}
                  title="Abrir em nova aba"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}
        {record.photo_urls && record.photo_urls.length > 0 && (
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Fotos ({record.photo_urls.length})</p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={downloadAllPhotos}
              >
                <Download className="h-3 w-3" />
                Baixar todas
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {record.photo_urls.map((url, i) => (
                <div key={i} className="relative" style={{ paddingBottom: "100%" }}>
                  <img
                    src={url}
                    alt={`Foto ${i + 1}`}
                    className="absolute inset-0 w-full h-full rounded-xl object-cover bg-muted cursor-pointer"
                    onClick={() => window.open(url, "_blank")}
                  />
                  <button
                    className="absolute bottom-1.5 right-1.5 h-7 w-7 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-sm border border-white/20"
                    onClick={(e) => { e.stopPropagation(); downloadFile(url, `${buffetName}-foto-${i + 1}.jpg`); }}
                    title="Baixar foto"
                  >
                    <Download className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {record.video_urls && record.video_urls.length > 0 && (
          <div className="px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Vídeos</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground font-medium">{record.video_urls.length} enviado(s)</span>
              {record.video_urls.map((url, i) => (
                <Button
                  key={i}
                  variant="outline" size="icon"
                  className="h-7 w-7"
                  onClick={() => downloadFile(url, `${buffetName}-video-${i + 1}.mp4`)}
                  title={`Baixar vídeo ${i + 1}`}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              ))}
            </div>
          </div>
        )}
        <InfoRow label="Observações" value={record.brand_notes} />
      </Section>

      {/* Objetivos */}
      <Section emoji="🎯" title="Objetivos">
        <InfoRow label="Objetivo principal" value={record.main_goal ? (GOAL_MAP[record.main_goal] || record.main_goal) : null} />
        {record.additional_notes && (
          <div className="px-4 py-2.5">
            <p className="text-xs text-muted-foreground mb-1">Observações gerais</p>
            <p className="text-sm text-foreground">{record.additional_notes}</p>
          </div>
        )}
      </Section>

    </div>
  );
}
