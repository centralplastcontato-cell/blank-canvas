import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UtensilsCrossed, Plus, Loader2, Pencil, Copy, Trash2, Link2, Eye, MessageSquareText, User, Calendar, ChevronDown, ChevronRight, PartyPopper, FileText, Printer, Settings2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { buildPublicFormPath, buildPublicFormUrl } from "@/lib/publicFormRoutes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { generateCardapioPrintPDF } from "@/lib/cardapioPrintPDF";
import { useCardapioPrintPrefs } from "@/hooks/useCardapioPrintPrefs";

interface CardapioSection {
  id: string;
  emoji: string;
  title: string;
  instruction: string;
  max_selections: number | null;
  options: string[];
}

interface CardapioTemplate {
  id: string;
  company_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  sections: CardapioSection[];
  thank_you_message: string | null;
  is_active: boolean;
  created_at: string;
}

const DEFAULT_SECTIONS: CardapioSection[] = [
  {
    id: "fritos",
    emoji: "🍟",
    title: "FRITOS",
    instruction: "Escolha os fritos desejados",
    max_selections: null,
    options: ["Coxinha", "Coxinha de Brócolis", "Bolinha de Queijo", "Almofadinha de Calabresa", "Almofadinha de Presunto e Queijo", "Kibe", "Kibe com Queijo", "Casulo de Azeitona com Queijo", "Bolinho de Carne"],
  },
  {
    id: "assados",
    emoji: "🥟",
    title: "ASSADOS",
    instruction: "Escolha os assados desejados",
    max_selections: null,
    options: ["Esfirra de Carne", "Esfirra de Frango", "Empada de Palmito", "Empada de Frango", "Enroladinho de Calabresa"],
  },
  {
    id: "doces",
    emoji: "🍬",
    title: "DOCES",
    instruction: "Escolha 5 tipos de doce",
    max_selections: 5,
    options: ["Beijinho", "Brigadeiro", "Cajuzinho", "Moranguinho", "Olho de Sogra", "Casadinho", "Docinho de Maracujá"],
  },
  {
    id: "bolo",
    emoji: "🎂",
    title: "BOLO",
    instruction: "Escolha 1 sabor de bolo",
    max_selections: 1,
    options: ["Beijinho", "Brigadeiro", "Trufado de Chocolate com Brigadeiro", "Brigadeiro com Brigadeiro Branco", "Brigadeiro com Morango", "Doce de Leite com Abacaxi", "Doce de Leite com Ameixa", "Ouro Branco", "Ninho com Morango"],
  },
  {
    id: "bebidas",
    emoji: "🥤",
    title: "BEBIDAS",
    instruction: "Escolha as bebidas desejadas",
    max_selections: null,
    options: ["Refrigerante Lata", "Refrigerante 2L", "Suco Natural de Laranja", "Suco Natural de Maracujá", "Suco Natural de Limão", "Água Mineral", "Água com Gás", "Chá Gelado"],
  },
  {
    id: "pratos_quentes",
    emoji: "🍕",
    title: "PRATOS QUENTES",
    instruction: "Escolha os pratos quentes desejados",
    max_selections: null,
    options: ["Mini Pizza", "Mini Hambúrguer", "Cachorro-Quente", "Batata Frita", "Nuggets", "Pipoca Gourmet", "Crepe Salgado", "Pastel"],
  },
  {
    id: "saladas_frios",
    emoji: "🥗",
    title: "SALADAS / FRIOS",
    instruction: "Escolha as saladas e frios",
    max_selections: null,
    options: ["Tábua de Frios", "Salada Verde", "Salada de Frutas", "Salpicão", "Mini Sanduíches", "Finger Foods"],
  },
  {
    id: "sobremesas_especiais",
    emoji: "🍫",
    title: "SOBREMESAS ESPECIAIS",
    instruction: "Escolha até 3 sobremesas especiais",
    max_selections: 3,
    options: ["Cascata de Chocolate", "Algodão Doce", "Crepe Suíço", "Açaí", "Sorvete", "Churros", "Paleta Mexicana", "Fondue de Frutas"],
  },
  {
    id: "estacoes",
    emoji: "🎪",
    title: "ESTAÇÕES / LIVE STATIONS",
    instruction: "Escolha até 2 estações",
    max_selections: 2,
    options: ["Estação de Crepe", "Estação de Churros", "Estação de Pipoca Gourmet", "Estação de Algodão Doce", "Estação de Açaí", "Estação de Sorvete"],
  },
  {
    id: "mesa_bolo",
    emoji: "🎀",
    title: "MESA DO BOLO",
    instruction: "Escolha os itens para a mesa do bolo",
    max_selections: null,
    options: ["Personalização de Tema", "Topo de Bolo (Topper)", "Cupcakes Decorados", "Cake Pops", "Mini Tortas", "Pirulitos Decorados"],
  },
  {
    id: "kit_lanche",
    emoji: "🎁",
    title: "KIT LANCHE",
    instruction: "Escolha 1 opção de kit lanche",
    max_selections: 1,
    options: ["Kit Mini Sanduíche + Suco + Doce", "Kit Salgado + Suco + Bala", "Kit Pipoca + Suco + Pirulito", "Sem Kit Lanche"],
  },
];

