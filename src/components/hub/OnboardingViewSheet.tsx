import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2, User, Phone, Mail, Globe, Instagram, MapPin,
  MessageSquare, Users, Clock, Package, Sparkles, FileText,
  Image, Video, Target, ClipboardList
} from "lucide-react";

interface OnboardingViewSheetProps {
  companyId: string | null;
  companyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OnboardingRecord {
  [key: string]: any;
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  if (!value || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium break-words">{value}</div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const hasContent = Array.isArray(children)
    ? children.some(c => c !== null && c !== undefined && c !== false)
    : !!children;
  if (!hasContent) return null;
  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-3 pb-1">{title}</h3>
      <Separator className="mb-2" />
      <div>{children}</div>
    </div>
  );
}

export function OnboardingViewSheet({ companyId, companyName, open, onOpenChange }: OnboardingViewSheetProps) {
  const [data, setData] = useState<OnboardingRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !companyId) return;
    setLoading(true);
    supabase
      .from("company_onboarding")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data: rec, error }) => {
        if (error) console.error('[OnboardingViewSheet]', error);
        setData(rec as any);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[OnboardingViewSheet] fetch error:', err);
        setLoading(false);
      });
  }, [open, companyId]);

  const opData = data?.operational_data as Record<string, any> | null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Onboarding — {companyName}
          </SheetTitle>
          {data && (
            <Badge variant={data.status === 'completo' ? 'default' : 'secondary'} className="w-fit">
              {data.status === 'completo' ? 'Completo' : data.status === 'em_andamento' ? 'Em andamento' : 'Pendente'}
            </Badge>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] px-6 pb-6">
          {loading ? (
            <div className="flex justify-center py-12 text-muted-foreground text-sm">Carregando...</div>
          ) : !data ? (
            <div className="flex justify-center py-12 text-muted-foreground text-sm">Nenhum onboarding encontrado.</div>
          ) : (
            <div className="space-y-4 pb-8">
              <Section title="Dados do Buffet">
                <InfoRow icon={Building2} label="Nome do buffet" value={data.buffet_name} />
                <InfoRow icon={MapPin} label="Cidade / Estado" value={[data.city, data.state].filter(Boolean).join(" — ")} />
                <InfoRow icon={MapPin} label="Endereço completo" value={data.full_address} />
                <InfoRow icon={Instagram} label="Instagram" value={data.instagram} />
                <InfoRow icon={Globe} label="Website" value={data.website} />
              </Section>

              <Section title="Contato">
                <InfoRow icon={User} label="Responsável" value={data.contact_name} />
                <InfoRow icon={User} label="Cargo" value={data.contact_role} />
                <InfoRow icon={Phone} label="Telefone" value={data.contact_phone} />
                <InfoRow icon={Mail} label="E-mail" value={data.contact_email} />
                <InfoRow icon={User} label="Contato secundário" value={data.secondary_contact} />
              </Section>

              <Section title="Objetivo">
                <InfoRow icon={Target} label="Objetivo principal" value={data.main_goal} />
                <InfoRow icon={FileText} label="Observações adicionais" value={data.additional_notes} />
              </Section>

              <Section title="Captação de Leads">
                <InfoRow icon={MessageSquare} label="Volume de leads" value={data.lead_volume} />
                <InfoRow icon={ClipboardList} label="Fontes de leads" value={
                  data.lead_sources?.length ? data.lead_sources.join(", ") : null
                } />
                <InfoRow icon={MessageSquare} label="Método de atendimento" value={data.current_service_method} />
                <InfoRow icon={ClipboardList} label="Sistema de automação" value={
                  data.has_automation_system ? (data.automation_system_name || "Sim") : "Não"
                } />
              </Section>

              <Section title="Tráfego Pago">
                <InfoRow icon={Target} label="Usa tráfego pago" value={data.uses_paid_traffic ? "Sim" : "Não"} />
                <InfoRow icon={Target} label="Investimento mensal" value={data.monthly_investment} />
                <InfoRow icon={Target} label="Custo por lead" value={data.cost_per_lead} />
                <InfoRow icon={Building2} label="Agência atual" value={data.current_agency} />
              </Section>

              <Section title="Operação">
                <InfoRow icon={MessageSquare} label="WhatsApp(s)" value={
                  data.whatsapp_numbers?.length ? data.whatsapp_numbers.filter(Boolean).join(", ") : null
                } />
                <InfoRow icon={Users} label="Qtd. de atendentes" value={data.attendants_count?.toString()} />
                <InfoRow icon={Clock} label="Horário de atendimento" value={data.service_hours} />
                <InfoRow icon={Building2} label="Múltiplas unidades" value={data.multiple_units ? "Sim" : "Não"} />
                <InfoRow icon={FileText} label="Formato de orçamento" value={data.budget_format} />
              </Section>

              <Section title="Marca e Identidade">
                {data.logo_url && (
                  <div className="py-2">
                    <p className="text-xs text-muted-foreground mb-1">Logo</p>
                    <img src={data.logo_url} alt="Logo" className="h-16 w-16 object-contain rounded-lg border" />
                  </div>
                )}
                <InfoRow icon={FileText} label="Observações de marca" value={data.brand_notes} />
                {data.photo_urls?.length > 0 && (
                  <div className="py-2">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Image className="h-3.5 w-3.5" /> Fotos ({data.photo_urls.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {data.photo_urls.map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`Foto ${i + 1}`} className="h-20 w-20 object-cover rounded-lg border hover:opacity-80 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {data.video_urls?.length > 0 && (
                  <div className="py-2">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Video className="h-3.5 w-3.5" /> Vídeos ({data.video_urls.length})</p>
                    <div className="space-y-1">
                      {data.video_urls.map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline block truncate">{url}</a>
                      ))}
                    </div>
                  </div>
                )}
              </Section>

              {opData && (
                <>
                  {opData.event_types?.length > 0 && (
                    <Section title="Tipos de Festa">
                      <div className="flex flex-wrap gap-1.5 py-1">
                        {opData.event_types.map((t: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    </Section>
                  )}

                  {opData.packages?.length > 0 && (
                    <Section title="Pacotes">
                      <div className="flex flex-wrap gap-1.5 py-1">
                        {opData.packages.map((p: any, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            <Package className="h-3 w-3 mr-1" />
                            {typeof p === 'string' ? p : p.name || `Pacote ${i + 1}`}
                          </Badge>
                        ))}
                      </div>
                    </Section>
                  )}

                  {opData.guest_ranges?.length > 0 && (
                    <Section title="Faixas de Convidados">
                      <div className="flex flex-wrap gap-1.5 py-1">
                        {opData.guest_ranges.map((g: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">{g}</Badge>
                        ))}
                      </div>
                    </Section>
                  )}

                  {opData.party_schedules?.length > 0 && (
                    <Section title="Horários de Festa">
                      <div className="space-y-1 py-1">
                        {opData.party_schedules.map((s: any, i: number) => (
                          <div key={i} className="text-sm">
                            <span className="font-medium">{s.label}</span>
                            {s.start && s.end && <span className="text-muted-foreground ml-2">{s.start} às {s.end}</span>}
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {opData.weekdays?.length > 0 && (
                    <Section title="Dias de Funcionamento">
                      <div className="flex flex-wrap gap-1.5 py-1">
                        {opData.weekdays.map((d: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">{d}</Badge>
                        ))}
                      </div>
                    </Section>
                  )}

                  {opData.optionals?.length > 0 && (
                    <Section title="Opcionais">
                      <div className="space-y-1 py-1">
                        {opData.optionals.filter((o: any) => o.name).map((o: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span>{o.name}</span>
                            {o.value && <span className="text-muted-foreground">R$ {o.value}</span>}
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {opData.differentials?.length > 0 && (
                    <Section title="Diferenciais">
                      <div className="flex flex-wrap gap-1.5 py-1">
                        {opData.differentials.filter(Boolean).map((d: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs"><Sparkles className="h-3 w-3 mr-1" />{d}</Badge>
                        ))}
                      </div>
                    </Section>
                  )}

                  {(opData.company_legal_name || opData.cnpj || opData.bank_info) && (
                    <Section title="Dados Contratuais">
                      <InfoRow icon={Building2} label="Razão social" value={opData.company_legal_name} />
                      <InfoRow icon={FileText} label="CNPJ" value={opData.cnpj} />
                      <InfoRow icon={FileText} label="Dados bancários" value={opData.bank_info} />
                    </Section>
                  )}

                  {opData.attendants?.length > 0 && (
                    <Section title="Atendentes Cadastrados">
                      <div className="space-y-2 py-1">
                        {opData.attendants.filter((a: any) => a.name).map((a: any, i: number) => (
                          <div key={i} className="p-2 rounded-lg border border-border/60 bg-muted/20 text-sm space-y-0.5">
                            <p className="font-medium">{a.name}</p>
                            {a.email && <p className="text-xs text-muted-foreground">{a.email}</p>}
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}
                </>
              )}

              <div className="pt-2 text-[10px] text-muted-foreground">
                Atualizado em {new Date(data.updated_at).toLocaleString("pt-BR")}
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
