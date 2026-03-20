import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface Props {
  content: string;
  companyName: string;
  companyLogo?: string;
  packageName?: string;
}

export function ContractPreviewPrint({ content, companyName, companyLogo, packageName }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const headerTitle = `Contrato de Festa${packageName ? ` ${packageName}` : ""}`;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title> </title>
        <style>
          @page { margin: 2cm; size: A4; }
          body {
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.8;
            color: #1a1a1a;
            max-width: 700px;
            margin: 0 auto;
            padding: 20px;
          }
          .header { text-align: center; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #333; }
          .header img { height: 100px; margin-bottom: 12px; }
          .header h1 { font-size: 14pt; margin: 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
          .content { white-space: pre-wrap; word-wrap: break-word; }
          .footer { margin-top: 60px; text-align: center; font-size: 9pt; color: #666; border-top: 1px solid #ccc; padding-top: 15px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          ${companyLogo ? `<img src="${companyLogo}" alt="" />` : ""}
          <h1>${headerTitle}</h1>
        </div>
        <div class="content">${content}</div>
        <div class="footer">
          <p>Documento gerado pela plataforma CELEBREI</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 text-xs rounded-full">
          <Printer className="h-3.5 w-3.5" /> Imprimir / PDF
        </Button>
      </div>
      <div
        ref={printRef}
        className="rounded-2xl border border-border/40 bg-white dark:bg-card p-6 md:p-8 shadow-sm"
      >
        {/* Header */}
        <div className="text-center mb-6 pb-4 border-b-2 border-foreground/20">
          {companyLogo && <img src={companyLogo} alt="" className="h-20 md:h-24 mx-auto mb-3" />}
          <h2 className="text-sm md:text-base font-semibold text-foreground uppercase tracking-wide">{headerTitle}</h2>
        </div>

        {/* Content */}
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 font-serif">
          {content}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-border/40 text-center">
          <p className="text-[10px] text-muted-foreground">
            Documento gerado pela plataforma CELEBREI — {new Date().toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>
    </div>
  );
}
