import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Search, UsersRound, Loader2, Send } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DEFAULT_SCHEDULE_GROUP_MESSAGE } from "@/components/whatsapp/settings/ScheduleGroupMessageCard";

interface ScheduleData {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  event_ids: string[];
  slug: string | null;
  notes: string | null;
}

interface Group {
  id: string;
  remote_jid: string;
  contact_name: string | null;
  instance_id: string;
}

interface Instance {
  id: string;
  instance_id: string;
  phone_number: string | null;
  unit: string | null;
}

interface SendScheduleToGroupsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: ScheduleData;
  companyId: string;
  companySlug?: string;
  customDomain?: string | null;
}

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function SendScheduleToGroupsDialog({
  open,
  onOpenChange,
  schedule,
  companyId,
  companySlug,
  customDomain,
}: SendScheduleToGroupsDialogProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; waiting: boolean } | null>(null);

  // Build the public link for this schedule
  const publicLink = useMemo(() => {
    const domain = customDomain || window.location.origin;
    const slug = schedule.slug || schedule.id;
    const path = companySlug ? `/escala/${companySlug}/${slug}` : `/escala/${schedule.id}`;
    return `${domain}${path}`;
  }, [schedule, companySlug, customDomain]);

  // Build message from template
  const buildMessage = (template: string) => {
    const startStr = format(parseISO(schedule.start_date), "dd/MM", { locale: ptBR });
    const endStr = format(parseISO(schedule.end_date), "dd/MM", { locale: ptBR });

    return template
      .replace(/\{titulo\}/g, schedule.title)
      .replace(/\{periodo\}/g, `${startStr} a ${endStr}`)
      .replace(/\{qtd_festas\}/g, String(schedule.event_ids.length))
      .replace(/\{link\}/g, publicLink)
      .replace(/\{observacoes\}/g, schedule.notes || "");
  };

  useEffect(() => {
    if (!open) return;
    setSelectedGroupIds(new Set());
    setSearchQuery("");
    setSending(false);
    setProgress(null);
    loadData();
  }, [open]);

  const loadData = async () => {
    setLoading(true);

    // Fetch connected instances (READ-ONLY)
    const { data: instData } = await supabase
      .from("wapi_instances")
      .select("id, instance_id, phone_number, unit")
      .eq("company_id", companyId)
      .eq("status", "connected");

    const insts = instData || [];
    setInstances(insts);

    if (insts.length === 0) {
      setGroups([]);
      setLoading(false);
      setMessage(buildMessage(DEFAULT_SCHEDULE_GROUP_MESSAGE));
      return;
    }

    // Fetch group conversations (READ-ONLY)
    const instanceIds = insts.map((i) => i.id);
    const { data: convData } = await supabase
      .from("wapi_conversations")
      .select("id, remote_jid, contact_name, instance_id")
      .in("instance_id", instanceIds)
      .like("remote_jid", "%@g.us");

    setGroups((convData as Group[]) || []);

    // Fetch template from company settings
    const { data: compData } = await supabase
      .from("companies")
      .select("settings")
      .eq("id", companyId)
      .single();

    const settings = compData?.settings as Record<string, any> | null;
    const template =
      typeof settings?.freelancer_schedule_group_message === "string"
        ? settings.freelancer_schedule_group_message
        : DEFAULT_SCHEDULE_GROUP_MESSAGE;

    setMessage(buildMessage(template));
    setLoading(false);
  };

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase();
    return groups.filter(
      (g) =>
        g.contact_name?.toLowerCase().includes(q) ||
        g.remote_jid.toLowerCase().includes(q)
    );
  }, [groups, searchQuery]);

  const toggleGroup = (id: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedGroupIds.size === filteredGroups.length) {
      setSelectedGroupIds(new Set());
    } else {
      setSelectedGroupIds(new Set(filteredGroups.map((g) => g.id)));
    }
  };

  const handleSend = async () => {
    if (selectedGroupIds.size === 0 || !message.trim()) return;

    const selectedGroups = groups.filter((g) => selectedGroupIds.has(g.id));
    setSending(true);
    setProgress({ current: 0, total: selectedGroups.length, waiting: false });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < selectedGroups.length; i++) {
      const group = selectedGroups[i];

      if (i > 0) {
        setProgress({ current: i, total: selectedGroups.length, waiting: true });
        await randomDelay(1000, 3000);
      }

      setProgress({ current: i + 1, total: selectedGroups.length, waiting: false });

      const instance = instances.find((inst) => inst.id === group.instance_id);
      if (!instance) {
        errorCount++;
        continue;
      }

      try {
        const { error } = await supabase.functions.invoke("wapi-send", {
          body: {
            action: "send-text",
            instanceId: instance.instance_id,
            phone: group.remote_jid,
            message: message.trim(),
          },
        });

        if (error) {
          console.error(`Failed to send to group ${group.contact_name}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`Error sending to group:`, err);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast({
        title: `Enviado para ${successCount} grupo${successCount > 1 ? "s" : ""}!`,
        description: errorCount > 0 ? `${errorCount} falha(s).` : undefined,
      });
    } else {
      toast({
        title: "Erro ao enviar",
        description: "Nenhuma mensagem foi enviada com sucesso.",
        variant: "destructive",
      });
    }

    setSending(false);
    setProgress(null);
    onOpenChange(false);
  };

  const progressPercent = progress
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={sending ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] flex flex-col overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersRound className="w-5 h-5 text-primary" />
            Enviar Escala para Grupos
          </DialogTitle>
          <DialogDescription>
            Selecione os grupos e envie a escala "{schedule.title}" via WhatsApp.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : sending ? (
          <div className="space-y-4 py-4">
            <p className="text-sm font-medium">
              Enviando {progress?.current || 0} de {progress?.total || 0}...
            </p>
            <Progress value={progressPercent} className="h-2" />
            {progress?.waiting && (
              <p className="text-xs text-muted-foreground animate-pulse">
                Aguardando intervalo de segurança...
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
            {instances.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Nenhuma instância de WhatsApp conectada.
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar grupo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Select all */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    {selectedGroupIds.size} de {filteredGroups.length} selecionado(s)
                  </Label>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={toggleAll}>
                    {selectedGroupIds.size === filteredGroups.length ? "Desmarcar todos" : "Selecionar todos"}
                  </Button>
                </div>

                {/* Group list */}
                <ScrollArea className="h-36 sm:h-44 border rounded-md">
                  {filteredGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                      <UsersRound className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? "Nenhum grupo encontrado" : "Nenhum grupo disponível"}
                      </p>
                    </div>
                  ) : (
                    <div className="p-1 space-y-0.5">
                      {filteredGroups.map((group) => {
                        const inst = instances.find((i) => i.id === group.instance_id);
                        const instanceLabel = inst?.unit || (inst?.phone_number ? `…${inst.phone_number.slice(-4)}` : null);
                        return (
                          <label
                            key={group.id}
                            className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-md text-sm hover:bg-accent cursor-pointer transition-colors"
                          >
                            <Checkbox
                              checked={selectedGroupIds.has(group.id)}
                              onCheckedChange={() => toggleGroup(group.id)}
                            />
                            <UsersRound className="w-4 h-4 shrink-0 text-muted-foreground" />
                            <span className="truncate flex-1">
                              {group.contact_name || group.remote_jid.split("@")[0]}
                            </span>
                            {instanceLabel && instances.length > 1 && (
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                                {instanceLabel}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                {/* Message */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Mensagem:</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[100px] sm:min-h-[140px] text-sm resize-none"
                    placeholder="Mensagem para enviar..."
                  />
                </div>

                {/* Send */}
                <Button
                  onClick={handleSend}
                  disabled={selectedGroupIds.size === 0 || !message.trim()}
                  className="w-full gap-2"
                >
                  <Send className="w-4 h-4" />
                  Enviar para {selectedGroupIds.size} grupo{selectedGroupIds.size !== 1 ? "s" : ""}
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