function CardapioResponseCards({ responses, template, onDelete, company, allTemplates }: { responses: any[]; template: CardapioTemplate | null; onDelete?: (id: string) => Promise<void> | void; company?: { name: string; logo_url?: string | null } | null; allTemplates?: CardapioTemplate[] }) {
  const [selectedResponse, setSelectedResponse] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; fileName: string; blob: Blob } | null>(null);
  const [eventResponses, setEventResponses] = useState<any[]>([]);
  const [pdfTemplateId, setPdfTemplateId] = useState<string | null>(null);
  const [pdfResponseId, setPdfResponseId] = useState<string | null>(null);
  const [printPrefs, setPrintPrefs] = useCardapioPrintPrefs();

  // When opening a response, look up other responses for the same event (other templates).
  useEffect(() => {
    if (!selectedResponse?.event_id || !company) {
      setEventResponses([]);
      setPdfTemplateId(selectedResponse?.template_id ?? null);
      setPdfResponseId(selectedResponse?.id ?? null);
      return;
    }
    setPdfTemplateId(selectedResponse.template_id);
    setPdfResponseId(selectedResponse.id);
    (async () => {
      const { data } = await supabase
        .from("cardapio_responses")
        .select("id, template_id, respondent_name, created_at, answers, company_events(event_date, title, guest_count)")
        .eq("event_id", selectedResponse.event_id)
        .order("created_at", { ascending: false });
      setEventResponses(data || []);
    })();
  }, [selectedResponse, company]);

  // Templates available for this event = templates that have a response for the event
  const availablePdfChoices = (() => {
    const choices: { templateId: string; responseId: string; templateName: string }[] = [];
    const seen = new Set<string>();
    for (const r of eventResponses) {
      if (seen.has(r.template_id)) continue;
      seen.add(r.template_id);
      const tpl = allTemplates?.find((t) => t.id === r.template_id);
      choices.push({
        templateId: r.template_id,
        responseId: r.id,
        templateName: tpl?.name || "Cardápio",
      });
    }
    if (choices.length === 0 && selectedResponse) {
      choices.push({
        templateId: selectedResponse.template_id,
        responseId: selectedResponse.id,
        templateName: template?.name || "Cardápio",
      });
    }
    return choices;
  })();

  const renderAnswers = (r: any) => {
    const answersArr = Array.isArray(r.answers) ? r.answers : [];
    return answersArr.map((a: any, idx: number) => {
      const section = template?.sections.find(s => s.id === a.sectionId);
      return (
        <div key={idx} className="px-4 py-2.5">
          <p className="text-muted-foreground text-xs mb-0.5">
            {section ? `${section.emoji} ${section.title}` : a.sectionId}
          </p>
          <p className="font-medium text-sm">
            {Array.isArray(a.selected) ? a.selected.join(", ") : String(a.selected || "—")}
          </p>
        </div>
      );
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {responses.map((r) => {
          const answersArr = Array.isArray(r.answers) ? r.answers : [];
          const filledCount = answersArr.filter((a: any) => {
            if (Array.isArray(a.selected)) return a.selected.length > 0;
            return a.selected !== null && a.selected !== "" && a.selected !== undefined;
          }).length;
          return (
            <Card
              key={r.id}
              className="bg-card border border-border cursor-pointer hover:border-primary/30 transition-all"
              onClick={() => setSelectedResponse(r)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{r.respondent_name || "Anônimo"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {r.company_events?.event_date && (
                        <p className="text-xs text-primary flex items-center gap-1 mt-0.5">
                          <PartyPopper className="h-3 w-3" />
                          Festa: {format(new Date(r.company_events.event_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                  <FileText className="h-3.5 w-3.5" />
                  <span>{filledCount} respostas preenchidas</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Sheet open={!!selectedResponse} onOpenChange={(open) => { if (!open) setSelectedResponse(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selectedResponse && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-base font-semibold">{selectedResponse.respondent_name || "Anônimo"}</p>
                    <p className="text-xs text-muted-foreground font-normal">
                      Preenchido em {format(new Date(selectedResponse.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    {selectedResponse.company_events?.event_date && (
                      <p className="text-xs text-primary font-normal flex items-center gap-1">
                        <PartyPopper className="h-3 w-3" />
                        Festa: {format(new Date(selectedResponse.company_events.event_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="divide-y divide-border rounded-xl border border-border bg-muted/20">
                {renderAnswers(selectedResponse)}
              </div>

              {availablePdfChoices.length > 1 && (
                <div className="pt-4 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Template para o PDF</Label>
                  <Select
                    value={pdfTemplateId ?? undefined}
                    onValueChange={(val) => {
                      const choice = availablePdfChoices.find((c) => c.templateId === val);
                      if (choice) {
                        setPdfTemplateId(choice.templateId);
                        setPdfResponseId(choice.responseId);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione o template" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePdfChoices.map((c) => (
                        <SelectItem key={c.templateId} value={c.templateId}>
                          {c.templateName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="pt-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5 w-full sm:w-auto justify-center"
                    disabled={printing || !pdfTemplateId}
                    onClick={async () => {
                      const tpl =
                        allTemplates?.find((t) => t.id === pdfTemplateId) ||
                        (pdfTemplateId === template?.id ? template : null);
                      const resp =
                        eventResponses.find((r) => r.id === pdfResponseId) ||
                        (pdfResponseId === selectedResponse.id ? selectedResponse : selectedResponse);
                      if (!tpl || !resp) {
                        toast({ title: "Template não encontrado", variant: "destructive" });
                        return;
                      }
                      setPrinting(true);
                      try {
                        const result = await generateCardapioPrintPDF(
                          resp,
                          tpl,
                          { name: company?.name || "Buffet", logo_url: company?.logo_url || null },
                          { save: false, prefs: printPrefs },
                        );
                        const url = URL.createObjectURL(result.blob);
                        setPdfPreview({ url, fileName: result.fileName, blob: result.blob });
                      } catch (err) {
                        console.error(err);
                        toast({ title: "Erro ao gerar PDF", variant: "destructive" });
                      } finally {
                        setPrinting(false);
                      }
                    }}
                  >
                    {printing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                    Pré-visualizar PDF
                  </Button>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 w-full sm:w-auto justify-center"
                        title="Preferências de impressão"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        Preferências
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 space-y-4" align="start">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">Preferências de impressão</p>
                        <p className="text-xs text-muted-foreground">
                          Salvas neste navegador para os próximos PDFs.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Tamanho da página</Label>
                        <RadioGroup
                          value={printPrefs.pageSize}
                          onValueChange={(v) =>
                            setPrintPrefs({ ...printPrefs, pageSize: v as "a4" | "letter" })
                          }
                          className="flex gap-4"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="a4" id="ps-a4" />
                            <Label htmlFor="ps-a4" className="text-sm font-normal cursor-pointer">A4</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="letter" id="ps-letter" />
                            <Label htmlFor="ps-letter" className="text-sm font-normal cursor-pointer">Carta</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Orientação</Label>
                        <RadioGroup
                          value={printPrefs.orientation}
                          onValueChange={(v) =>
                            setPrintPrefs({ ...printPrefs, orientation: v as "portrait" | "landscape" })
                          }
                          className="flex gap-4"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="portrait" id="or-p" />
                            <Label htmlFor="or-p" className="text-sm font-normal cursor-pointer">Retrato</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="landscape" id="or-l" />
                            <Label htmlFor="or-l" className="text-sm font-normal cursor-pointer">Paisagem</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t">
                        <Label htmlFor="inc-client" className="text-sm font-normal cursor-pointer flex-1">
                          Incluir dados do cliente
                        </Label>
                        <Switch
                          id="inc-client"
                          checked={printPrefs.includeClientInfo}
                          onCheckedChange={(checked) =>
                            setPrintPrefs({ ...printPrefs, includeClientInfo: checked })
                          }
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {onDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 w-full sm:w-auto justify-center">
                        <Trash2 className="h-3.5 w-3.5" /> Apagar resposta
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Apagar resposta?</AlertDialogTitle>
                        <AlertDialogDescription>
                          A resposta de <strong>{selectedResponse.respondent_name || "Anônimo"}</strong> será excluída permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={deletingId === selectedResponse.id}
                          onClick={async (e) => {
                            e.preventDefault();
                            setDeletingId(selectedResponse.id);
                            await onDelete(selectedResponse.id);
                            setDeletingId(null);
                            setSelectedResponse(null);
                          }}
                        >
                          {deletingId === selectedResponse.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                          Apagar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog
        open={!!pdfPreview}
        onOpenChange={(open) => {
          if (!open && pdfPreview) {
            URL.revokeObjectURL(pdfPreview.url);
            setPdfPreview(null);
          }
        }}
      >
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Pré-visualização do PDF
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-muted/30">
            {pdfPreview && (
              <iframe
                src={pdfPreview.url}
                title="Pré-visualização do cardápio"
                className="w-full h-full border-0"
              />
            )}
          </div>
          <DialogFooter className="px-6 py-3 border-t shrink-0 gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (pdfPreview) {
                  URL.revokeObjectURL(pdfPreview.url);
                  setPdfPreview(null);
                }
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!pdfPreview) return;
                const a = document.createElement("a");
                a.href = pdfPreview.url;
                a.download = pdfPreview.fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                toast({ title: "PDF baixado", description: pdfPreview.fileName });
              }}
              className="gap-1.5"
            >
              <Printer className="h-4 w-4" />
              Baixar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CardapioContent() {
  const { currentCompany } = useCompany();
  const [templates, setTemplates] = useState<CardapioTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CardapioTemplate | null>(null);

  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [selectedTemplateForResponses, setSelectedTemplateForResponses] = useState<CardapioTemplate | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formThankYou, setFormThankYou] = useState("Obrigado por enviar suas escolhas! 🎉");
  const [formSections, setFormSections] = useState<CardapioSection[]>(DEFAULT_SECTIONS);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("cardapio_templates")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("created_at", { ascending: false });
    if (!error && data) setTemplates(data.map((t: any) => ({ ...t, sections: t.sections as CardapioSection[] })));
    setLoading(false);

    const { data: countData } = await supabase
      .from("cardapio_responses")
      .select("template_id")
      .eq("company_id", currentCompany.id);
    if (countData) {
      const counts: Record<string, number> = {};
      countData.forEach((r: any) => { counts[r.template_id] = (counts[r.template_id] || 0) + 1; });
      setResponseCounts(counts);
    }
  };

  const toggleResponses = async (t: CardapioTemplate) => {
    if (expandedTemplateId === t.id) { setExpandedTemplateId(null); return; }
    setExpandedTemplateId(t.id);
    setSelectedTemplateForResponses(t);
    setLoadingResponses(true);
    const { data } = await supabase
      .from("cardapio_responses")
      .select("*, company_events(event_date, title, guest_count, lead_id, leads(name))")
      .eq("template_id", t.id)
      .order("created_at", { ascending: false });
    setResponses(data || []);
    setLoadingResponses(false);
  };

  const handleDeleteResponse = async (id: string) => {
    const { error } = await supabase.from("cardapio_responses").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao apagar resposta", variant: "destructive" });
      return;
    }
    toast({ title: "Resposta apagada" });
    setResponses(prev => prev.filter(r => r.id !== id));
    setResponseCounts(prev => ({ ...prev, [selectedTemplateForResponses?.id || ""]: Math.max(0, (prev[selectedTemplateForResponses?.id || ""] || 1) - 1) }));
  };

  useEffect(() => { fetchTemplates(); }, [currentCompany?.id]);

  const openNew = () => {
    setEditingTemplate(null);
    setFormName("Cardápio da Festa");
    setFormDescription("Escolha os itens do cardápio para a sua festa!");
    setFormThankYou("Obrigado por enviar suas escolhas! 🎉");
    setFormSections([...DEFAULT_SECTIONS.map(s => ({ ...s, options: [...s.options] }))]);
    setDialogOpen(true);
  };

  const openEdit = (t: CardapioTemplate) => {
    setEditingTemplate(t);
    setFormName(t.name);
    setFormDescription(t.description || "");
    setFormThankYou(t.thank_you_message || "");
    setFormSections([...(t.sections || []).map(s => ({ ...s, options: [...s.options] }))]);
    setDialogOpen(true);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleDuplicate = async (t: CardapioTemplate) => {
    if (!currentCompany?.id) return;
    const newName = `${t.name} (cópia)`;
    const { error } = await supabase.from("cardapio_templates").insert({
      company_id: currentCompany.id,
      name: newName,
      slug: generateSlug(newName),
      description: t.description,
      sections: t.sections as any,
      thank_you_message: t.thank_you_message,
    });
    if (error) { toast({ title: "Erro ao duplicar", variant: "destructive" }); return; }
    toast({ title: "Template duplicado!" });
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("cardapio_responses").delete().eq("template_id", id);
    const { error } = await supabase.from("cardapio_templates").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir", variant: "destructive" }); return; }
    toast({ title: "Template excluído" });
    if (expandedTemplateId === id) setExpandedTemplateId(null);
    fetchTemplates();
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from("cardapio_templates").update({ is_active: active }).eq("id", id);
    fetchTemplates();
  };

  const handleSave = async () => {
    if (!currentCompany?.id || !formName.trim()) return;
    setSaving(true);
    const slug = generateSlug(formName.trim());
    const payload = {
      company_id: currentCompany.id,
      name: formName.trim(),
      description: formDescription.trim() || null,
      sections: formSections as any,
      thank_you_message: formThankYou.trim() || null,
      slug,
    };

    if (editingTemplate) {
      const { error } = await supabase.from("cardapio_templates").update(payload).eq("id", editingTemplate.id);
      if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Template atualizado!" });
    } else {
      const { error } = await supabase.from("cardapio_templates").insert(payload);
      if (error) { toast({ title: "Erro ao criar", variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Template criado!" });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchTemplates();
  };

  const addSection = () => {
    setFormSections([...formSections, {
      id: `sec_${Date.now()}`,
      emoji: "📋",
      title: "",
      instruction: "",
      max_selections: null,
      options: [""],
    }]);
  };

  const updateSection = (idx: number, updates: Partial<CardapioSection>) => {
    setFormSections(prev => prev.map((s, i) => i === idx ? { ...s, ...updates } : s));
  };

  const removeSection = (idx: number) => {
    setFormSections(prev => prev.filter((_, i) => i !== idx));
  };

  const addOption = (sectionIdx: number) => {
    setFormSections(prev => prev.map((s, i) => i === sectionIdx ? { ...s, options: [...s.options, ""] } : s));
  };

  const updateOption = (sectionIdx: number, optIdx: number, value: string) => {
    setFormSections(prev => prev.map((s, i) => {
      if (i !== sectionIdx) return s;
      const opts = [...s.options];
      opts[optIdx] = value;
      return { ...s, options: opts };
    }));
  };

  const removeOption = (sectionIdx: number, optIdx: number) => {
    setFormSections(prev => prev.map((s, i) => {
      if (i !== sectionIdx) return s;
      return { ...s, options: s.options.filter((_, oi) => oi !== optIdx) };
    }));
  };

  const getTemplateUrl = (t: CardapioTemplate) => {
    return buildPublicFormPath({
      type: "cardapio",
      templateId: t.id,
      templateSlug: t.slug,
      companySlug: currentCompany?.slug,
    });
  };

  const copyLink = (t: CardapioTemplate) => {
    const fullUrl = buildPublicFormUrl({
      type: "cardapio",
      templateId: t.id,
      templateSlug: t.slug,
      companySlug: currentCompany?.slug,
      baseUrl: currentCompany?.custom_domain || window.location.origin,
    });
    navigator.clipboard.writeText(fullUrl);
    toast({ title: "Link copiado!" });
  };

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground hidden md:block">Crie formulários de cardápio para os clientes escolherem</p>
          <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Template</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : templates.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center space-y-3">
              <UtensilsCrossed className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Nenhum template de cardápio criado ainda.</p>
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Criar Primeiro Template</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {templates.map((t) => {
              const isExpanded = expandedTemplateId === t.id;
              const count = responseCounts[t.id] || 0;
              return (
                <Collapsible key={t.id} open={isExpanded} onOpenChange={() => toggleResponses(t)}>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold truncate">{t.name}</h3>
                            <Badge variant={t.is_active ? "default" : "secondary"} className="text-xs shrink-0">
                              {t.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          {t.description && <p className="text-sm text-muted-foreground line-clamp-1">{t.description}</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            {(t.sections || []).length} seções · {(t.sections || []).reduce((acc, s) => acc + s.options.length, 0)} opções
                          </p>
                        </div>
                        <Switch checked={t.is_active} onCheckedChange={(v) => handleToggleActive(t.id, v)} className="shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap border-t border-border/50 pt-3">
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-full px-3.5 bg-muted/30 border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all" onClick={() => copyLink(t)}>
                          <Link2 className="h-3.5 w-3.5" /> Link
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-full px-3.5 bg-muted/30 border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all" onClick={() => window.open(getTemplateUrl(t), "_blank")}>
                          <Eye className="h-3.5 w-3.5" /> Ver
                        </Button>
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-full px-3.5 bg-muted/30 border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all">
                            <MessageSquareText className="h-3.5 w-3.5" /> Respostas {count > 0 && `(${count})`}
                            <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </Button>
                        </CollapsibleTrigger>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-full px-3.5 bg-muted/30 border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all" onClick={() => openEdit(t)}>
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-full px-3.5 bg-muted/30 border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all" onClick={() => handleDuplicate(t)}>
                          <Copy className="h-3.5 w-3.5" /> Duplicar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-full px-3.5 ml-auto border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50 transition-all"><Trash2 className="h-3.5 w-3.5" /> Excluir</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir template?</AlertDialogTitle>
                              <AlertDialogDescription>Essa ação não pode ser desfeita. Todas as respostas vinculadas também serão excluídas.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(t.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                      <CollapsibleContent>
                        <div className="border-t border-border pt-4 mt-1 space-y-3">
                          {loadingResponses ? (
                            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                          ) : responses.length === 0 ? (
                            <div className="text-center py-6 space-y-2">
                              <MessageSquareText className="h-8 w-8 text-muted-foreground mx-auto" />
                              <p className="text-sm text-muted-foreground">Nenhuma resposta recebida ainda.</p>
                            </div>
                          ) : (
                            <CardapioResponseCards responses={responses} template={selectedTemplateForResponses} onDelete={handleDeleteResponse} company={currentCompany ? { name: currentCompany.name, logo_url: (currentCompany as any).logo_url } : null} allTemplates={templates} />
                          )}
                        </div>
                      </CollapsibleContent>
                    </CardContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      {/* Template Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Editar Template" : "Novo Template de Cardápio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3">
              <div>
                <Label>Nome do template</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Cardápio da Festa" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Ex: Escolha os itens do cardápio!" />
              </div>
              <div>
                <Label>Mensagem de agradecimento</Label>
                <Input value={formThankYou} onChange={(e) => setFormThankYou(e.target.value)} placeholder="Obrigado! 🎉" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Seções do Cardápio</Label>
                <Button variant="outline" size="sm" onClick={addSection}><Plus className="h-3.5 w-3.5 mr-1" /> Seção</Button>
              </div>

              {formSections.map((sec, sIdx) => (
                <Card key={sec.id} className="bg-muted/50">
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Input value={sec.emoji} onChange={(e) => updateSection(sIdx, { emoji: e.target.value })} placeholder="🍟" className="text-center text-sm w-14 shrink-0" />
                        <Input value={sec.title} onChange={(e) => updateSection(sIdx, { title: e.target.value })} placeholder="Nome da seção" className="text-sm font-semibold" />
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeSection(sIdx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Instrução</Label>
                        <Input value={sec.instruction} onChange={(e) => updateSection(sIdx, { instruction: e.target.value })} placeholder="Ex: Escolha os fritos" className="text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Máx. seleções</Label>
                        <Input
                          type="number"
                          value={sec.max_selections ?? ""}
                          onChange={(e) => updateSection(sIdx, { max_selections: e.target.value ? Number(e.target.value) : null })}
                          placeholder="Ilimitado"
                          className="text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium">Opções:</p>
                      {sec.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-1.5">
                          <Input
                            value={opt}
                            onChange={(e) => updateOption(sIdx, oIdx, e.target.value)}
                            placeholder="Nome da opção"
                            className="text-xs h-8"
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeOption(sIdx, oIdx)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => addOption(sIdx)}>
                        <Plus className="h-3 w-3 mr-1" /> Opção
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTemplate ? "Salvar" : "Criar Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Cardapio() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/formularios?tab=cardapio", { replace: true });
  }, [navigate]);
  return null;
}
