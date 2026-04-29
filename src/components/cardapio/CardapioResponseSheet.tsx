import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { User, Calendar, PartyPopper, Eye, Loader2, Trash2, Settings2, Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
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

interface CardapioTemplateLite {
  id: string;
  name: string;
  sections: CardapioSection[];
}

interface CompanyLite {
  name: string;
  logo_url?: string | null;
}

interface CardapioResponseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A festa/evento de onde a resposta veio (necessário para buscar templates de outros cardápios) */
  response: any | null;
  /** Template usado para renderizar as seções (com emoji/título). Se nulo, exibe sectionId. */
  template: CardapioTemplateLite | null;
  /** Empresa para o cabeçalho do PDF. */
  company: CompanyLite | null;
  /** Lista completa de templates da empresa (para troca de template no PDF). */
  allTemplates?: CardapioTemplateLite[];
  /** Callback opcional para apagar a resposta. Se ausente, esconde o botão. */
  onDelete?: (id: string) => Promise<void> | void;
  /** Estilo lateral — "right" abre da direita (padrão), use "left" se quiser espelhar. */
  side?: "right" | "left";
  /** Classes adicionais para o SheetContent (permite reposicionar). */
  contentClassName?: string;
}

export function CardapioResponseSheet({
  open,
  onOpenChange,
  response,
  template,
  company,
  allTemplates,
  onDelete,
  side = "right",
}: CardapioResponseSheetProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; fileName: string; blob: Blob } | null>(null);
  const [eventResponses, setEventResponses] = useState<any[]>([]);
  const [pdfTemplateId, setPdfTemplateId] = useState<string | null>(null);
  const [pdfResponseId, setPdfResponseId] = useState<string | null>(null);
  const [printPrefs, setPrintPrefs] = useCardapioPrintPrefs();

  useEffect(() => {
    if (!response?.event_id) {
      setEventResponses([]);
      setPdfTemplateId(response?.template_id ?? null);
      setPdfResponseId(response?.id ?? null);
      return;
    }
    setPdfTemplateId(response.template_id);
    setPdfResponseId(response.id);
    (async () => {
      const { data } = await supabase
        .from("cardapio_responses")
        .select("id, template_id, respondent_name, created_at, answers, company_events(event_date, title, guest_count)")
        .eq("event_id", response.event_id)
        .order("created_at", { ascending: false });
      setEventResponses(data || []);
    })();
  }, [response]);

  const availablePdfChoices = (() => {
    const choices: { templateId: string; responseId: string; templateName: string }[] = [];
    const seen = new Set<string>();
    for (const r of eventResponses) {
      if (seen.has(r.template_id)) continue;
      seen.add(r.template_id);
      const tpl = allTemplates?.find((t) => t.id === r.template_id);
      choices.push({ templateId: r.template_id, responseId: r.id, templateName: tpl?.name || "Cardápio" });
    }
    if (choices.length === 0 && response) {
      choices.push({
        templateId: response.template_id,
        responseId: response.id,
        templateName: template?.name || "Cardápio",
      });
    }
    return choices;
  })();

  const getDisplayName = (r: any) => {
    const name = (r?.respondent_name || "").trim();
    if (name) return name;
    const ev = r?.company_events;
    const leadName = ev?.campaign_leads?.name?.trim();
    if (leadName) return leadName;
    const parents = ev?.parent_names?.trim();
    if (parents) return parents;
    const child = ev?.child_name?.trim();
    if (child) return child;
    const eventTitle = ev?.title?.trim();
    if (eventTitle) return eventTitle;
    return "Anônimo";
  };

  const renderAnswers = (r: any) => {
    const answersArr = Array.isArray(r.answers) ? r.answers : [];
    return answersArr.map((a: any, idx: number) => {
      const section = template?.sections.find((s) => s.id === a.sectionId);
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
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side={side} className="w-full sm:max-w-md overflow-y-auto overflow-x-hidden">
          {response && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-base font-semibold">{getDisplayName(response)}</p>
                    <p className="text-xs text-muted-foreground font-normal">
                      Preenchido em {format(new Date(response.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    {response.company_events?.event_date && (
                      <p className="text-xs text-primary font-normal flex items-center gap-1">
                        <PartyPopper className="h-3 w-3" />
                        Festa: {format(new Date(response.company_events.event_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="divide-y divide-border rounded-xl border border-border bg-muted/20">
                {renderAnswers(response)}
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

              <div className="pt-4 flex flex-wrap gap-2 items-center justify-between">
                <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 px-2.5 gap-1 text-xs"
                    disabled={printing || !pdfTemplateId}
                    onClick={async () => {
                      const tpl =
                        allTemplates?.find((t) => t.id === pdfTemplateId) ||
                        (pdfTemplateId === template?.id ? template : null);
                      const resp =
                        eventResponses.find((r) => r.id === pdfResponseId) || response;
                      if (!tpl || !resp) {
                        toast({ title: "Template não encontrado", variant: "destructive" });
                        return;
                      }
                      setPrinting(true);
                      try {
                        const result = await generateCardapioPrintPDF(
                          resp,
                          tpl as any,
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
                    {printing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                    PDF
                  </Button>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 gap-1 text-xs"
                        title="Preferências de impressão"
                      >
                        <Settings2 className="h-3 w-3" />
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
                      <Button variant="ghost" size="sm" className="h-8 px-2.5 gap-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3 w-3" /> Apagar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Apagar resposta?</AlertDialogTitle>
                        <AlertDialogDescription>
                          A resposta de <strong>{getDisplayName(response)}</strong> será excluída permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={deletingId === response.id}
                          onClick={async (e) => {
                            e.preventDefault();
                            setDeletingId(response.id);
                            await onDelete(response.id);
                            setDeletingId(null);
                            onOpenChange(false);
                          }}
                        >
                          {deletingId === response.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
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
