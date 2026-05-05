import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BankAccountSelect } from "./BankAccountSelect";
import { formatCurrencyInput, parseCurrencyInput, numberToCurrencyDisplay } from "@/lib/currency-input";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { calcCardFee, isCardMethod, isDebitMethod, splitNonAntecipadoInstallments, type CardFeeRow } from "@/lib/cardFees";
import { checkDuplicatePayment, type DuplicateMatch } from "@/hooks/useDuplicatePaymentCheck";
import { DuplicatePaymentWarningDialog } from "./DuplicatePaymentWarningDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface PaymentFormSubmitData {
  type: string;
  amount: number; // NET amount (after card fee)
  due_date: string;
  payment_method: string;
  notes?: string;
  bank_account_id?: string;
  card_operator_id?: string;
  card_installments?: number;
  card_fee_percent?: number;
  gross_amount?: number;
  compensation_date?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PaymentFormSubmitData) => void;
  defaultValues?: { type?: string; amount?: number; due_date?: string; payment_method?: string; notes?: string; bank_account_id?: string };
  eventContext?: {
    eventId: string;
    eventTitle: string;
    eventDate: string;
    clientName?: string | null;
  };
}

export function PaymentFormDialog({ open, onOpenChange, onSubmit, defaultValues, eventContext }: Props) {
  const { currentCompany } = useCompany();
  const [type, setType] = useState(defaultValues?.type || "parcela");
  const [amount, setAmount] = useState(defaultValues?.amount ? numberToCurrencyDisplay(defaultValues.amount) : "");
  const [dueDate, setDueDate] = useState(defaultValues?.due_date || "");
  const [method, setMethod] = useState(defaultValues?.payment_method || "pix");
  const [notes, setNotes] = useState(defaultValues?.notes || "");
  const [bankAccountId, setBankAccountId] = useState(defaultValues?.bank_account_id || "");
  const [installments, setInstallments] = useState<number>(1);
  const [compensationDate, setCompensationDate] = useState<string>("");
  const [operatorId, setOperatorId] = useState<string>("");
  const [cardFees, setCardFees] = useState<CardFeeRow[]>([]);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<PaymentFormSubmitData | null>(null);
  const [checking, setChecking] = useState(false);

  // Load card fee operators
  useEffect(() => {
    if (!currentCompany?.id || !open) return;
    supabase
      .from("company_card_fees" as any)
      .select("*")
      .eq("company_id", currentCompany.id)
      .eq("is_active", true)
      .order("operator_name")
      .then(({ data }) => {
        const fees = (data || []) as unknown as CardFeeRow[];
        setCardFees(fees);
        if (fees.length === 1) setOperatorId(fees[0].id);
      });
  }, [currentCompany?.id, open]);

  const grossAmount = parseCurrencyInput(amount);
  const operator = cardFees.find(f => f.id === operatorId) || null;
  const isCard = isCardMethod(method);
  const isDebit = isDebitMethod(method);
  const calc = calcCardFee({ grossAmount, method, installments, operator });

  const finalizeSubmit = (data: PaymentFormSubmitData) => {
    onSubmit(data);
    onOpenChange(false);
    setAmount(""); setDueDate(""); setNotes(""); setBankAccountId(""); setCompensationDate("");
    setInstallments(1);
    setPendingSubmit(null);
    setDuplicateMatches([]);
    setDuplicateDialogOpen(false);
  };

  // Determine if we need to split into N monthly net installments
  // (non-antecipado credit card with > 1 parcela)
  const shouldSplit =
    isCard && !isDebit && operator && operator.antecipado === false && calc.installments > 1 && calc.feePercent > 0;

  const splitSlices = shouldSplit && dueDate
    ? splitNonAntecipadoInstallments(
        grossAmount,
        calc.feePercent,
        calc.installments,
        dueDate,
        operator?.prazo_recebimento_dias ?? 30,
      )
    : null;

  const handleSubmit = async () => {
    if (!grossAmount || !dueDate) return;
    if (method === "cheque" && !compensationDate) {
      return;
    }

    // CASE A: split into N parcelas (non-antecipado)
    if (splitSlices && splitSlices.length > 0) {
      for (const slice of splitSlices) {
        const sliceData: PaymentFormSubmitData = {
          type,
          amount: slice.amount,
          due_date: slice.due_date,
          payment_method: method,
          notes: `Parcela ${slice.index}/${slice.total} — Cartão ${calc.installments}x ${operator?.operator_name || ""} (sem antecipação)${notes.trim() ? ` — ${notes.trim()}` : ""}`,
          bank_account_id: bankAccountId || undefined,
        };
        if (operator) {
          sliceData.card_operator_id = operator.id;
          sliceData.card_installments = calc.installments;
          sliceData.card_fee_percent = calc.feePercent;
          sliceData.gross_amount = grossAmount / calc.installments; // bruto proporcional por parcela
        }
        // Sequential to preserve created_at order
        await onSubmit(sliceData);
      }
      onOpenChange(false);
      setAmount(""); setDueDate(""); setNotes(""); setBankAccountId(""); setCompensationDate("");
      setInstallments(1);
      return;
    }

    // CASE B: original behavior (single net parcela)
    const submitData: PaymentFormSubmitData = {
      type,
      amount: calc.netAmount,
      due_date: dueDate,
      payment_method: method,
      notes: notes.trim() || undefined,
      bank_account_id: bankAccountId || undefined,
      compensation_date: method === "cheque" ? compensationDate : undefined,
    };

    if (isCard && operator && calc.feePercent > 0) {
      submitData.card_operator_id = operator.id;
      submitData.card_installments = calc.installments;
      submitData.card_fee_percent = calc.feePercent;
      submitData.gross_amount = grossAmount;
    }

    if (eventContext && currentCompany?.id && !defaultValues) {
      setChecking(true);
      try {
        const matches = await checkDuplicatePayment({
          companyId: currentCompany.id,
          currentEventId: eventContext.eventId,
          amount: submitData.amount,
          paymentMethod: submitData.payment_method,
        });
        if (matches.length > 0) {
          setDuplicateMatches(matches);
          setPendingSubmit(submitData);
          setDuplicateDialogOpen(true);
          setChecking(false);
          return;
        }
      } catch (e) {
        console.error("[duplicate-check]", e);
      } finally {
        setChecking(false);
      }
    }

    finalizeSubmit(submitData);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{defaultValues ? "Editar Parcela" : "Nova Parcela"}</DialogTitle>
          {eventContext && (
            <div className="mt-2 rounded-lg border-2 border-primary/30 bg-primary/5 p-2.5">
              <p className="text-[10px] uppercase tracking-wide font-bold text-primary/70">Festa selecionada</p>
              <p className="text-sm font-bold text-foreground leading-tight mt-0.5">
                🎉 {eventContext.eventTitle}
              </p>
              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                {eventContext.clientName && <span>👤 {eventContext.clientName}</span>}
                <span>📅 {format(new Date(eventContext.eventDate + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
            </div>
          )}
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="parcela">Parcela</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input inputMode="decimal" value={amount} onChange={e => setAmount(formatCurrencyInput(e.target.value))} placeholder="0,00" />
          </div>
          <div>
            <Label>{shouldSplit ? "Data da venda" : "Vencimento"}</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            {shouldSplit && (
              <p className="text-[11px] text-muted-foreground mt-1">A 1ª parcela cairá {operator?.prazo_recebimento_dias ?? 30} dias após esta data.</p>
            )}
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
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {method === "cheque" && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
              <Label className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
                📅 Data de compensação do cheque
              </Label>
              <Input
                type="date"
                value={compensationDate}
                onChange={e => setCompensationDate(e.target.value)}
                className="bg-white"
              />
              <p className="text-[10px] text-muted-foreground">
                Quando o cheque deve cair na conta. O pagamento só será considerado efetivo nessa data.
              </p>
            </div>
          )}

          {isCard && (
            <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              {cardFees.length === 0 ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ Nenhuma operadora de cartão cadastrada. Cadastre em Configurações → Taxas de Cartão para que a taxa seja descontada automaticamente.
                </p>
              ) : (
                <>
                  {cardFees.length > 1 && (
                    <div>
                      <Label className="text-xs">Operadora</Label>
                      <Select value={operatorId} onValueChange={setOperatorId}>
                        <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Selecione a operadora" /></SelectTrigger>
                        <SelectContent>
                          {cardFees.map(f => <SelectItem key={f.id} value={f.id}>{f.operator_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {!isDebit && (
                    <div>
                      <Label className="text-xs">Parcelas</Label>
                      <Select value={String(installments)} onValueChange={v => setInstallments(Number(v))}>
                        <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                            <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {operator && grossAmount > 0 && calc.feePercent > 0 && (
                    <div className="text-xs space-y-0.5 pt-1 border-t border-amber-500/20">
                      <p className="font-medium text-amber-700 dark:text-amber-400">
                        💳 Taxa {operator.operator_name} {isDebit ? "Débito" : `${calc.installments}x`}: {calc.feePercent.toFixed(2)}%
                      </p>
                      <p className="text-muted-foreground">
                        Bruto R$ {grossAmount.toFixed(2)} − Taxa R$ {calc.feeAmount.toFixed(2)}
                      </p>
                      <p className="font-semibold text-foreground">
                        Líquido a receber: R$ {calc.netAmount.toFixed(2)}
                      </p>
                      {splitSlices && splitSlices.length > 0 && (
                        <div className="mt-2 rounded-md bg-blue-500/10 border border-blue-500/20 p-2 space-y-0.5">
                          <p className="font-semibold text-blue-700 dark:text-blue-400">
                            📅 Sem antecipação — {splitSlices.length} parcelas serão geradas
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            1ª: R$ {splitSlices[0].amount.toFixed(2)} em {splitSlices[0].due_date.split("-").reverse().join("/")} · Última: R$ {splitSlices[splitSlices.length - 1].amount.toFixed(2)} em {splitSlices[splitSlices.length - 1].due_date.split("-").reverse().join("/")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div>
            <Label>Anotações (opcional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Informações adicionais sobre a parcela"
              rows={2}
            />
          </div>
          <BankAccountSelect
            value={bankAccountId || null}
            onValueChange={setBankAccountId}
            label="Conta bancária (opcional)"
            placeholder="Selecione a conta"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={checking}>
            {checking ? "Verificando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <DuplicatePaymentWarningDialog
      open={duplicateDialogOpen}
      onOpenChange={(open) => {
        setDuplicateDialogOpen(open);
        if (!open) setPendingSubmit(null);
      }}
      matches={duplicateMatches}
      amount={pendingSubmit?.amount || 0}
      onConfirm={() => { if (pendingSubmit) finalizeSubmit(pendingSubmit); }}
    />
    </>
  );
}
