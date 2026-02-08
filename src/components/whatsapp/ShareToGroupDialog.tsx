import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Search, UsersRound, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Lead {
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
}

interface Group {
  id: string;
  remote_jid: string;
  contact_name: string | null;
  instance_id: string;
}

interface WapiInstance {
  id: string;
  instance_id: string;
  instance_token: string;
}

interface ShareToGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  groups: Group[];
  instances: WapiInstance[];
}

export function ShareToGroupDialog({
  open,
  onOpenChange,
  lead,
  groups,
  instances,
}: ShareToGroupDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [customMessage, setCustomMessage] = useState("");

  // Generate default message template
  const defaultMessage = useMemo(() => {
    const lines = [
      `📋 *Novo Lead para Atendimento*`,
      ``,
      `👤 *Nome:* ${lead.name}`,
      `📱 *WhatsApp:* ${lead.whatsapp}`,
    ];

    if (lead.unit) {
      lines.push(`📍 *Unidade:* ${lead.unit}`);
    }

    if (lead.month) {
      const dateInfo = [lead.month];
      if (lead.day_of_month) dateInfo.push(`dia ${lead.day_of_month}`);
      if (lead.day_preference) dateInfo.push(lead.day_preference);
      lines.push(`📅 *Data:* ${dateInfo.join(' • ')}`);
    }

    if (lead.guests) {
      lines.push(`👥 *Convidados:* ${lead.guests}`);
    }

    const statusLabels: Record<string, string> = {
      novo: 'Novo',
      em_contato: 'Visita Agendada',
      orcamento_enviado: 'Orçamento Enviado',
      aguardando_resposta: 'Negociando',
      fechado: 'Fechado',
      perdido: 'Perdido',
      transferido: 'Transferência',
    };
    lines.push(`📊 *Status:* ${statusLabels[lead.status] || lead.status}`);

    if (lead.observacoes) {
      lines.push(``);
      lines.push(`📝 *Observações:* ${lead.observacoes}`);
    }

    return lines.join('\n');
  }, [lead]);

  // Initialize custom message when dialog opens
  useState(() => {
    if (open && !customMessage) {
      setCustomMessage(defaultMessage);
    }
  });

  // Reset on open
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setCustomMessage(defaultMessage);
      setSelectedGroup(null);
      setSearchQuery("");
    }
    onOpenChange(newOpen);
  };

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const query = searchQuery.toLowerCase();
    return groups.filter(g => 
      g.contact_name?.toLowerCase().includes(query) ||
      g.remote_jid.toLowerCase().includes(query)
    );
  }, [groups, searchQuery]);

  const handleSend = async () => {
    if (!selectedGroup || !customMessage.trim()) return;

    const instance = instances.find(i => i.id === selectedGroup.instance_id);
    if (!instance) {
      toast({
        title: "Erro",
        description: "Instância não encontrada para este grupo.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('wapi-send', {
        body: {
          instanceId: instance.instance_id,
          instanceToken: instance.instance_token,
          remoteJid: selectedGroup.remote_jid,
          message: customMessage.trim(),
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Falha ao enviar mensagem');
      }

      toast({
        title: "Enviado!",
        description: `Lead compartilhado no grupo "${selectedGroup.contact_name || 'Grupo'}"`,
      });

      handleOpenChange(false);
    } catch (error) {
      console.error('Error sending to group:', error);
      toast({
        title: "Erro ao enviar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersRound className="w-5 h-5 text-primary" />
            Compartilhar Lead em Grupo
          </DialogTitle>
          <DialogDescription>
            Envie as informações de {lead.name} para um grupo de WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Group search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar grupo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Group list */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Selecione um grupo:</Label>
            <ScrollArea className="h-40 border rounded-md">
              {filteredGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                  <UsersRound className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "Nenhum grupo encontrado" : "Nenhum grupo disponível"}
                  </p>
                </div>
              ) : (
                <div className="p-1">
                  {filteredGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroup(group)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                        "hover:bg-accent",
                        selectedGroup?.id === group.id 
                          ? "bg-primary/10 text-primary font-medium" 
                          : "text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <UsersRound className="w-4 h-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {group.contact_name || group.remote_jid.split('@')[0]}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Message preview */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Mensagem:</Label>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Mensagem para enviar..."
              className="min-h-[120px] text-sm resize-none"
            />
          </div>

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={!selectedGroup || !customMessage.trim() || isSending}
            className="w-full gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar para Grupo
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
