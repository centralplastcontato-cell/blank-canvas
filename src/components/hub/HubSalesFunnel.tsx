import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown } from "lucide-react";

interface LeadRecord {
  status: string;
}

interface HubSalesFunnelProps {
  leads: LeadRecord[];
}

const FUNNEL_STAGES = [
  { key: "novo", label: "Novos", color: "bg-blue-500" },
  { key: "em_contato", label: "Visita", color: "bg-amber-500" },
  { key: "orcamento_enviado", label: "Orçamento", color: "bg-violet-500" },
  { key: "aguardando_resposta", label: "Negociando", color: "bg-orange-500" },
  { key: "fechado", label: "Fechados", color: "bg-emerald-500" },
];

export function HubSalesFunnel({ leads }: HubSalesFunnelProps) {
  const stages = useMemo(() => {
    const total = leads.length || 1;
    return FUNNEL_STAGES.map(stage => {
      const count = leads.filter(l => l.status === stage.key).length;
      return { ...stage, count, pct: Math.round((count / total) * 100) };
    });
  }, [leads]);

  const maxCount = Math.max(...stages.map(s => s.count), 1);

  if (!leads.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowDown className="h-4 w-4" />
          Funil de Vendas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {stages.map((stage, i) => {
          const widthPct = Math.max((stage.count / maxCount) * 100, 8);
          return (
            <div key={stage.key} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 text-right shrink-0">{stage.label}</span>
              <div className="flex-1 relative h-8">
                <div
                  className={`h-full rounded-md ${stage.color} flex items-center justify-end pr-2 transition-all duration-500`}
                  style={{ width: `${widthPct}%`, opacity: 0.85 + (i * 0.03) }}
                >
                  <span className="text-xs font-bold text-white drop-shadow">
                    {stage.count}
                  </span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground w-10 shrink-0">{stage.pct}%</span>
            </div>
          );
        })}
        <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>Perdidos: {leads.filter(l => l.status === "perdido").length}</span>
          <span>Retorno: {leads.filter(l => l.status === "cliente_retorno").length}</span>
          <span>Transferidos: {leads.filter(l => l.status === "transferido").length}</span>
        </div>
      </CardContent>
    </Card>
  );
}
