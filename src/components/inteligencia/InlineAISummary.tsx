import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, RefreshCw, ChevronDown, ChevronUp, MessageCircle, Copy, Check } from "lucide-react";
import { useLeadSummary } from "@/hooks/useLeadSummary";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface InlineAISummaryProps {
  leadId: string;
  leadWhatsapp?: string;
}

export function InlineAISummary({ leadId, leadWhatsapp }: InlineAISummaryProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const { data, isLoading, isFetchingSaved, error, fetchSummary } = useLeadSummary(
    expanded ? leadId : null
  );

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Mensagem copiada!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = (message: string) => {
    if (!leadWhatsapp) return;
    const encodedDraft = encodeURIComponent(message);
    navigate(`/atendimento?phone=${leadWhatsapp}&draft=${encodedDraft}`);
  };

  if (!expanded) {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(true);
        }}
      >
        <Brain className="h-3.5 w-3.5" />
        Resumo IA
        <ChevronDown className="h-3 w-3" />
      </Button>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-primary/20 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 p-5 space-y-3 shadow-card" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold flex items-center gap-2 text-primary">
          <Brain className="h-5 w-5" style={{ filter: 'drop-shadow(0 1px 2px hsl(215 85% 50% / 0.3))' }} />
          Resumo IA
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={fetchSummary}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => setExpanded(false)}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {isFetchingSaved ? (
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ) : error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : data ? (
        <div className="space-y-2">
          <p className="text-xs leading-relaxed">{data.summary}</p>
          {data.nextAction && (
            <p className="text-xs text-primary/80">
              <strong>Próxima ação:</strong> {data.nextAction}
            </p>
          )}
          {data.suggestedMessage && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 space-y-2">
              <p className="text-xs font-medium text-primary flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                Mensagem sugerida:
              </p>
              <p className="text-xs leading-relaxed italic">{data.suggestedMessage}</p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] gap-1 px-2"
                  onClick={() => handleCopy(data.suggestedMessage!)}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
                {leadWhatsapp && (
                  <Button
                    size="sm"
                    variant="default"
                    className="h-6 text-[10px] gap-1 px-2"
                    onClick={() => handleSendWhatsApp(data.suggestedMessage!)}
                  >
                    <MessageCircle className="h-3 w-3" />
                    Enviar no WhatsApp
                  </Button>
                )}
              </div>
            </div>
          )}
          {data.generatedAt && (
            <p className="text-[10px] text-muted-foreground">
              Gerado em {format(new Date(data.generatedAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-2">
          <Button size="sm" variant="default" className="h-8 text-xs gap-1.5" onClick={fetchSummary} disabled={isLoading}>
            {isLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
            Gerar Resumo
          </Button>
        </div>
      )}
    </div>
  );
}
