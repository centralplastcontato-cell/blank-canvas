import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, Loader2, FileText, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContractGenerator } from "./ContractGenerator";
import { ContractPreviewPrint } from "./ContractPreviewPrint";

interface GeneratedContract {
  id: string;
  nome_documento: string;
  tipo_evento: string | null;
  status: string;
  conteudo_renderizado: string;
  dados_utilizados: any;
  created_at: string;
  lead_id: string | null;
  event_id: string | null;
  template_id: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  gerado: "bg-blue-500/15 text-blue-700 border-blue-300",
  enviado: "bg-amber-500/15 text-amber-700 border-amber-300",
  assinado: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
  cancelado: "bg-red-500/15 text-red-700 border-red-300",
};

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho", gerado: "Gerado", enviado: "Enviado", assinado: "Assinado", cancelado: "Cancelado",
};

interface Props { userId: string; }

export function GeneratedContractsList({ userId }: Props) {
  const { currentCompany } = useCompany();
  const [contracts, setContracts] = useState<GeneratedContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [viewContract, setViewContract] = useState<GeneratedContract | null>(null);

  const fetchContracts = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("generated_contracts")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("created_at", { ascending: false });
    setContracts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchContracts(); }, [currentCompany?.id]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground hidden md:block">Contratos gerados a partir dos modelos</p>
          <Button onClick={() => setGeneratorOpen(true)} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Gerar Contrato</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : contracts.length === 0 ? (
          <Card><CardContent className="p-8 text-center space-y-3">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Nenhum contrato gerado ainda.</p>
            <Button onClick={() => setGeneratorOpen(true)}><Plus className="h-4 w-4 mr-2" /> Gerar Primeiro Contrato</Button>
          </CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {contracts.map(c => {
              const leadName = c.dados_utilizados?.lead?.name || "—";
              return (
                <Card key={c.id} className="border-border/40">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold truncate">{c.nome_documento}</h3>
                          <Badge className={`text-xs ${STATUS_COLORS[c.status] || ""}`}>{STATUS_LABELS[c.status] || c.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Contratante: {leadName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Gerado em {format(new Date(c.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 border-t border-border/40 pt-3 mt-3">
                      <Button variant="outline" size="sm" className="h-8 text-xs rounded-full px-3.5 gap-1.5" onClick={() => setViewContract(c)}>
                        <Eye className="h-3.5 w-3.5" /> Visualizar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Generator Dialog */}
      <Dialog open={generatorOpen} onOpenChange={setGeneratorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <ContractGenerator
            userId={userId}
            onClose={() => { setGeneratorOpen(false); fetchContracts(); }}
          />
        </DialogContent>
      </Dialog>

      {/* View Contract Sheet */}
      {viewContract && (
        <Sheet open={!!viewContract} onOpenChange={() => setViewContract(null)}>
          <SheetContent className="w-full sm:max-w-2xl p-0 overflow-y-auto">
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40">
              <SheetTitle>{viewContract.nome_documento}</SheetTitle>
            </SheetHeader>
            <div className="p-6">
              <ContractPreviewPrint
                content={viewContract.conteudo_renderizado}
                companyName={currentCompany?.name || ""}
                companyLogo={currentCompany?.logo_url || undefined}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
