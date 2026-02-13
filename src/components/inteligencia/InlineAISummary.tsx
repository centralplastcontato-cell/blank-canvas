import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { useLeadSummary } from "@/hooks/useLeadSummary";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InlineAISummaryProps {
  leadId: string;
}

export function InlineAISummary({ leadId }: InlineAISummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading, isFetchingSaved, error, fetchSummary } = useLeadSummary(
    expanded ? leadId : null
  );

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
    <div className="mt-2 rounded-lg border bg-muted/30 p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium flex items-center gap-1.5 text-primary">
          <Brain className="h-3.5 w-3.5" />
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
        <div className="space-y-1.5">
          <p className="text-xs leading-relaxed">{data.summary}</p>
          {data.nextAction && (
            <p className="text-xs text-primary/80">
              <strong>Próxima ação:</strong> {data.nextAction}
            </p>
          )}
          {data.generatedAt && (
            <p className="text-[10px] text-muted-foreground">
              Gerado em {format(new Date(data.generatedAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-2">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={fetchSummary} disabled={isLoading}>
            {isLoading ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Brain className="h-3 w-3 mr-1" />}
            Gerar Resumo
          </Button>
        </div>
      )}
    </div>
  );
}
