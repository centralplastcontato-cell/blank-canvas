import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
  Copy, Loader2, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onImported: () => void;
}

interface ParsedRow {
  line: number;
  name: string;
  phone: string;
  isFormerClient: boolean;
  formerPartyInfo: string;
  monthInterest: string;
  notes: string;
  status: "valid" | "error" | "duplicate";
  errorMsg?: string;
}

const MONTHS_MAP: Record<string, string> = {
  janeiro: "Janeiro", fevereiro: "Fevereiro", marco: "Março", março: "Março",
  abril: "Abril", maio: "Maio", junho: "Junho", julho: "Julho",
  agosto: "Agosto", setembro: "Setembro", outubro: "Outubro",
  novembro: "Novembro", dezembro: "Dezembro",
};

const CSV_TEMPLATE = `#;Nome do Contato;Telefone (com DDD);Ex-Cliente? (sim/nao);Info da Festa Anterior;Mes de Interesse;Observacoes
1;Maria Silva;11999887766;sim;Aniversario de 5 anos - Marco 2024;;Indicacao da Ana
2;Joao Santos;11988776655;nao;;Junho;Viu no Instagram
3;Carla Oliveira;21977665544;sim;Festa junina 2023;;Quer repetir este ano
4;Pedro Lima;31966554433;nao;;Outubro;Indicacao do Joao
5;Ana Souza;11955443322;nao;;Dezembro;Entrou em contato pelo site`;

function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) {
    digits = digits.substring(2);
  }
  return digits;
}

function parseBool(val: string): boolean {
  return ["sim", "s", "yes", "1", "true"].includes(val.trim().toLowerCase());
}

function unquote(s: string): string {
  const t = s.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1).trim();
  return t;
}

