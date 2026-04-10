import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, AlertTriangle, FileSignature, Calendar, Package, Eye, ArrowLeft, Lock, Loader2, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { sendContractViaWhatsApp, logContractAction } from "./contractAuditHelpers";
import { toast } from "@/hooks/use-toast";

/** Convert **bold** markdown markers into <strong> tags.
 *  Handles bold blocks that span multiple lines by tracking open/close state. */
function parseBoldMarkdown(text: string): string {
  const lines = text.split('\n');
  let inBold = false;
  const result = lines.map(line => {
    // First handle complete **..** pairs within this line
    line = line.replace(/\*\*([^\n]+?)\*\*/g, (_m, inner) => `<strong>${inner}</strong>`);
    // Count remaining unmatched ** markers
    const parts = line.split('**');
    if (parts.length > 1) {
      let rebuilt = '';
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) {
          inBold = !inBold;
          rebuilt += inBold ? '<strong>' : '</strong>';
        }
        rebuilt += parts[i];
      }
      return rebuilt;
    }
    if (inBold) {
      return `<strong>${line}</strong>`;
    }
    return line;
  });
  let output = result.join('\n');
  if (inBold) output += '</strong>';
  output = output.replace(/<strong><\/strong>/g, '');
  return output;
}

interface ContractMeta {
  modelName?: string;
  templateVersion?: number;
  generatedAt?: string;
  status?: string;
  eventDate?: string;
  leadName?: string;
  eventType?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  companyName: string;
  companyLogo?: string;
  mode: "preview" | "generated";
  meta?: ContractMeta;
  unresolvedVars?: string[];
  missingRequired?: string[];
  onGenerate?: () => void;
  generating?: boolean;
  canGenerate?: boolean;
  /** WhatsApp send support */
  contractId?: string;
  leadId?: string;
  companyId?: string;
  userId?: string;
}

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho", gerado: "Gerado", enviado: "Enviado", assinado: "Assinado", cancelado: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  gerado: "bg-blue-500/15 text-blue-700 border-blue-300",
  enviado: "bg-amber-500/15 text-amber-700 border-amber-300",
  assinado: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
  cancelado: "bg-red-500/15 text-red-700 border-red-300",
};

