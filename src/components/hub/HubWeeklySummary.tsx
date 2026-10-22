import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface WeeklySummary {
  id: string;
  created_at: string;
  content: string;
}

const STALE_DAYS = 7;

// Resumo da semana escrito pela IA (função hub-weekly-summary)
export function HubWeeklySummary() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);

  const { data: summary, isLoading, error } = useQuery<WeeklySummary | null>({
    queryKey: ["hub-weekly-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hub_weekly_summaries")
        .select("id, created_at, content")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    retry: false,
  });

  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("hub-weekly-summary", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.summary as WeeklySummary;
    },
    onSuccess: (s) => queryClient.setQueryData(["hub-weekly-summary"], s),
    onError: () => toast({ title: "Não foi possível gerar o resumo", description: "Tente de novo em instantes.", variant: "destructive" }),
  });

  // Tabela da fase 3 ainda não criada: não mostra o card
  if (error) return null;

  const isStale = summary
    ? Date.now() - new Date(summary.created_at).getTime() > STALE_DAYS * 86400000
    : true;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 text-violet-600 shrink-0" />
            <span className="truncate">Resumo da semana</span>
          </CardTitle>
          {summary && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground shrink-0"
              disabled={generate.isPending}
              onClick={() => generate.mutate()}
            >
              {generate.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
              Atualizar
            </Button>
          )}
        </div>
        {summary && (
          <p className="text-[11px] text-muted-foreground">
            Gerado {formatDistanceToNow(new Date(summary.created_at), { addSuffix: true, locale: ptBR })} · últimos 7 dias
            {isStale && " · desatualizado"}
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : summary ? (
          <>
            {/* No celular fica recolhido para não empurrar os números para baixo */}
            <div className={cn("relative", !expanded && "max-h-36 overflow-hidden lg:max-h-none")}>
              <div className="text-sm text-foreground space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-semibold [&_p]:leading-relaxed">
                <ReactMarkdown>{summary.content}</ReactMarkdown>
              </div>
              {!expanded && <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent lg:hidden" />}
            </div>
            <Button variant="ghost" size="sm" className="mt-1 text-xs text-muted-foreground lg:hidden" onClick={() => setExpanded(v => !v)}>
              <ChevronDown className={cn("h-3.5 w-3.5 mr-1 transition-transform", expanded && "rotate-180")} />
              {expanded ? "Recolher" : "Ler tudo"}
            </Button>
          </>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-sm text-muted-foreground flex-1">
              A IA lê os números dos últimos 7 dias de cada unidade e escreve o que melhorou, o que piorou e onde agir.
            </p>
            <Button size="sm" disabled={generate.isPending} onClick={() => generate.mutate()} className="shrink-0">
              {generate.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
              Gerar resumo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
