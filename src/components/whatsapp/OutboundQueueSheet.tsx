import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Inbox, Check, X, Clock, Bot, Sparkles, RefreshCw, AlertCircle, Send } from "lucide-react";
import { useOutboundQueue, QueueItem } from "@/hooks/useOutboundQueue";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { WarmupManagerDialog } from "./WarmupManagerDialog";

const sourceIcon: Record<string, JSX.Element> = {
  bot: <Bot className="w-3.5 h-3.5" />,
  "follow-up": <Send className="w-3.5 h-3.5" />,
  reactivation: <Sparkles className="w-3.5 h-3.5" />,
  reminder: <Clock className="w-3.5 h-3.5" />,
};

const sourceLabel: Record<string, string> = {
  bot: "Bot",
  "follow-up": "Follow-up",
  reactivation: "Reativação",
  reminder: "Lembrete",
};

function statusBadge(status: QueueItem["status"]) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Aguardando</Badge>;
    case "approved":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Aprovada</Badge>;
    case "failed":
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Falhou</Badge>;
    default:
      return null;
  }
}

export function OutboundQueueSheet() {
  const { items, pendingCount, approvedCount, failedCount, totalActionable, approve, reject, minutesUntilAutoApprove, loading } = useOutboundQueue();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visibleIds = useMemo(() => items.map((i) => i.id), [items]);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(visibleIds));
  };

  const handleApprove = async (ids: string[]) => {
    if (!ids.length) return;
    await approve(ids);
    setSelected(new Set());
    toast({ title: "Aprovadas", description: `${ids.length} mensagem(ns) liberada(s) para envio gotejado.` });
  };

  const handleReject = async (ids: string[]) => {
    if (!ids.length) return;
    await reject(ids);
    setSelected(new Set());
    toast({ title: "Rejeitadas", description: `${ids.length} mensagem(ns) descartada(s).` });
  };

  if (totalActionable === 0 && !open) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative gap-2 rounded-xl border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
        >
          <Inbox className="w-4 h-4" />
          <span className="hidden sm:inline">Fila pós-reconexão</span>
          {pendingCount > 0 && (
            <Badge className="bg-red-500 text-white hover:bg-red-500 px-1.5 min-w-[20px] h-5">{pendingCount}</Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-amber-600" />
            Fila pós-reconexão
          </SheetTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span><b className="text-amber-700">{pendingCount}</b> aguardando</span>
            <span>•</span>
            <span><b className="text-blue-700">{approvedCount}</b> aprovadas (na fila de envio)</span>
            {failedCount > 0 && <><span>•</span><span><b className="text-red-700">{failedCount}</b> falhou</span></>}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Mensagens automáticas (bot, follow-up, reativação) capturadas durante a quarentena de reconexão. Sem ação,
            são auto-aprovadas em 30 min e enviadas em gotejamento (30–90s, máx 10/h).
          </p>
        </SheetHeader>

        {items.length > 0 && (
          <div className="flex items-center justify-between gap-2 px-6 py-3 border-b bg-muted/30">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              <span className="text-xs font-medium">
                {selected.size > 0 ? `${selected.size} selecionada(s)` : "Selecionar tudo"}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-red-700 border-red-200 hover:bg-red-50"
                onClick={() => handleReject(selected.size > 0 ? Array.from(selected) : visibleIds)}
              >
                <X className="w-3.5 h-3.5" />
                Rejeitar {selected.size > 0 ? "selec." : "tudo"}
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleApprove(selected.size > 0 ? Array.from(selected) : visibleIds)}
              >
                <Check className="w-3.5 h-3.5" />
                Aprovar {selected.size > 0 ? "selec." : "tudo"}
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="divide-y">
            {loading && <div className="p-6 text-center text-sm text-muted-foreground">Carregando…</div>}
            {!loading && items.length === 0 && (
              <div className="p-10 text-center text-sm text-muted-foreground">
                <Inbox className="w-10 h-10 mx-auto mb-3 opacity-30" />
                Nenhuma mensagem na fila. Tudo limpo! ✨
              </div>
            )}
            {items.map((item) => {
              const isSelected = selected.has(item.id);
              const remaining = item.status === "pending" ? minutesUntilAutoApprove(item.created_at) : 0;
              return (
                <div
                  key={item.id}
                  className={cn("flex gap-3 px-6 py-4 hover:bg-muted/30 transition-colors", isSelected && "bg-blue-50/50")}
                >
                  <Checkbox checked={isSelected} onCheckedChange={() => toggle(item.id)} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm truncate">
                        {item.contact_name || item.to_phone}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.to_phone}</span>
                      {statusBadge(item.status)}
                      <Badge variant="secondary" className="gap-1 text-xs h-5">
                        {sourceIcon[item.source] ?? <Bot className="w-3.5 h-3.5" />}
                        {sourceLabel[item.source] ?? item.source}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground/80 line-clamp-2 mb-1.5">
                      {item.preview || <span className="italic text-muted-foreground">[mídia ou sem texto]</span>}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {item.status === "pending" && (
                        <span className="flex items-center gap-1 text-amber-700">
                          <Clock className="w-3 h-3" />
                          Auto-aprova em {remaining} min
                        </span>
                      )}
                      {item.status === "failed" && item.last_error && (
                        <span className="flex items-center gap-1 text-red-700">
                          <AlertCircle className="w-3 h-3" />
                          {item.last_error.slice(0, 80)}
                        </span>
                      )}
                      {item.attempts > 0 && (
                        <span className="flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" /> {item.attempts} tentativa(s)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs gap-1 text-red-700 border-red-200 hover:bg-red-50"
                        onClick={() => handleReject([item.id])}
                      >
                        <X className="w-3 h-3" /> Rejeitar
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleApprove([item.id])}
                      >
                        <Check className="w-3 h-3" /> Aprovar agora
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
