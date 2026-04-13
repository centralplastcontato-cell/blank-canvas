import { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useCompany } from "@/contexts/CompanyContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import {
  X, Calendar, MapPin, Users, Tag,
  User, Clock, ExternalLink, Image as ImageIcon,
  FileText, Link2, Play, Send, Loader2, ClipboardList
} from "lucide-react";
import { LEAD_STATUS_LABELS } from "@/types/crm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getFormAutomationTemplate, resolveFormAutomationMessage } from "@/lib/formAutomationMessages";

interface ContactInfoSheetProps {
  isOpen: boolean;
  onClose: () => void;
  contactName: string | null;
  contactPhone: string;
  contactPicture: string | null;
  conversationId?: string | null;
  linkedLead: {
    id: string;
    name: string;
    whatsapp: string;
    unit: string | null;
    status: string;
    month: string | null;
    day_of_month: number | null;
    day_preference: string | null;
    guests: string | null;
    observacoes: string | null;
    created_at: string;
    responsavel_id: string | null;
    campaign_name: string | null;
  } | null;
  onOpenLeadDetail?: () => void;
  instanceId?: string | null;
}

interface MediaItem {
  id: string;
  message_type: string;
  media_url: string | null;
  content: string | null;
  timestamp: string;
  from_me: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  novo: "bg-emerald-500",
  em_contato: "bg-blue-500",
  orcamento_enviado: "bg-purple-500",
  aguardando_resposta: "bg-amber-500",
  fechado: "bg-green-600",
  perdido: "bg-red-500",
  transferido: "bg-cyan-500",
  fornecedor: "bg-orange-500",
  retorno: "bg-violet-500",
};

const MEDIA_TYPES = ["image", "video", "sticker"];
const DOC_TYPES = ["document", "audio", "ptt"];

function extractLinks(content: string | null): string[] {
  if (!content) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return content.match(urlRegex) || [];
}

