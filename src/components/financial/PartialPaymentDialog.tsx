import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BankAccountSelect } from "./BankAccountSelect";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/currency-input";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    amount: number;
    payment_method?: string;
    bank_account_id?: string;
    receipt_url?: string;
    paid_by?: string;
    notes?: string;
  }) => Promise<boolean | undefined>;
  paymentAmount: number;
  paidSoFar: number;
  paymentLabel: string;
}

export function PartialPaymentDialog({ open, onOpenChange, onSubmit, paymentAmount, paidSoFar, paymentLabel }: Props) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("pix");
  const [bankAccountId, setBankAccountId] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const typedAmount = parseCurrencyInput(amount) || 0;
  const newPaidSoFar = paidSoFar + typedAmount;
  const remaining = Math.max(paymentAmount - newPaidSoFar, 0);
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `receipts/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('expense-receipts').upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('expense-receipts').getPublicUrl(path);
      setReceiptUrl(urlData.publicUrl);
      toast({ title: 'Comprovante enviado' });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    const val = parseCurrencyInput(amount);
    const originalRemaining = paymentAmount - paidSoFar;
    if (!val || val <= 0) return;
    if (val > originalRemaining + 0.01) {
      toast({ title: 'Valor excede o saldo', description: `Restante: ${fmt(originalRemaining)}`, variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const success = await onSubmit({
        amount: val,
        payment_method: method || undefined,
        bank_account_id: bankAccountId || undefined,
        receipt_url: receiptUrl || undefined,
        paid_by: paidBy.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      if (success !== false) {
        onOpenChange(false);
        setAmount(""); setPaidBy(""); setNotes(""); setReceiptUrl(""); setBankAccountId("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagamento Parcial</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">{paymentLabel}</p>
        </DialogHeader>

        <div className="rounded-lg bg-muted/50 p-3 mb-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Valor total:</span>
            <span className="font-semibold text-foreground">{fmt(paymentAmount)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Já pago:</span>
            <span className="font-semibold text-emerald-500">{fmt(newPaidSoFar)}</span>
          </div>
          <div className="flex justify-between text-xs font-bold mt-1 pt-1 border-t border-border">
            <span>Restante:</span>
            <span className={remaining > 0 ? "text-amber-500" : "text-emerald-500"}>{fmt(remaining)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Valor do pagamento (R$)</Label>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(formatCurrencyInput(e.target.value))}
              placeholder="0,00"
              autoFocus
            />
          </div>
          <div>
            <Label>Forma de Pagamento</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <BankAccountSelect
            value={bankAccountId || null}
            onValueChange={setBankAccountId}
            label="Conta bancária (opcional)"
            placeholder="Selecione a conta"
          />
          <div>
            <Label>Quem pagou (opcional)</Label>
            <Input value={paidBy} onChange={e => setPaidBy(e.target.value)} placeholder="Nome de quem realizou o pagamento" />
          </div>

          {/* Anexos section */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wide">
              <Upload className="h-3.5 w-3.5" />
              Anexos
            </div>
            <div>
              <Label className="text-xs font-medium">Comprovante de pagamento</Label>
              <div className="mt-1.5">
                <label className="flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-lg border border-dashed border-border bg-background text-xs cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {uploading ? "Enviando..." : receiptUrl ? "✅ Comprovante enviado" : "Anexar comprovante de pagamento"}
                  </span>
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleUploadReceipt} disabled={uploading} />
                </label>
                {receiptUrl && (
                  <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline mt-1 inline-block">
                    Ver comprovante
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Observações section */}
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wide">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              Observações
            </div>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detalhes adicionais sobre o pagamento" rows={2} className="bg-background" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting || !parseCurrencyInput(amount)}>
            {submitting ? "Salvando..." : "Registrar Pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
