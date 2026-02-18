import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Loader2, Star, ChevronDown, User } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { FreelancerEvaluationHistory } from "./FreelancerEvaluationHistory";

interface GroupedFreelancer {
  name: string;
  avgGeral: number;
  totalEvals: number;
}

export function FreelancerEvaluationsTab() {
  const { currentCompany } = useCompany();
  const [grouped, setGrouped] = useState<GroupedFreelancer[]>([]);
  const [loading, setLoading] = useState(true);
  const [openName, setOpenName] = useState<string | null>(null);

  useEffect(() => {
    if (!currentCompany?.id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("freelancer_evaluations")
        .select("freelancer_name, scores")
        .eq("company_id", currentCompany.id);

      if (data && data.length > 0) {
        const map = new Map<string, { total: number; sum: number; count: number }>();
        data.forEach((d: any) => {
          const name = d.freelancer_name;
          const geral = (d.scores as any)?.geral;
          const entry = map.get(name) || { total: 0, sum: 0, count: 0 };
          entry.total++;
          if (typeof geral === "number" && geral > 0) {
            entry.sum += geral;
            entry.count++;
          }
          map.set(name, entry);
        });

        const list: GroupedFreelancer[] = Array.from(map.entries())
          .map(([name, v]) => ({
            name,
            avgGeral: v.count > 0 ? v.sum / v.count : 0,
            totalEvals: v.total,
          }))
          .sort((a, b) => b.avgGeral - a.avgGeral);

        setGrouped(list);
      } else {
        setGrouped([]);
      }
      setLoading(false);
    })();
  }, [currentCompany?.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (grouped.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <Star className="h-10 w-10 text-muted-foreground mx-auto" />
        <p className="text-muted-foreground text-sm">Nenhuma avaliação registrada ainda.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-2">
      <p className="text-sm text-muted-foreground mb-3">
        {grouped.length} freelancer{grouped.length !== 1 ? "s" : ""} avaliado{grouped.length !== 1 ? "s" : ""}
      </p>

      {grouped.map((f) => {
        const isOpen = openName === f.name;
        return (
          <Collapsible key={f.name} open={isOpen} onOpenChange={() => setOpenName(isOpen ? null : f.name)}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors text-left">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-sm truncate block">{f.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {f.totalEvals} avaliação{f.totalEvals !== 1 ? "ões" : ""}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {f.avgGeral > 0 && (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {f.avgGeral.toFixed(1)}
                    </span>
                  )}
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </div>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-2 py-3">
                <FreelancerEvaluationHistory
                  freelancerName={f.name}
                  companyId={currentCompany!.id}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