export function ContactInfoSheet({
  isOpen,
  onClose,
  contactName,
  contactPhone,
  contactPicture,
  conversationId,
  linkedLead,
  onOpenLeadDetail,
  instanceId,
}: ContactInfoSheetProps) {
  const { toast } = useToast();
  const { currentCompany } = useCompany();
  const displayName = linkedLead?.name || contactName || contactPhone;
  const statusLabel = linkedLead
    ? (LEAD_STATUS_LABELS as Record<string, string>)[linkedLead.status] || linkedLead.status
    : null;
  const statusColor = linkedLead ? STATUS_COLORS[linkedLead.status] || "bg-muted" : "";

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [linkMessages, setLinkMessages] = useState<{ url: string; timestamp: string }[]>([]);
  const [docItems, setDocItems] = useState<MediaItem[]>([]);
  const [mediaCounts, setMediaCounts] = useState({ media: 0, links: 0, docs: 0 });
  const [showMediaSection, setShowMediaSection] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [clientDataLink, setClientDataLink] = useState<string | null>(null);
  const [clientDataStatus, setClientDataStatus] = useState<string | null>(null);
  const [isSendingLink, setIsSendingLink] = useState(false);

  useEffect(() => {
    if (isOpen && conversationId) {
      fetchMediaCounts(conversationId);
    }
    if (isOpen && linkedLead?.id) {
      fetchClientDataLink(linkedLead.id);
    }
    if (!isOpen) {
      setShowMediaSection(false);
      setClientDataLink(null);
      setClientDataStatus(null);
    }
  }, [isOpen, conversationId, linkedLead?.id]);

  const fetchClientDataLink = async (leadId: string) => {
    // Find event linked to this lead
    const { data: events } = await supabase
      .from("company_events")
      .select("id")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!events?.length) return;

    const { data: req } = await supabase
      .from("client_data_requests")
      .select("token, status")
      .eq("event_id", events[0].id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (req?.length) {
      setClientDataLink(`${window.location.origin}/dados-contratante/${req[0].token}`);
      setClientDataStatus(req[0].status);
    }
  };

  const resolveContractTemplate = (template: string, link: string) => {
    const leadName = linkedLead?.name || contactName || "Cliente";
    const firstName = leadName.split(" ")[0];
    const companyName = currentCompany?.name || "Buffet";

    // Try to get event date from lead's month/day
    let eventDate = "";
    if (linkedLead?.day_of_month && linkedLead?.month) {
      eventDate = `${linkedLead.day_of_month}/${linkedLead.month}`;
    } else if (linkedLead?.day_preference && linkedLead?.month) {
      eventDate = `${linkedLead.day_preference}/${linkedLead.month}`;
    }

    return template
      .replace(/\{\{nome\}\}/gi, leadName)
      .replace(/\{\{primeiro_nome\}\}/gi, firstName)
      .replace(/\{\{empresa\}\}/gi, companyName)
      .replace(/\{\{buffet\}\}/gi, companyName)
      .replace(/\{\{nome_buffet\}\}/gi, companyName)
      .replace(/\{\{data_festa\}\}/gi, eventDate)
      .replace(/\{\{tipo_festa\}\}/gi, "")
      .replace(/\{\{pacote\}\}/gi, "")
      .replace(/\{\{link_formulario_contrato\}\}/gi, link);
  };

  const handleSendClientDataLink = async () => {
    if (!clientDataLink || !instanceId || !contactPhone) return;
    setIsSendingLink(true);
    try {
      let message = `Olá! Segue o link para preenchimento dos dados do contratante:\n\n${clientDataLink}`;

      // Fetch the user's custom template from contract_message_settings
      if (currentCompany?.id) {
        const { data: msgSettings } = await supabase
          .from("contract_message_settings")
          .select("is_enabled, message_template")
          .eq("company_id", currentCompany.id)
          .maybeSingle();

        if (msgSettings?.is_enabled && msgSettings?.message_template) {
          message = resolveContractTemplate(msgSettings.message_template, clientDataLink);
        }
      }

      const { error } = await supabase.functions.invoke("wapi-send", {
        body: {
          action: "send-text",
          phone: contactPhone,
          message,
          conversationId,
          instanceId,
        },
      });
      if (error) throw error;
      toast({ title: "Link enviado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar link", description: err.message, variant: "destructive" });
    } finally {
      setIsSendingLink(false);
    }
  };

  const fetchMediaCounts = async (convId: string) => {
    const { data, error } = await supabase
      .from("wapi_messages")
      .select("id, message_type, media_url, content, timestamp, from_me")
      .eq("conversation_id", convId)
      .order("timestamp", { ascending: false });

    if (error || !data) return;

    const media = data.filter(m => MEDIA_TYPES.includes(m.message_type) && m.media_url);
    const docs = data.filter(m => DOC_TYPES.includes(m.message_type) && m.media_url);
    const links: { url: string; timestamp: string }[] = [];
    data.forEach(m => {
      extractLinks(m.content).forEach(url => links.push({ url, timestamp: m.timestamp }));
    });

    setMediaItems(media);
    setDocItems(docs);
    setLinkMessages(links);
    setMediaCounts({ media: media.length, links: links.length, docs: docs.length });
  };

  const totalMedia = mediaCounts.media + mediaCounts.links + mediaCounts.docs;

  return (
    <>
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md p-0 overflow-hidden">
        <ScrollArea className="h-full">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
            <span className="font-semibold text-base">Dados do contato</span>
          </div>

          <div className="flex flex-col items-center pt-5 pb-4 px-6 bg-gradient-to-b from-muted/30 to-transparent">
            <Avatar className="h-20 w-20 ring-4 ring-background shadow-xl">
              <AvatarImage
                src={contactPicture || undefined}
                alt={displayName}
                referrerPolicy="no-referrer"
              />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h2 className="mt-3 text-lg font-bold text-foreground text-center">{displayName}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{contactPhone}</p>
            {statusLabel && (
              <Badge className={`mt-2 ${statusColor} text-white border-0 px-3 py-0.5 text-xs`}>
                {statusLabel}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Lead Info Cards */}
          {linkedLead ? (
            <div className="px-5 py-5 space-y-4">
              <div className="space-y-3">
                <InfoRow icon={<MapPin className="w-4 h-4" />} label="Unidade" value={linkedLead.unit || "Não informado"} />
                <InfoRow
                  icon={<Calendar className="w-4 h-4" />}
                  label="Data preferência"
                  value={`${linkedLead.day_of_month || linkedLead.day_preference || "-"} / ${linkedLead.month || "-"}`}
                />
                <InfoRow icon={<Users className="w-4 h-4" />} label="Convidados" value={linkedLead.guests || "Não informado"} />
                <InfoRow icon={<Tag className="w-4 h-4" />} label="Campanha" value={linkedLead.campaign_name || "-"} />
                <InfoRow
                  icon={<Clock className="w-4 h-4" />}
                  label="Capturado em"
                  value={format(new Date(linkedLead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                />
              </div>

              {linkedLead.observacoes && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Observações</p>
                    <p className="text-sm text-foreground/80 leading-relaxed bg-muted/30 rounded-xl p-3">
                      {linkedLead.observacoes}
                    </p>
                  </div>
                </>
              )}

              {/* Client Data Link - Send via WhatsApp */}
              {clientDataLink && (
                <>
                  <Separator />
                   <div className="space-y-2 w-full max-w-full min-w-0 overflow-hidden box-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados do Contratante</p>
                      <div className="w-full max-w-full min-w-0 rounded-xl border border-border/60 bg-card overflow-hidden box-border">
                        <div className="flex min-w-0 max-w-full items-center gap-2.5 px-3 py-2.5 box-border">
                          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0 box-border">
                            <ClipboardList className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 max-w-full flex-1 box-border">
                            <p className="text-sm font-medium text-foreground">Formulário de dados</p>
                            <p className="text-[11px] text-muted-foreground">
                              {clientDataStatus === "completed" 
                                ? "✅ Preenchido" 
                                : "⏳ Aguardando preenchimento"}
                            </p>
                          </div>
                        </div>
                        <div className="w-full max-w-full min-w-0 px-3 py-2 border-t border-border/40 bg-muted/20 box-border overflow-hidden">
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full max-w-full gap-2 rounded-lg h-8 text-xs box-border"
                            disabled={isSendingLink || !instanceId}
                            onClick={handleSendClientDataLink}
                          >
                            {isSendingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            Enviar link para o lead
                          </Button>
                        </div>
                      </div>
                    </div>
                </>
              )}

              {onOpenLeadDetail && (
                <>
                  <Separator />
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      onOpenLeadDetail();
                      onClose();
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver detalhes completos do lead
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="px-5 py-8 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                <User className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Nenhum lead vinculado a este contato.
              </p>
            </div>
          )}

          {/* Media, Links & Docs Button */}
          {conversationId && (
            <>
              <Separator />
              <div className="px-5 py-3">
                <Button
                  variant="outline"
                  className="w-full gap-2 justify-between rounded-xl h-10"
                  onClick={() => setShowMediaSection(!showMediaSection)}
                >
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Mídia, links e docs</span>
                  </div>
                  <Badge variant="secondary" className="text-xs px-2 py-0">{totalMedia}</Badge>
                </Button>
              </div>

              {showMediaSection && (
                <div className="px-5 pb-5">
                  <Tabs defaultValue="media" className="w-full">
                    <TabsList className="w-full grid grid-cols-3 h-9">
                      <TabsTrigger value="media" className="text-xs">
                        Mídia ({mediaCounts.media})
                      </TabsTrigger>
                      <TabsTrigger value="links" className="text-xs">
                        Links ({mediaCounts.links})
                      </TabsTrigger>
                      <TabsTrigger value="docs" className="text-xs">
                        Docs ({mediaCounts.docs})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="media" className="mt-3">
                      {mediaItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Nenhuma mídia</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-1.5">
                          {mediaItems.slice(0, 30).map((item) => (
                            <div
                              key={item.id}
                              className="aspect-square rounded-lg overflow-hidden bg-muted/50 cursor-pointer hover:opacity-80 transition-opacity relative"
                              onClick={() => {
                                const imageUrls = mediaItems.filter(m => m.message_type !== "video" && m.media_url).map(m => m.media_url!);
                                const idx = imageUrls.indexOf(item.media_url!);
                                if (idx >= 0) setLightboxIndex(idx);
                              }}
                            >
                              {item.message_type === "video" ? (
                                <div className="w-full h-full flex items-center justify-center bg-muted">
                                  <Play className="w-6 h-6 text-muted-foreground" />
                                </div>
                              ) : (
                                <img
                                  src={item.media_url || ""}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="links" className="mt-3">
                      {linkMessages.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Nenhum link</p>
                      ) : (
                        <div className="space-y-2">
                          {linkMessages.slice(0, 30).map((item, i) => (
                            <a
                              key={i}
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                            >
                              <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
                                <Link2 className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-primary truncate group-hover:underline">{item.url}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {format(new Date(item.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </p>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="docs" className="mt-3">
                      {docItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Nenhum documento</p>
                      ) : (
                        <div className="space-y-2">
                          {docItems.slice(0, 30).map((item) => (
                            <a
                              key={item.id}
                              href={item.media_url || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
                                <FileText className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-foreground truncate">
                                  {item.content || item.message_type}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {format(new Date(item.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </p>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
    {lightboxIndex !== null && (
      <ImageLightbox
        images={mediaItems.filter(m => m.message_type !== "video" && m.media_url).map(m => m.media_url!)}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    )}
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-muted/30 transition-colors">
      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