export function BaseLeadImportDialog({ open, onOpenChange, companyId, onImported }: Props) {
  const [step, setStep] = useState<"upload" | "confirm" | "importing" | "done">("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState({ imported: 0, duplicates: 0, errors: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setRows([]);
    setProgress(0);
    setImportResult({ imported: 0, duplicates: 0, errors: 0 });
  }, []);

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-leads-base.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      toast.error("Arquivo vazio ou sem dados");
      return;
    }

    const header = lines[0];
    const sep = header.includes(";") ? ";" : ",";

    // Detect if first column is a numbering column (#)
    const headerCols = header.split(sep).map(unquote);
    const hasNumberCol = headerCols[0]?.trim() === "#";

    // Fetch existing phones for duplicate detection
    const { data: existing } = await supabase
      .from("base_leads")
      .select("phone")
      .eq("company_id", companyId);
    const existingPhones = new Set((existing || []).map((r) => r.phone));

    const csvPhonesSeen = new Set<string>();
    const parsed: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      let cols = lines[i].split(sep).map(unquote);
      if (hasNumberCol) cols = cols.slice(1);
      const name = (cols[0] || "").slice(0, 100);
      const rawPhone = normalizePhone(cols[1] || "");
      const isFormer = parseBool(cols[2] || "");
      const formerInfo = (cols[3] || "").slice(0, 100);
      const rawMonth = (cols[4] || "").trim().toLowerCase();
      const notes = (cols[5] || "").slice(0, 500);

      const monthInterest = MONTHS_MAP[rawMonth] || "";

      let status: ParsedRow["status"] = "valid";
      let errorMsg: string | undefined;

      if (name.length < 2) {
        status = "error";
        errorMsg = "Nome inválido (mín. 2 caracteres)";
      } else if (rawPhone.length < 10 || rawPhone.length > 11) {
        status = "error";
        errorMsg = "Telefone inválido (10-11 dígitos)";
      } else if (existingPhones.has(rawPhone) || csvPhonesSeen.has(rawPhone)) {
        status = "duplicate";
        errorMsg = "Telefone já cadastrado";
      }

      if (status === "valid") csvPhonesSeen.add(rawPhone);

      parsed.push({
        line: i + 1,
        name,
        phone: rawPhone,
        isFormerClient: isFormer,
        formerPartyInfo: formerInfo,
        monthInterest,
        notes,
        status,
        errorMsg,
      });
    }

    setRows(parsed);
    setStep("confirm");
    // Reset file input
    if (fileRef.current) fileRef.current.value = "";
  };

  const validRows = rows.filter((r) => r.status === "valid");
  const errorRows = rows.filter((r) => r.status === "error");
  const dupeRows = rows.filter((r) => r.status === "duplicate");

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setStep("importing");

    const { data: user } = await supabase.auth.getUser();
    const userId = user?.user?.id || null;

    const records = validRows.map((r) => ({
      company_id: companyId,
      name: r.name,
      phone: r.phone,
      is_former_client: r.isFormerClient,
      former_party_info: r.isFormerClient ? r.formerPartyInfo || null : null,
      month_interest: !r.isFormerClient ? r.monthInterest || null : null,
      notes: r.notes || null,
      created_by: userId,
    }));

    const batchSize = 50;
    let imported = 0;
    let errors = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase.from("base_leads").insert(batch);
      if (error) {
        console.error("Batch insert error:", error);
        errors += batch.length;
      } else {
        imported += batch.length;
      }
      setProgress(Math.round(((i + batch.length) / records.length) * 100));
    }

    setImportResult({ imported, duplicates: dupeRows.length, errors: errors + errorRows.length });
    setStep("done");
    if (imported > 0) onImported();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-b from-primary/5 to-transparent shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Importar Contatos
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/80">
              {step === "upload" && "Baixe o modelo, preencha com seus contatos e envie o arquivo."}
              {step === "confirm" && "Confira os dados antes de importar."}
              {step === "importing" && "Importando contatos..."}
              {step === "done" && "Importação concluída!"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-4 overflow-y-auto flex-1">
          {/* Step: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              {/* Step 1 — Download template */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</div>
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  <p className="text-sm font-bold text-foreground">Baixe a planilha modelo para cadastrar seus contatos</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-9">
                  Este arquivo é uma planilha pronta com todas as colunas necessárias para você cadastrar seus contatos em massa. Baixe, preencha com os dados dos seus contatos no <strong>Excel</strong> ou <strong>Google Sheets</strong>, e depois envie aqui.
                </p>
                <div className="pl-9 space-y-2">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground/80">
                    <span>📋 <strong>Obrigatórios:</strong> nome, telefone</span>
                    <span>📌 <strong>Opcionais:</strong> ex_cliente, info_festa, mes_interesse, observações</span>
                  </div>
                  <Button onClick={downloadTemplate} size="default" className="rounded-xl shadow-sm shadow-primary/20 gap-1.5 w-full sm:w-auto">
                    <Download className="w-4 h-4" />
                    Baixar planilha de cadastro (.csv)
                  </Button>
                </div>
              </div>

              {/* Step 2 — Upload file */}
              <div className="rounded-xl border border-dashed border-border/60 p-4 space-y-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted-foreground/20 text-muted-foreground text-xs font-bold shrink-0">2</div>
                  <p className="text-sm font-bold text-foreground">Envie a planilha preenchida com seus contatos</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-9">
                  Formatos aceitos: <code className="bg-muted px-1 py-0.5 rounded text-[11px]">.csv</code> separado por <code className="bg-muted px-1 py-0.5 rounded text-[11px]">;</code> ou <code className="bg-muted px-1 py-0.5 rounded text-[11px]">,</code>
                </p>
                <div className="pl-9">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv,*/*"
                    onChange={handleFile}
                    className="hidden"
                  />
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="rounded-xl gap-1.5">
                    <Upload className="w-4 h-4" />
                    Selecionar arquivo
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step: Confirm */}
          {step === "confirm" && (
            <div className="space-y-4">
              {/* Summary badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1.5 text-xs border-green-500/30 text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {validRows.length} válido{validRows.length !== 1 ? "s" : ""}
                </Badge>
                {dupeRows.length > 0 && (
                  <Badge variant="outline" className="gap-1.5 text-xs border-yellow-500/30 text-yellow-700 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-400">
                    <Copy className="w-3.5 h-3.5" />
                    {dupeRows.length} duplicata{dupeRows.length !== 1 ? "s" : ""}
                  </Badge>
                )}
                {errorRows.length > 0 && (
                  <Badge variant="outline" className="gap-1.5 text-xs border-red-500/30 text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errorRows.length} erro{errorRows.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>

              {/* Preview table */}
              <div className="rounded-xl border border-border/40 overflow-hidden max-h-[40vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs w-10">#</TableHead>
                      <TableHead className="text-xs">Nome</TableHead>
                      <TableHead className="text-xs">Telefone</TableHead>
                      <TableHead className="text-xs w-24">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.line} className={
                        r.status === "error" ? "bg-red-50/50 dark:bg-red-950/10" :
                        r.status === "duplicate" ? "bg-yellow-50/50 dark:bg-yellow-950/10" : ""
                      }>
                        <TableCell className="text-xs text-muted-foreground py-2">{r.line}</TableCell>
                        <TableCell className="text-xs py-2 font-medium">{r.name || "—"}</TableCell>
                        <TableCell className="text-xs py-2 font-mono">{r.phone || "—"}</TableCell>
                        <TableCell className="py-2">
                          {r.status === "valid" && (
                            <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400">OK</Badge>
                          )}
                          {r.status === "duplicate" && (
                            <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-700 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-400" title={r.errorMsg}>Duplicata</Badge>
                          )}
                          {r.status === "error" && (
                            <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400" title={r.errorMsg}>Erro</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Action buttons */}
              <div className="flex justify-between pt-2 border-t border-border/30">
                <Button variant="ghost" size="sm" onClick={reset} className="rounded-xl">
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Voltar
                </Button>
                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={validRows.length === 0}
                  className="rounded-xl px-5 shadow-md shadow-primary/20"
                >
                  Importar {validRows.length} contato{validRows.length !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          )}

          {/* Step: Importing */}
          {step === "importing" && (
            <div className="py-8 space-y-4 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-sm font-medium">Importando contatos...</p>
              <Progress value={progress} className="h-2 rounded-full" />
              <p className="text-xs text-muted-foreground">{progress}%</p>
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && (
            <div className="py-6 space-y-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
              <p className="text-lg font-bold">Importação concluída!</p>
              <div className="flex justify-center gap-3 flex-wrap">
                {importResult.imported > 0 && (
                  <Badge variant="outline" className="text-xs border-green-500/30 text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400">
                    ✓ {importResult.imported} importado{importResult.imported !== 1 ? "s" : ""}
                  </Badge>
                )}
                {importResult.duplicates > 0 && (
                  <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-700 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-400">
                    ⊘ {importResult.duplicates} duplicata{importResult.duplicates !== 1 ? "s" : ""}
                  </Badge>
                )}
                {importResult.errors > 0 && (
                  <Badge variant="outline" className="text-xs border-red-500/30 text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400">
                    ✕ {importResult.errors} erro{importResult.errors !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <Button size="sm" onClick={() => handleClose(false)} className="rounded-xl px-6 mt-2">
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
