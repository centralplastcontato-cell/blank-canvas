import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Version {
  id: string;
  versao: number;
  nome_modelo: string | null;
  tipo_evento: string | null;
  conteudo_template: string;
  changed_by: string | null;
  created_at: string;
}

interface Props { modelId: string; }

export function ContractVersionHistory({ modelId }: Props) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("contract_model_versions")
        .select("*")
        .eq("model_id", modelId)
        .order("versao", { ascending: false });
      setVersions(data || []);
      setLoading(false);
    })();
  }, [modelId]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (versions.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">Nenhuma versão anterior registrada.</p>;
  }

  return (
    <div className="space-y-2">
      {versions.map(v => (
        <div key={v.id} className="rounded-xl border border-border/40 overflow-hidden">
          <button
            onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono">v{v.versao}</Badge>
              <span className="text-sm font-medium">{v.nome_modelo || "—"}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {format(new Date(v.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </span>
          </button>
          {expandedId === v.id && (
            <div className="border-t border-border/40 px-4 py-3 bg-muted/20">
              <pre className="text-xs whitespace-pre-wrap font-mono max-h-60 overflow-y-auto text-muted-foreground">
                {v.conteudo_template}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