export function ContractDocumentViewer({
  open, onOpenChange, content, companyName, companyLogo,
  mode, meta, unresolvedVars = [], missingRequired = [],
  onGenerate, generating, canGenerate,
  contractId, leadId, companyId, userId,
}: Props) {
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  const handleSendWhatsApp = async () => {
    if (!companyId || !leadId || !content) return;
    setSendingWhatsApp(true);
    try {
      const result = await sendContractViaWhatsApp(companyId, leadId, content, meta?.modelName || "Contrato");
      if (result.success) {
        toast({ title: "Contrato enviado via WhatsApp ✅" });
        if (contractId && userId) {
          await logContractAction(companyId, contractId, undefined, "contract_sent_whatsapp", userId, { lead_id: leadId });
        }
      } else {
        toast({ title: "Erro ao enviar", description: result.error, variant: "destructive" });
      }
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const showWhatsAppButton = !!leadId && !!companyId && mode === "generated";

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title></title>
        <style>
          @page { size: A4; margin: 1.5cm 2cm; }
          * { box-sizing: border-box; }
          body {
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.7;
            color: #1a1a1a;
            max-width: 680px;
            margin: 0 auto;
            padding: 0;
          }
          .header {
            text-align: center;
            margin-bottom: 24px;
            padding-bottom: 12px;
            border-bottom: 2px solid #222;
          }
          .header img { height: 144px; margin-bottom: 6px; display: block; margin-left: auto; margin-right: auto; }
          .header h1 { font-size: 14pt; margin: 0; letter-spacing: 1px; text-transform: uppercase; }
          .content {
            white-space: pre-wrap;
            word-wrap: break-word;
            text-align: justify;
          }
          .content p { margin: 0 0 8px 0; }
          .footer {
            margin-top: 48px;
            text-align: center;
            font-size: 8pt;
            color: #888;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
          @media print {
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${companyLogo ? `<img src="${companyLogo}" alt="" />` : ""}
          <h1>Contrato de festa ${companyName}</h1>
        </div>
        <div class="content">${parseBoldMarkdown(content)}</div>
        <div class="footer">
          <p>Documento gerado pela plataforma CELEBREI — ${new Date().toLocaleDateString("pt-BR")}</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const hasWarnings = unresolvedVars.length > 0 || missingRequired.length > 0;
  const isLoading = !content && mode === "preview";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[95vh] flex flex-col p-0 gap-0 overflow-hidden print-hide-chrome [&>button]:hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border/40 bg-card shrink-0 print-hide relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="gap-1.5 text-xs rounded-full shrink-0 relative z-10">
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </Button>
            <div className="min-w-0">
              <h2 className="text-sm font-bold truncate flex items-center gap-2">
                {mode === "preview" ? (
                  <>
                    <Eye className="h-4 w-4 text-primary shrink-0" />
                    Preview do Contrato
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 text-emerald-600 shrink-0" />
                    {meta?.modelName || "Contrato"}
                  </>
                )}
              </h2>
              {mode === "generated" && meta && (
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  {meta.status && (
                    <Badge className={`text-[10px] ${STATUS_COLORS[meta.status] || ""}`}>
                      {STATUS_LABELS[meta.status] || meta.status}
                    </Badge>
                  )}
                  {meta.templateVersion && (
                    <span className="text-[10px] text-muted-foreground">v{meta.templateVersion}</span>
                  )}
                  {meta.generatedAt && (
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(meta.generatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </div>
              )}
              {mode === "preview" && meta?.modelName && (
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="text-[10px] text-muted-foreground">Modelo: {meta.modelName}</span>
                  {meta.templateVersion && <span className="text-[10px] text-muted-foreground">v{meta.templateVersion}</span>}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={isLoading} className="gap-1.5 text-xs rounded-full">
              <Printer className="h-3.5 w-3.5" /> Imprimir
            </Button>
            {mode === "preview" && onGenerate && (
              <Button
                size="sm"
                onClick={onGenerate}
                disabled={generating || !canGenerate || isLoading}
                className="gap-1.5 text-xs rounded-full"
              >
                {generating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileSignature className="h-3.5 w-3.5" />
                )}
                Confirmar e Gerar
              </Button>
            )}
          </div>
        </div>

        {/* Warnings */}
        {hasWarnings && (
          <div className="px-4 md:px-6 py-2 bg-amber-500/5 border-b border-amber-300/30 shrink-0 space-y-1.5 print-hide">
            {missingRequired.length > 0 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-destructive">Dados obrigatórios faltando — geração bloqueada:</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {missingRequired.map(f => (
                      <Badge key={f} variant="outline" className="text-[10px] border-destructive/40 text-destructive">{f}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {unresolvedVars.length > 0 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-700">Variáveis não resolvidas:</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {unresolvedVars.map(v => (
                      <Badge key={v} variant="outline" className="text-[10px] border-amber-400 text-amber-700 font-mono">{`{{${v}}}`}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generated contract frozen badge */}
        {mode === "generated" && (
          <div className="px-4 md:px-6 py-2 bg-emerald-500/5 border-b border-emerald-300/20 shrink-0 print-hide">
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <Lock className="h-3 w-3" /> Contrato congelado — somente leitura
              </span>
              {meta?.leadName && (
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {meta.leadName}</span>
              )}
              {meta?.eventDate && (
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {meta.eventDate}</span>
              )}
              {meta?.eventType && (
                <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {meta.eventType}</span>
              )}
            </div>
          </div>
        )}

        {/* Document area */}
        <div className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="max-w-[720px] mx-auto bg-white dark:bg-card rounded-xl shadow-sm border border-border/30 p-8 md:p-12 print-contract-body">
              {/* Document header */}
              <div className="text-center mb-8 pb-4 border-b-2 border-foreground/15">
                {companyLogo && (
                  <img src={companyLogo} alt="" className="h-36 md:h-40 mx-auto mb-3" />
                )}
                <h2 className="text-base md:text-lg font-bold text-foreground tracking-wide uppercase">
                  Contrato de festa {companyName}
                </h2>
              </div>

              {/* Document content */}
              <div
                className="whitespace-pre-wrap text-sm leading-[1.85] text-foreground/90 font-serif text-justify"
                dangerouslySetInnerHTML={{ __html: parseBoldMarkdown(content) }}
              />

              {/* Document footer */}
              <div className="mt-16 pt-4 border-t border-border/30 text-center">
                <p className="text-[10px] text-muted-foreground">
                  Documento gerado pela plataforma CELEBREI — {new Date().toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
