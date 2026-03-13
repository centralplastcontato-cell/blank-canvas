import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HubLayout } from "@/components/hub/HubLayout";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Users, ChevronRight, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const LABEL_MAP: Record<string, string> = {
  nome: "Nome completo",
  idade: "Idade",
  tempo_trabalho: "Tempo no Castelo",
  conforto_pessoas: "Conforto com desconhecidos",
  conforto_ligar: "Conforto ao ligar",
  experiencia_vendas: "Experiência vendas",
  experiencia_onde: "Onde trabalhou",
  comunicatividade: "Comunicatividade",
  convencer: "Gosta de convencer",
  ligar_20: "Ligar 20 empresas/dia",
  objetivo: "Persistência",
  interesse_vendas: "Interesse em vendas",
  comissao: "Motivação por comissão",
  horas_semana: "Horas disponíveis",
  metas: "Trabalhar com metas",
  porque_voce: "Por que seria bom",
};

const VALUE_MAP: Record<string, string> = {
  menos_3m: "Menos de 3 meses",
  "3_6m": "3 a 6 meses",
  "6m_1a": "6 meses a 1 ano",
  mais_1a: "Mais de 1 ano",
  muito_confortavel: "Muito confortável",
  confortavel: "Confortável",
  mais_ou_menos: "Mais ou menos",
  nao_gosto: "Não gosto muito",
  nervoso: "Ficaria nervoso",
  nao_gostaria: "Não gostaria",
  sim: "Sim",
  nao: "Não",
  muito_comunicativa: "Muito comunicativa",
  comunicativa: "Comunicativa",
  reservada: "Mais reservada",
  sim_bastante: "Sim, bastante",
  as_vezes: "Às vezes",
  nao_muito: "Não muito",
  sim_tranquilo: "Sim, tranquilamente",
  sim_dificuldade: "Com dificuldade",
  dificil: "Acho difícil",
  insiste: "Insiste até conseguir",
  tenta: "Tenta algumas vezes",
  desiste: "Desiste se difícil",
  muito: "Muito interesse",
  medio: "Interesse médio",
  pouco: "Pouco interesse",
  sim_muito: "Sim, muito",
  tanto_faz: "Tanto faz",
  nao_muda: "Não muda muito",
  "2_4h": "2 a 4 horas",
  "4_6h": "4 a 6 horas",
  "6_10h": "6 a 10 horas",
  mais_10h: "Mais de 10 horas",
  talvez: "Talvez",
};

const formatValue = (v: string) => VALUE_MAP[v] || v;

export default function HubRecruitment() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);

  const { data: responses = [], isLoading } = useQuery({
    queryKey: ["hub-recruitment-responses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hub_recruitment_responses" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = responses.filter((r: any) =>
    r.respondent_name?.toLowerCase().includes(search.toLowerCase())
  );

  const formLink = `${window.location.origin}/recrutamento-comercial`;

  const copyLink = () => {
    navigator.clipboard.writeText(formLink);
    toast.success("Link copiado!");
  };

  return (
    <HubLayout currentPage="recrutamento">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Recrutamento Comercial</h1>
            <p className="text-sm text-muted-foreground">Respostas do formulário de seleção de monitores</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Copy className="w-4 h-4 mr-1.5" /> Copiar Link
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/recrutamento-comercial" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-1.5" /> Abrir Formulário
              </a>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{responses.length}</p>
              <p className="text-xs text-muted-foreground">Respostas</p>
            </div>
          </Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Idade</TableHead>
                <TableHead className="hidden sm:table-cell">Tempo</TableHead>
                <TableHead className="hidden md:table-cell">Comunicação</TableHead>
                <TableHead className="hidden md:table-cell">Disponibilidade</TableHead>
                <TableHead>Data</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma resposta encontrada</TableCell></TableRow>
              ) : (
                filtered.map((r: any) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(r)}>
                    <TableCell className="font-medium">{r.respondent_name}</TableCell>
                    <TableCell>{r.age || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary" className="text-xs">{formatValue(r.answers?.tempo_trabalho || "")}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-xs">{formatValue(r.answers?.comunicatividade || "")}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{formatValue(r.answers?.horas_semana || "")}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell><ChevronRight className="w-4 h-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selected?.respondent_name}</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Enviado em {format(new Date(selected.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
              {Object.entries(selected.answers || {}).map(([key, value]) => (
                <div key={key} className="border-b border-border pb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    {LABEL_MAP[key] || key}
                  </p>
                  <p className="text-sm text-foreground">{formatValue(value as string)}</p>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </HubLayout>
  );
}
