import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { insertWithCompany } from "@/lib/supabase-helpers";
import {
  Lead,
  LeadHistory,
  MessageTemplate,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  LeadStatus,
} from "@/types/crm";
import { UserWithRole } from "@/types/crm";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  User,
  Calendar,
  MapPin,
  Users,
  Clock,
  Save,
  Loader2,
  History,
  Send,
  CheckCircle,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface LeadDetailSheetProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  responsaveis: UserWithRole[];
  currentUserId: string;
  currentUserName: string;
  canEdit: boolean;
  canDelete?: boolean;
  onDelete?: (leadId: string) => Promise<void>;
}

export function LeadDetailSheet({
  lead,
  isOpen,
  onClose,
  onUpdate,
  responsaveis,
  currentUserId,
  currentUserName,
  canEdit,
  canDelete,
  onDelete,
}: LeadDetailSheetProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<LeadStatus>("novo");
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<LeadHistory[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState<string | null>(null);
  const [wapiInstance, setWapiInstance] = useState<{ instance_id: string; instance_token: string; id: string } | null>(null);

  // Navigate to WhatsApp chat with this lead's phone
  const openWhatsAppChat = () => {
    const cleanPhone = lead?.whatsapp.replace(/\D/g, '') || '';
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    // If we're already on the Central de Atendimento page, just use URL params
    if (location.pathname === '/atendimento') {
      // Close the sheet first and let the parent handle the navigation
      onClose();
      navigate(`/atendimento?phone=${phoneWithCountry}`, { replace: true });
    } else {
      // Navigate to Central de Atendimento with phone parameter
      navigate(`/atendimento?phone=${phoneWithCountry}`);
    }
  };

  useEffect(() => {
    if (lead) {
      setStatus(lead.status);
      setResponsavelId(lead.responsavel_id || "");
      setObservacoes(lead.observacoes || "");
      fetchHistory(lead.id);
      fetchTemplates();
      fetchWapiInstance(lead.unit);
    }
  }, [lead]);

  const fetchWapiInstance = async (unit: string | null) => {
    // Fetch W-API instance for the lead's unit
    let query = supabase.from('wapi_instances').select('id, instance_id, instance_token, unit, status');
    
    if (unit) {
      // Try to find instance for this specific unit
      const { data: unitInstance } = await query.eq('unit', unit).eq('status', 'connected').limit(1).single();
      if (unitInstance) {
        setWapiInstance(unitInstance);
        return;
      }
    }
    
    // Fallback: any connected instance
    const { data: anyInstance } = await supabase
      .from('wapi_instances')
      .select('id, instance_id, instance_token, unit, status')
      .eq('status', 'connected')
      .limit(1)
      .single();
    
    setWapiInstance(anyInstance || null);
  };

  const fetchHistory = async (leadId: string) => {
    setIsLoadingHistory(true);
    const { data, error } = await supabase
      .from("lead_history")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setHistory(data as LeadHistory[]);
    }
    setIsLoadingHistory(false);
  };

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("message_templates")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (!error && data) {
      setTemplates(data as MessageTemplate[]);
    }
  };

  const addHistoryEntry = async (
    leadId: string,
    action: string,
    oldValue: string | null,
    newValue: string | null
  ) => {
    await insertWithCompany("lead_history", {
      lead_id: leadId,
      user_id: currentUserId,
      user_name: currentUserName,
      action,
      old_value: oldValue,
      new_value: newValue,
    });
  };

  const handleSave = async () => {
    if (!lead || !canEdit) return;

    setIsSaving(true);

    try {
      // Track changes for history
      if (status !== lead.status) {
        await addHistoryEntry(
          lead.id,
          "Alteração de status",
          LEAD_STATUS_LABELS[lead.status],
          LEAD_STATUS_LABELS[status]
        );
      }

      if (responsavelId !== (lead.responsavel_id || "")) {
        const oldResponsavel = responsaveis.find(
          (r) => r.user_id === lead.responsavel_id
        );
        const newResponsavel = responsaveis.find(
          (r) => r.user_id === responsavelId
        );
        await addHistoryEntry(
          lead.id,
          "Alteração de responsável",
          oldResponsavel?.full_name || "Não atribuído",
          newResponsavel?.full_name || "Não atribuído"
        );
      }

      if (observacoes !== (lead.observacoes || "")) {
        await addHistoryEntry(lead.id, "Atualização de observações", null, null);
      }

      // Update lead
      const { error } = await supabase
        .from("campaign_leads")
        .update({
          status,
          responsavel_id: responsavelId || null,
          observacoes: observacoes || null,
        })
        .eq("id", lead.id);

      if (error) throw error;

      toast({
        title: "Lead atualizado",
        description: "As alterações foram salvas com sucesso.",
      });

      onUpdate();
      fetchHistory(lead.id);
    } catch (error: any) {
      console.error("Error updating lead:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatWhatsAppLink = (phone: string, message?: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const phoneWithCountry = cleanPhone.startsWith("55")
      ? cleanPhone
      : `55${cleanPhone}`;
    const baseUrl = `https://wa.me/${phoneWithCountry}`;
    return message ? `${baseUrl}?text=${encodeURIComponent(message)}` : baseUrl;
  };

  const formatPhoneForWapi = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    return cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  };

  const processTemplate = (template: string) => {
    if (!lead) return template;

    return template
      .replace(/\{\{nome\}\}/g, lead.name || "")
      .replace(/\{\{mes\}\}/g, lead.month || "")
      .replace(/\{\{dia\}\}/g, String(lead.day_of_month || lead.day_preference || ""))
      .replace(/\{\{convidados\}\}/g, lead.guests || "")
      .replace(/\{\{campanha\}\}/g, lead.campaign_name || lead.campaign_id || "")
      .replace(/\{\{unidade\}\}/g, lead.unit || "");
  };

  const sendDirectMessage = async (templateId: string, message: string) => {
    if (!lead || !wapiInstance) return;

    setSendingTemplate(templateId);

    try {
      const phone = formatPhoneForWapi(lead.whatsapp);
      
      const { data, error } = await supabase.functions.invoke('wapi-send', {
        body: {
          action: 'send-text',
          phone,
          message,
          instanceId: wapiInstance.instance_id,
          instanceToken: wapiInstance.instance_token,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Log to history
      await addHistoryEntry(
        lead.id,
        "Mensagem enviada via WhatsApp",
        null,
        message.substring(0, 100) + (message.length > 100 ? "..." : "")
      );

      toast({
        title: "Mensagem enviada!",
        description: "A mensagem foi enviada diretamente pelo WhatsApp.",
      });

      fetchHistory(lead.id);
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message || "Tente novamente ou abra o WhatsApp Web.",
        variant: "destructive",
      });
    } finally {
      setSendingTemplate(null);
    }
  };

  if (!lead) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {lead.name}
          </SheetTitle>
          <SheetDescription>
            Lead capturado em{" "}
            {format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", {
              locale: ptBR,
            })}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Lead Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{lead.unit || "Não informado"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>
                {lead.day_of_month || lead.day_preference || "-"}/{lead.month || "-"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>{lead.guests || "Não informado"} convidados</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge className="bg-primary/10 text-primary">
                {lead.campaign_id}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* WhatsApp Actions */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Contato via WhatsApp
              {wapiInstance && (
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Conectado
                </Badge>
              )}
            </Label>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={openWhatsAppChat}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Abrir Conversa ({lead.whatsapp})
            </Button>

            {templates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground flex items-center gap-2">
                  Mensagens rápidas:
                  {wapiInstance ? (
                    <span className="text-xs text-green-600">(envio direto)</span>
                  ) : (
                    <span className="text-xs text-muted-foreground/70">(abre WhatsApp Web)</span>
                  )}
                </Label>
                <div className="grid gap-2">
                  {templates.map((t) => {
                    const isSending = sendingTemplate === t.id;
                    const processedMessage = processTemplate(t.template);
                    
                    if (wapiInstance) {
                      // Direct send via W-API
                      return (
                        <Button
                          key={t.id}
                          variant="secondary"
                          size="sm"
                          className="justify-start text-left h-auto py-2"
                          onClick={() => sendDirectMessage(t.id, processedMessage)}
                          disabled={isSending}
                        >
                          {isSending ? (
                            <Loader2 className="w-4 h-4 mr-2 flex-shrink-0 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 mr-2 flex-shrink-0" />
                          )}
                          <span className="truncate">{t.name}</span>
                        </Button>
                      );
                    }
                    
                    // Fallback: Open WhatsApp Web
                    return (
                      <Button
                        key={t.id}
                        variant="secondary"
                        size="sm"
                        className="justify-start text-left h-auto py-2"
                        asChild
                      >
                        <a
                          href={formatWhatsAppLink(lead.whatsapp, processedMessage)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Send className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{t.name}</span>
                        </a>
                      </Button>
                    );
                  })}
                </div>
                
                {!wapiInstance && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Conecte uma instância W-API para envio direto
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Status & Responsável */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as LeadStatus)}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            LEAD_STATUS_COLORS[value as LeadStatus]
                          }`}
                        />
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select
                value={responsavelId || "none"}
                onValueChange={(v) => setResponsavelId(v === "none" ? "" : v)}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não atribuído</SelectItem>
                  {responsaveis.map((r) => (
                    <SelectItem key={r.user_id} value={r.user_id}>
                      {r.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações internas</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Adicione notas sobre este lead..."
              rows={4}
              disabled={!canEdit}
            />
          </div>

          {canEdit && (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Alterações
              </Button>
              
              {canDelete && onDelete && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Tem certeza que deseja excluir o lead "${lead.name}"? Esta ação não pode ser desfeita.`)) {
                      onDelete(lead.id);
                      onClose();
                    }
                  }}
                  title="Excluir lead"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}

          <Separator />

          {/* History */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico
            </Label>

            {isLoadingHistory ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum histórico registrado.
              </p>
            ) : (
              <ScrollArea className="h-48">
                <div className="space-y-3 pr-4">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="border-l-2 border-muted pl-3 py-1"
                    >
                      <p className="text-sm font-medium">{h.action}</p>
                      {h.old_value && h.new_value && (
                        <p className="text-xs text-muted-foreground">
                          {h.old_value} → {h.new_value}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(h.created_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                        {h.user_name && ` • ${h.user_name}`}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
