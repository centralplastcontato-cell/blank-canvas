import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAttentionList } from "@/hooks/useAttentionList";
import type { AttentionItem, AttentionKind } from "@/lib/attentionList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircleWarning, CalendarCheck, Handshake, MessageSquare, PartyPopper } from "lucide-react";

const SECTIONS: Record<AttentionKind, { title: string; description: string; icon: React.ReactNode; accent: string }> = {
  cliente_esperando: {
    title: "Cliente esperando resposta",
    description: "O cliente mandou a última mensagem e ninguém respondeu ainda.",
    icon: <MessageCircleWarning className="h-4 w-4" />,
    accent: "bg-red-500/10 text-red-600",
  },
  visitou_sem_fechar: {
    title: "Visitou e não fechou",
    description: "Veio conhecer o espaço nos últimos 30 dias e ninguém conversou com ele nos últimos 2 dias.",
    icon: <CalendarCheck className="h-4 w-4" />,
    accent: "bg-amber-500/10 text-amber-600",
  },
  negociacao_parada: {
    title: "Negociação parada",
    description: "Está em \"Negociando\" e a conversa parou há 3 dias ou mais.",
    icon: <Handshake className="h-4 w-4" />,
    accent: "bg-violet-500/10 text-violet-600",
  },
};

const VISIBLE = 8;

interface AtencaoTabProps {
  selectedUnit?: string;
}

export function AtencaoTab({ selectedUnit }: AtencaoTabProps) {
  const { data, isLoading, isError } = useAttentionList(selectedUnit);

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Erro ao carregar a lista. Tente novamente.</p>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, s) => sum + s.items.length, 0);
  if (total === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-2">
          <PartyPopper className="h-8 w-8 mx-auto text-green-600" />
          <p className="font-semibold">Tudo em dia!</p>
          <p className="text-sm text-muted-foreground">Nenhum cliente esperando resposta e nenhuma negociação parada.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((section) => (
        <AttentionSectionCard key={section.kind} kind={section.kind} items={section.items} />
      ))}
    </div>
  );
}

function AttentionSectionCard({ kind, items }: { kind: AttentionKind; items: AttentionItem[] }) {
  const [showAll, setShowAll] = useState(false);
  const meta = SECTIONS[kind];
  const visible = showAll ? items : items.slice(0, VISIBLE);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span className={`p-1.5 rounded-lg ${meta.accent}`}>{meta.icon}</span>
          {meta.title}
          <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">{meta.description}</p>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Ninguém aqui agora.</p>
        ) : (
          <div className="divide-y">
            {visible.map((item) => (
              <AttentionRow key={item.leadId} item={item} />
            ))}
            {items.length > VISIBLE && (
              <div className="pt-2 text-center">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "Mostrar menos" : `Mostrar todos (${items.length})`}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="font-medium text-sm truncate">{item.name}</p>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.statusLabel}</Badge>
          {item.unit && <span className="text-[10px] text-muted-foreground">{item.unit}</span>}
        </div>
        <p className="text-xs text-muted-foreground">{item.detail}</p>
        {item.preview && (
          <p className="text-xs italic text-foreground/70 truncate">"{item.preview}"</p>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1 shrink-0"
        onClick={() => navigate(`/atendimento?leadId=${item.leadId}`)}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Abrir conversa</span>
        <span className="sm:hidden">Abrir</span>
      </Button>
    </div>
  );
}
