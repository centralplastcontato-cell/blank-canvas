import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Plus, Trash2, CheckCircle, RotateCcw, Tag, Receipt, Clock, CreditCard, Building, Package, Pencil, Coins, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useEventFinancial } from "@/hooks/useEventFinancial";
import { FinancialSummaryCards } from "./FinancialSummaryCards";
import { PaymentFormDialog } from "./PaymentFormDialog";
import { PartialPaymentDialog } from "./PartialPaymentDialog";
import { FinancialTimeline } from "./FinancialTimeline";
import { BankAccountSelect } from "./BankAccountSelect";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { supabase } from "@/integrations/supabase/client";

const METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão Crédito",
  cartao_debito: "Cartão Débito",
  transferencia: "Transferência",
};

const STATUS_BADGE: Record<string, { label: string; className: string; bgRow: string }> = {
  pending: { label: "Pendente", className: "bg-muted text-muted-foreground border-border", bgRow: "" },
  paid: { label: "Pago", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", bgRow: "bg-emerald-500/[0.04] border-emerald-500/20" },
  late: { label: "Atrasado", className: "bg-red-500/20 text-red-400 border-red-500/30", bgRow: "bg-red-500/[0.04] border-red-500/20" },
  partial: { label: "Parcial", className: "bg-amber-500/20 text-amber-500 border-amber-500/30", bgRow: "bg-amber-500/[0.04] border-amber-500/20" },
};

interface CatalogOptional {
  id: string;
  name: string;
  description: string | null;
  value: number | null;
  valor_por_pessoa: number | null;
}

interface Props {
  eventId: string;
  companyId: string;
  baseValue: number;
  canEdit?: boolean;
  canPay?: boolean;
  showValues?: boolean;
  onAddOptional?: () => void;
  onConsentSubmit?: (params: { actionType: string; entityId: string; entityTable: string; payload: Record<string, any>; description?: string; amount?: number }) => Promise<boolean | undefined>;
}

export function EventFinancialTab({ eventId, companyId, baseValue, canEdit = true, canPay = true, showValues = true, onAddOptional: _onAddOptional, onConsentSubmit }: Props) {
  const financial = useEventFinancial(eventId, companyId, baseValue);
  const { activeAccounts } = useBankAccounts();
  const bankAccountMap = useMemo(() => {
    const map: Record<string, string> = {};
    activeAccounts.forEach(a => { map[a.id] = a.name; });
    return map;
  }, [activeAccounts]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [extraDialogOpen, setExtraDialogOpen] = useState(false);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [extraDesc, setExtraDesc] = useState("");
  const [extraAmount, setExtraAmount] = useState("");
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">("fixed");
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [recentlyPaidIds, setRecentlyPaidIds] = useState<Set<string>>(new Set());
  const [markPaidPayment, setMarkPaidPayment] = useState<any>(null);
  const [markPaidBankId, setMarkPaidBankId] = useState<string | null>(null);
  const [optionalDialogOpen, setOptionalDialogOpen] = useState(false);
  const [catalogOptionals, setCatalogOptionals] = useState<CatalogOptional[]>([]);
  const [selectedOptionalId, setSelectedOptionalId] = useState<string>("");
  const [optionalQty, setOptionalQty] = useState(1);
  const [optionalDueDate, setOptionalDueDate] = useState<string>("");
  const [optionalManualMode, setOptionalManualMode] = useState(false);
  const [optionalManualName, setOptionalManualName] = useState("");
  const [optionalManualValue, setOptionalManualValue] = useState<number | null>(null);
  const [addingOptional, setAddingOptional] = useState(false);
  const syncAttempted = useRef(false);
  const [partialPaymentTarget, setPartialPaymentTarget] = useState<any>(null);
  const [expandedPaymentIds, setExpandedPaymentIds] = useState<Set<string>>(new Set());

  // Auto-sync: if no payments exist but event has payment_details, sync them
  useEffect(() => {
    if (financial.isLoading || syncAttempted.current) return;
    // If ANY payments exist (even just a paid entrada), skip backfill
    // This prevents re-creating manually deleted parcelas
    if (financial.payments.length > 0) return;
    syncAttempted.current = true;

    (async () => {
      const [{ data: ev }, { data: feesData }] = await Promise.all([
        supabase
          .from("company_events")
          .select("payment_details")
          .eq("id", eventId)
          .single(),
        supabase
          .from("company_card_fees" as any)
          .select("*")
          .eq("company_id", companyId)
          .eq("is_active", true),
      ]);
      const pd = ev?.payment_details as any;
      if (!pd) return;

      const fees = (feesData || []) as any[];
      const getCardTax = (parcelas: number): number => {
        if (fees.length === 0) return 0;
        const op = fees[0];
        const key = `taxa_credito_${Math.min(Math.max(1, parcelas), 12)}x`;
        return Number(op[key] || 0);
      };

      const today = new Date().toISOString().split("T")[0];
      const parseAmount = (value: unknown): number | null => {
        if (typeof value === "number") return Number.isFinite(value) ? value : null;
        if (typeof value !== "string") return null;
        const cleaned = value.trim().replace(/R\$\s?/g, "").replace(/\s/g, "");
        if (!cleaned) return null;
        const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
      };
      const parseDate = (value: unknown): string => {
        if (typeof value !== "string") return today;
        const v = value.trim();
        if (!v) return today;
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
          const [d, m, y] = v.split("/");
          return `${y}-${m}-${d}`;
        }
        return today;
      };

      const rows: any[] = [];
      const entradaAmount = parseAmount(pd.entrada_valor);
      if (entradaAmount && entradaAmount > 0) {
        let amount = entradaAmount;
        // Card payments: store NET amount (after fee discount)
        if (pd.entrada_forma === "cartao") {
          const parcelas = Math.max(1, Number(pd.entrada_parcelas) || 1);
          const taxa = getCardTax(parcelas);
          if (taxa > 0) amount = entradaAmount - (entradaAmount * taxa / 100);
        }
        rows.push({
          event_id: eventId, company_id: companyId, type: "entrada",
          amount: Math.round(amount * 100) / 100,
          due_date: parseDate(pd.entrada_data),
          payment_method: pd.entrada_forma || null, status: "pending",
        });
      }

      // For card balance: single row with net amount, NO installment splitting
      if (pd.saldo_forma === "cartao") {
        const saldoAmount = parseAmount(pd.saldo_valor);
        if (saldoAmount && saldoAmount > 0) {
          const parcelas = Math.max(1, Number(pd.parcelas) || 1);
          const taxa = getCardTax(parcelas);
          let amount = saldoAmount;
          if (taxa > 0) amount = saldoAmount - (saldoAmount * taxa / 100);
          rows.push({
            event_id: eventId, company_id: companyId, type: "parcela",
            amount: Math.round(amount * 100) / 100,
            due_date: parseDate(pd.saldo_data),
            payment_method: "cartao", status: "pending",
          });
        }
      } else {
        // Non-card: keep existing installment logic
        let createdFromDetails = false;
        if (pd.parcelas_details?.length) {
          pd.parcelas_details.forEach((p: any) => {
            const parcelaAmount = parseAmount(p?.valor);
            if (parcelaAmount && parcelaAmount > 0) {
              createdFromDetails = true;
              rows.push({
                event_id: eventId, company_id: companyId, type: "parcela",
                amount: parcelaAmount,
                due_date: parseDate(p?.vencimento || pd.saldo_data),
                payment_method: pd.saldo_forma || null, status: "pending",
              });
            }
          });
        }

        if (!createdFromDetails) {
          const saldoAmount = parseAmount(pd.saldo_valor);
          if (saldoAmount && saldoAmount > 0) {
            rows.push({
              event_id: eventId, company_id: companyId, type: "parcela",
              amount: saldoAmount,
              due_date: parseDate(pd.saldo_data),
              payment_method: pd.saldo_forma || null, status: "pending",
            });
          }
        }
      }

      if (rows.length > 0) {
        await supabase.from("event_payments").insert(rows);
        financial.refresh();
      }
    })();
  }, [financial.isLoading, financial.payments.length, eventId, companyId]);

  const handleMarkAsPaid = async (payment: any) => {
    setMarkPaidPayment(payment);
    setMarkPaidBankId(null);
  };

  const confirmMarkAsPaid = async () => {
    if (!markPaidPayment) return;
    
    if (onConsentSubmit) {
      const success = await onConsentSubmit({
        actionType: 'payment_paid',
        entityId: markPaidPayment.id,
        entityTable: 'event_payments',
        payload: { bank_account_id: markPaidBankId || null },
        description: `Parcela - ${markPaidPayment.type === 'entrada' ? 'Entrada' : 'Parcela'} R$ ${markPaidPayment.amount.toFixed(2)}`,
        amount: markPaidPayment.amount,
      });
      if (success) {
        setMarkPaidPayment(null);
        setMarkPaidBankId(null);
      }
      return;
    }
    
    await financial.markAsPaid(markPaidPayment, markPaidBankId);
    setRecentlyPaidIds(prev => new Set(prev).add(markPaidPayment.id));
    setMarkPaidPayment(null);
    setMarkPaidBankId(null);
    setTimeout(() => {
      setRecentlyPaidIds(prev => {
        const next = new Set(prev);
        next.delete(markPaidPayment.id);
        return next;
      });
    }, 2000);
  };

  const handleAddExtra = () => {
    const val = parseFloat(extraAmount);
    if (!extraDesc || !val) return;
    financial.addExtra({ description: extraDesc, amount: val });
    setExtraDialogOpen(false);
    setExtraDesc(""); setExtraAmount("");
  };

  const handleAddDiscount = () => {
    const val = parseFloat(discountValue);
    if (!val) return;
    financial.addDiscount({ type: discountType, value: val, reason: discountReason || undefined });
    setDiscountDialogOpen(false);
    setDiscountValue(""); setDiscountReason("");
  };

  const fmt = (v: number) => showValues ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "••••";

  const resetOptionalDialog = () => {
    setOptionalDialogOpen(false);
    setSelectedOptionalId("");
    setOptionalQty(1);
    setOptionalDueDate("");
    setOptionalManualMode(false);
    setOptionalManualName("");
    setOptionalManualValue(null);
  };

  // Add optional directly from sidebar
  const handleAddOptionalInline = async (catalogOpt: CatalogOptional) => {
    if (!eventId || !companyId) return;
    setAddingOptional(true);
    try {
      const guests = eventGuestCount;
      const unitPrice = catalogOpt.value || 0;
      const ppVal = catalogOpt.valor_por_pessoa || 0;
      const qty = optionalQty;
      const totalValue = (unitPrice * qty) + (ppVal > 0 ? ppVal * guests * qty : 0);

      const newOpt = {
        name: catalogOpt.name,
        value: unitPrice,
        valor_por_pessoa: ppVal,
        quantity: qty,
        unit_price: unitPrice,
      };

      const updatedOptionals = [...eventOptionals, newOpt];

      // Update event_optionals on company_events
      // We need to recalc: baseValue from package + all optionals
      const { data: eventData } = await supabase
        .from("company_events")
        .select("total_value")
        .eq("id", eventId)
        .single();

      const currentTotal = Number(eventData?.total_value) || 0;
      const newGrandTotal = currentTotal + totalValue;

      await supabase
        .from("company_events")
        .update({
          event_optionals: updatedOptionals,
          total_value: newGrandTotal,
        })
        .eq("id", eventId);

      // Create differential payment if needed
      if (totalValue > 0.01) {
        const dueDate = optionalDueDate || (() => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          return tomorrow.toISOString().split("T")[0];
        })();
        await supabase.from("event_payments").insert({
          event_id: eventId,
          company_id: companyId,
          type: "parcela",
          amount: Math.round(totalValue * 100) / 100,
          due_date: dueDate,
          payment_method: null,
          status: "pending",
          notes: `Opcional: ${catalogOpt.name}`,
        });

        // Timeline
        await supabase.from("event_financial_timeline").insert({
          event_id: eventId,
          company_id: companyId,
          type: "optional_added",
          description: `Opcional "${catalogOpt.name}" adicionado — parcela de R$ ${totalValue.toFixed(2)} criada`,
        });
      }

      setEventOptionals(updatedOptionals);
      resetOptionalDialog();
      financial.refresh();

      toast({ title: "Opcional adicionado", description: `${catalogOpt.name} incluído com parcela pendente.` });
    } finally {
      setAddingOptional(false);
    }
  };

  // Add manual (non-catalog) optional
  const handleAddManualOptional = async () => {
    if (!eventId || !companyId || !optionalManualName.trim() || !optionalManualValue) return;
    setAddingOptional(true);
    try {
      const totalValue = optionalManualValue * optionalQty;
      const newOpt = {
        name: optionalManualName.trim(),
        value: optionalManualValue,
        valor_por_pessoa: 0,
        quantity: optionalQty,
        unit_price: optionalManualValue,
      };

      const updatedOptionals = [...eventOptionals, newOpt];

      const { data: eventData } = await supabase
        .from("company_events")
        .select("total_value")
        .eq("id", eventId)
        .single();

      const currentTotal = Number(eventData?.total_value) || 0;
      const newGrandTotal = currentTotal + totalValue;

      await supabase
        .from("company_events")
        .update({ event_optionals: updatedOptionals, total_value: newGrandTotal })
        .eq("id", eventId);

      if (totalValue > 0.01) {
        const dueDate = optionalDueDate || (() => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          return tomorrow.toISOString().split("T")[0];
        })();
        await supabase.from("event_payments").insert({
          event_id: eventId,
          company_id: companyId,
          type: "parcela",
          amount: Math.round(totalValue * 100) / 100,
          due_date: dueDate,
          payment_method: null,
          status: "pending",
          notes: `Opcional: ${optionalManualName.trim()}`,
        });
        await supabase.from("event_financial_timeline").insert({
          event_id: eventId,
          company_id: companyId,
          type: "optional_added",
          description: `Opcional "${optionalManualName.trim()}" adicionado — parcela de R$ ${totalValue.toFixed(2)} criada`,
        });
      }

      setEventOptionals(updatedOptionals);
      resetOptionalDialog();
      financial.refresh();
      toast({ title: "Opcional adicionado", description: `${optionalManualName.trim()} incluído com parcela pendente.` });
    } finally {
      setAddingOptional(false);
    }
  };

  // Remove optional from sidebar — also deletes associated payment
  const handleRemoveOptional = async (optName: string, idx: number) => {
    if (!eventId || !companyId) return;
    try {
      const updatedOptionals = eventOptionals.filter((_: any, i: number) => i !== idx);
      const opt = eventOptionals[idx];
      const qty = Number(opt.quantity) || 1;
      const unitVal = Number(opt.value) || 0;
      const ppVal = Number(opt.valor_por_pessoa) || 0;
      const optTotal = (unitVal * qty) + (ppVal > 0 ? ppVal * eventGuestCount * qty : 0);

      const { data: eventData } = await supabase
        .from("company_events")
        .select("total_value")
        .eq("id", eventId)
        .single();

      const currentTotal = Number(eventData?.total_value) || 0;
      const newTotal = Math.max(0, currentTotal - optTotal);

      await supabase
        .from("company_events")
        .update({ event_optionals: updatedOptionals, total_value: newTotal })
        .eq("id", eventId);

      // Delete associated payment (match by notes containing the optional name)
      const matchNote = `Opcional: ${optName}`;
      const { data: matchedPayments } = await supabase
        .from("event_payments")
        .select("id")
        .eq("event_id", eventId)
        .eq("status", "pending")
        .ilike("notes", `%${matchNote}%`);

      if (matchedPayments && matchedPayments.length > 0) {
        await supabase
          .from("event_payments")
          .delete()
          .in("id", matchedPayments.map((p: any) => p.id));
      }

      await supabase.from("event_financial_timeline").insert({
        event_id: eventId,
        company_id: companyId,
        type: "optional_removed",
        description: `Opcional "${optName}" removido — parcela associada excluída`,
      });

      setEventOptionals(updatedOptionals);
      financial.refresh();
      toast({ title: "Opcional removido", description: `${optName} e sua parcela foram excluídos.` });
    } catch (err) {
      console.error("[handleRemoveOptional]", err);
      toast({ title: "Erro ao remover opcional", variant: "destructive" });
    }
  };

  // Edit optional quantity
  const [editingOptionalIdx, setEditingOptionalIdx] = useState<number | null>(null);
  const [editOptionalQty, setEditOptionalQty] = useState(1);

  const handleEditOptional = async () => {
    if (editingOptionalIdx === null || !eventId) return;
    const opt = eventOptionals[editingOptionalIdx];
    const oldQty = Number(opt.quantity) || 1;
    const newQty = editOptionalQty;
    if (newQty === oldQty) { setEditingOptionalIdx(null); return; }

    const unitVal = Number(opt.value) || 0;
    const ppVal = Number(opt.valor_por_pessoa) || 0;
    const oldTotal = (unitVal * oldQty) + (ppVal > 0 ? ppVal * eventGuestCount * oldQty : 0);
    const newTotal = (unitVal * newQty) + (ppVal > 0 ? ppVal * eventGuestCount * newQty : 0);
    const diff = newTotal - oldTotal;

    const updated = [...eventOptionals];
    updated[editingOptionalIdx] = { ...opt, quantity: newQty };

    const { data: evData } = await supabase.from("company_events").select("total_value").eq("id", eventId).single();
    const curTotal = Number(evData?.total_value) || 0;

    await supabase.from("company_events").update({ event_optionals: updated, total_value: Math.max(0, curTotal + diff) }).eq("id", eventId);

    // Update matching pending payment amount
    const matchNote = `Opcional: ${opt.name}`;
    const { data: matchedPayments } = await supabase.from("event_payments").select("id").eq("event_id", eventId).eq("status", "pending").ilike("notes", `%${matchNote}%`);
    if (matchedPayments && matchedPayments.length > 0) {
      await supabase.from("event_payments").update({ amount: Math.round(newTotal * 100) / 100 }).eq("id", matchedPayments[0].id);
    }

    await supabase.from("event_financial_timeline").insert({ event_id: eventId, company_id: companyId, type: "optional_edited", description: `Opcional "${opt.name}" alterado de ${oldQty}× para ${newQty}×` });

    setEventOptionals(updated);
    setEditingOptionalIdx(null);
    financial.refresh();
    toast({ title: "Opcional atualizado" });
  };

  const [cardFees, setCardFees] = useState<any[]>([]);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [eventOptionals, setEventOptionals] = useState<any[]>([]);
  const [eventGuestCount, setEventGuestCount] = useState(0);
  
  useEffect(() => {
    if (!companyId) return;
    supabase
      .from("company_card_fees" as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .then(({ data }: any) => setCardFees((data || []) as any[]));
    // Fetch catalog optionals
    supabase
      .from("company_optionals")
      .select("id, name, description, value, valor_por_pessoa")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        setCatalogOptionals((data || []).map((o: any) => ({
          id: o.id, name: o.name, description: o.description,
          value: o.value != null ? Number(o.value) : null,
          valor_por_pessoa: o.valor_por_pessoa != null ? Number(o.valor_por_pessoa) : null,
        })));
      });
    if (eventId) {
      supabase
        .from("company_events")
        .select("payment_details, event_optionals, guest_count")
        .eq("id", eventId)
        .single()
        .then(({ data }: any) => {
          setPaymentDetails(data?.payment_details || null);
          const opts = data?.event_optionals;
          setEventOptionals(Array.isArray(opts) ? opts.filter((o: any) => o.name) : []);
          setEventGuestCount(Number(data?.guest_count) || 0);
        });
    }
  }, [companyId, eventId]);

  // Compute card fee losses using GROSS values from payment_details and real installment counts
  const cardFeeLoss = useMemo(() => {
    if (cardFees.length === 0 || !paymentDetails) return null;
    const operator = cardFees[0];
    let totalLoss = 0;
    let details: Array<{ type: string; bruto: number; taxa: number; desconto: number; parcelas: number }> = [];

    const parseNum = (v: unknown): number => {
      if (typeof v === "number") return v;
      if (typeof v !== "string") return 0;
      const cleaned = v.trim().replace(/R\$\s?/g, "").replace(/\s/g, "");
      const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
      return Number(normalized) || 0;
    };

    // Entrada
    if (paymentDetails.entrada_forma === "cartao" || paymentDetails.entrada_forma === "cartao_credito") {
      const brutEntrada = parseNum(paymentDetails.entrada_valor);
      if (brutEntrada > 0) {
        const parcelas = Math.max(1, Number(paymentDetails.entrada_parcelas) || 1);
        const taxaKey = `taxa_credito_${Math.min(parcelas, 12)}x`;
        const taxa = Number(operator[taxaKey] || 0);
        if (taxa > 0) {
          const desconto = brutEntrada * taxa / 100;
          totalLoss += desconto;
          details.push({ type: "entrada", bruto: brutEntrada, taxa, desconto, parcelas });
        }
      }
    } else if (paymentDetails.entrada_forma === "cartao_debito") {
      const brutEntrada = parseNum(paymentDetails.entrada_valor);
      if (brutEntrada > 0) {
        const taxa = Number(operator.taxa_debito || 0);
        if (taxa > 0) {
          const desconto = brutEntrada * taxa / 100;
          totalLoss += desconto;
          details.push({ type: "entrada", bruto: brutEntrada, taxa, desconto, parcelas: 1 });
        }
      }
    }

    // Saldo
    if (paymentDetails.saldo_forma === "cartao" || paymentDetails.saldo_forma === "cartao_credito") {
      const brutSaldo = parseNum(paymentDetails.saldo_valor);
      if (brutSaldo > 0) {
        const parcelas = Math.max(1, Number(paymentDetails.parcelas) || 1);
        const taxaKey = `taxa_credito_${Math.min(parcelas, 12)}x`;
        const taxa = Number(operator[taxaKey] || 0);
        if (taxa > 0) {
          const desconto = brutSaldo * taxa / 100;
          totalLoss += desconto;
          details.push({ type: "parcela", bruto: brutSaldo, taxa, desconto, parcelas });
        }
      }
    } else if (paymentDetails.saldo_forma === "cartao_debito") {
      const brutSaldo = parseNum(paymentDetails.saldo_valor);
      if (brutSaldo > 0) {
        const taxa = Number(operator.taxa_debito || 0);
        if (taxa > 0) {
          const desconto = brutSaldo * taxa / 100;
          totalLoss += desconto;
          details.push({ type: "parcela", bruto: brutSaldo, taxa, desconto, parcelas: 1 });
        }
      }
    }

    return totalLoss > 0 ? { operator: operator.operator_name, totalLoss, details } : null;
  }, [cardFees, paymentDetails]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <FinancialSummaryCards summary={financial.summary} showValues={showValues} />

      {/* Card Fee Loss Info */}
      {cardFeeLoss && showValues && (
        <Card className="p-3 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-1.5">
            <CreditCard className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              Taxas de Cartão — {cardFeeLoss.operator}
            </span>
          </div>
          <p className="text-sm font-bold text-destructive">
            Valor não arrecadado: {fmt(cardFeeLoss.totalLoss)}
          </p>
          <div className="mt-1.5 space-y-0.5">
            {cardFeeLoss.details.map((d, i) => (
              <p key={i} className="text-[11px] text-muted-foreground">
                {d.type === "entrada" ? "Entrada" : "Saldo"}{d.parcelas > 1 ? ` (${d.parcelas}x)` : ""}: {fmt(d.bruto)} × {d.taxa.toFixed(2)}% = -{fmt(d.desconto)}
              </p>
            ))}
          </div>
        </Card>
      )}


      {/* Payments Section */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" /> Parcelas
          </h3>
          {canEdit && (
            <Button
              size="sm"
              onClick={() => setPaymentDialogOpen(true)}
              className="h-8 text-xs gap-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border-0 shadow-none"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          )}
        </div>
        {financial.payments.length === 0 ? (
          <Card className="p-6 bg-card border-border/40 shadow-sm">
            <p className="text-sm text-muted-foreground text-center">Nenhuma parcela cadastrada</p>
          </Card>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {financial.payments.map(p => {
                const sb = STATUS_BADGE[p.status] || STATUS_BADGE.pending;
                const justPaid = recentlyPaidIds.has(p.id);
                const pEntries = financial.getEntriesForPayment(p.id);
                const paidSum = financial.getEntriesSum(p.id);
                const remaining = Math.max(0, p.amount - paidSum);
                const hasEntries = pEntries.length > 0;
                const isExpanded = expandedPaymentIds.has(p.id);
                const progressPct = p.amount > 0 ? Math.min(100, (paidSum / p.amount) * 100) : 0;

                const toggleExpand = () => {
                  setExpandedPaymentIds(prev => {
                    const next = new Set(prev);
                    if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                    return next;
                  });
                };

                const handlePartialPayment = async (data: any) => {
                  if (onConsentSubmit) {
                    const success = await onConsentSubmit({
                      actionType: 'partial_payment',
                      entityId: p.id,
                      entityTable: 'event_payments',
                      payload: data,
                      description: `Pagamento parcial - ${p.type === 'entrada' ? 'Entrada' : 'Parcela'} R$ ${data.amount.toFixed(2)}`,
                      amount: data.amount,
                    });
                    return success;
                  }
                  return financial.addPartialPayment(p.id, data);
                };

                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: justPaid ? [1, 1.02, 1] : 1,
                    }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`rounded-xl border shadow-sm ${
                      justPaid
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : sb.bgRow || "bg-card border-border/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 p-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`text-[10px] px-2 py-0.5 font-medium border ${sb.className}`}>
                            {p.status === "paid" ? "✅" : p.status === "late" ? "🔴" : p.status === "partial" ? "🟡" : "⏳"} {sb.label}
                          </Badge>
                          <span className="text-[11px] font-medium text-muted-foreground uppercase">
                            {p.type === "entrada" ? "Entrada" : "Parcela"}
                          </span>
                          {hasEntries && (
                            <button
                              onClick={toggleExpand}
                              className="text-[10px] text-primary/70 hover:text-primary underline ml-auto"
                            >
                              {pEntries.length} pgto(s) {isExpanded ? "▲" : "▼"}
                            </button>
                          )}
                        </div>
                        <p className="text-base font-bold text-foreground">{fmt(p.amount)}</p>
                        
                        {/* Progress bar for partial payments */}
                        {hasEntries && p.status !== "paid" && (
                          <div className="mt-1.5">
                            <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                              <span>Pago: {fmt(paidSum)}</span>
                              <span>Restante: {fmt(remaining)}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(p.due_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                          {p.payment_method && (
                            <span className="text-[11px] text-muted-foreground">
                              • {METHOD_LABELS[p.payment_method] || p.payment_method}
                            </span>
                          )}
                          {p.status === 'paid' && p.bank_account_id && bankAccountMap[p.bank_account_id] && (
                            <span className="text-[11px] text-primary/70 flex items-center gap-0.5">
                              <Building className="h-2.5 w-2.5" />
                              {bankAccountMap[p.bank_account_id]}
                            </span>
                          )}
                        </div>
                        {p.notes && (
                          <p className="text-[11px] text-muted-foreground/70 italic mt-0.5">{p.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {canPay && p.status !== "paid" && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 hover:text-amber-400 hover:shadow-sm hover:shadow-amber-500/10 transition-all duration-200"
                              onClick={() => setPartialPaymentTarget(p)}
                              title="Pagamento parcial"
                            >
                              <Coins className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 hover:text-emerald-400 hover:shadow-sm hover:shadow-emerald-500/10 transition-all duration-200"
                              onClick={() => handleMarkAsPaid(p)}
                              title="Marcar como pago (total)"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {canPay && p.status === "paid" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 hover:text-amber-400 hover:shadow-sm hover:shadow-amber-500/10 transition-all duration-200"
                            onClick={() => financial.reopenPayment(p)}
                            title="Reabrir parcela"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        {justPaid && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="h-8 w-8 rounded-xl bg-emerald-500/15 flex items-center justify-center shadow-sm shadow-emerald-500/10"
                          >
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                          </motion.div>
                        )}
                        {canEdit && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-xl text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 hover:shadow-sm hover:shadow-destructive/10 transition-all duration-200"
                            onClick={() => financial.deletePayment(p.id)}
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expanded entries list */}
                    {isExpanded && pEntries.length > 0 && (
                      <div className="border-t border-border/30 px-3 pb-3 pt-2 space-y-1.5">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sub-pagamentos</p>
                        {pEntries.map(entry => (
                          <div key={entry.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/30 text-xs">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-emerald-500">{fmt(entry.amount)}</span>
                                {entry.payment_method && (
                                  <span className="text-muted-foreground">{METHOD_LABELS[entry.payment_method] || entry.payment_method}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                <span>{format(new Date(entry.paid_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                                {entry.paid_by && <span>• {entry.paid_by}</span>}
                                {entry.bank_account_id && bankAccountMap[entry.bank_account_id] && (
                                  <span className="flex items-center gap-0.5"><Building className="h-2.5 w-2.5" />{bankAccountMap[entry.bank_account_id]}</span>
                                )}
                              </div>
                              {entry.notes && <p className="text-[10px] text-muted-foreground/70 italic">{entry.notes}</p>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {entry.receipt_url && (
                                <a href={entry.receipt_url} target="_blank" rel="noopener noreferrer" className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20" title="Ver comprovante">
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                              {canEdit && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => financial.deletePartialPayment(entry.id)}
                                  title="Excluir sub-pagamento"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Partial Payment Dialog per payment */}
                    {partialPaymentTarget?.id === p.id && (
                      <PartialPaymentDialog
                        open={true}
                        onOpenChange={(open) => { if (!open) setPartialPaymentTarget(null); }}
                        onSubmit={handlePartialPayment}
                        paymentAmount={p.amount}
                        paidSoFar={paidSum}
                        paymentLabel={`${p.type === 'entrada' ? 'Entrada' : 'Parcela'} — Venc. ${format(new Date(p.due_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}`}
                      />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>


      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Plus className="h-4 w-4 text-blue-400" /> Extras
          </h3>
          {canEdit && (
            <Button
              size="sm"
              onClick={() => setExtraDialogOpen(true)}
              className="h-8 text-xs gap-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border-0 shadow-none"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          )}
        </div>
        {financial.extras.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">Nenhum extra</p>
        ) : (
          <div className="space-y-1.5">
            {financial.extras.map(e => (
              <div key={e.id} className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/40 shadow-sm">
                <div>
                  <p className="text-sm text-foreground font-medium">{e.description}</p>
                  <p className="text-xs text-emerald-400 font-semibold">{fmt(e.amount)}</p>
                </div>
                {canEdit && (
                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-xl text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 hover:shadow-sm hover:shadow-destructive/10 transition-all duration-200" onClick={() => financial.deleteExtra(e.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discounts Section */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Tag className="h-4 w-4 text-amber-400" /> Descontos
          </h3>
          {canEdit && (
            <Button
              size="sm"
              onClick={() => setDiscountDialogOpen(true)}
              className="h-8 text-xs gap-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border-0 shadow-none"
            >
              <Plus className="h-3.5 w-3.5" /> Aplicar
            </Button>
          )}
        </div>
        {financial.discounts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">Nenhum desconto</p>
        ) : (
          <div className="space-y-1.5">
            {financial.discounts.map(d => (
              <div key={d.id} className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/40 shadow-sm">
                <div>
                  <p className="text-sm text-foreground font-medium">
                    {d.type === "percentage" ? `${d.value}%` : fmt(d.value)}
                  </p>
                  {d.reason && <p className="text-xs text-muted-foreground">{d.reason}</p>}
                </div>
                {canEdit && (
                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-xl text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 hover:shadow-sm hover:shadow-destructive/10 transition-all duration-200" onClick={() => financial.deleteDiscount(d.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Optionals Section */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Package className="h-4 w-4 text-violet-400" /> Opcionais
          </h3>
          {canEdit && (
            <Button
              size="sm"
              onClick={() => setOptionalDialogOpen(true)}
              className="h-8 text-xs gap-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border-0 shadow-none"
            >
              <Plus className="h-3.5 w-3.5" /> Incluir
            </Button>
          )}
        </div>
        {eventOptionals.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">Nenhum opcional</p>
        ) : (
          <div className="space-y-1.5">
            {eventOptionals.map((opt: any, idx: number) => {
              const qty = Number(opt.quantity) || 1;
              const unitVal = Number(opt.value) || 0;
              const ppVal = Number(opt.valor_por_pessoa) || 0;
              const total = (unitVal * qty) + (ppVal > 0 ? ppVal * qty : 0);
              return (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/40 shadow-sm group">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground font-medium truncate">
                      {opt.name}{qty > 1 ? ` (×${qty})` : ""}
                    </p>
                    {opt.description && (
                      <p className="text-[11px] text-muted-foreground truncate">{opt.description}</p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-violet-500 shrink-0 ml-2">
                    {showValues ? total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "••••"}
                  </span>
                  {canEdit && (
                    <div className="flex gap-1 shrink-0 ml-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-xl text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all duration-200"
                        onClick={() => { setEditingOptionalIdx(idx); setEditOptionalQty(Number(opt.quantity) || 1); }}
                        title="Editar quantidade"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-xl text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                        onClick={() => handleRemoveOptional(opt.name, idx)}
                        title="Excluir opcional e parcela"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>


      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2.5 flex items-center gap-2">
          📜 Timeline
        </h3>
        <FinancialTimeline timeline={financial.timeline} />
      </div>

      {/* Dialogs */}
      <PaymentFormDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen} onSubmit={financial.addPayment} />

      {/* Extra Dialog */}
      <Dialog open={extraDialogOpen} onOpenChange={setExtraDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Adicionar Extra</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Descrição</Label><Input value={extraDesc} onChange={e => setExtraDesc(e.target.value)} placeholder="Ex: Convidado extra" /></div>
            <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={extraAmount} onChange={e => setExtraAmount(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtraDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddExtra}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discount Dialog */}
      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Aplicar Desconto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={discountType} onValueChange={v => setDiscountType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Valor</Label><Input type="number" step="0.01" value={discountValue} onChange={e => setDiscountValue(e.target.value)} /></div>
            <div><Label>Motivo (opcional)</Label><Input value={discountReason} onChange={e => setDiscountReason(e.target.value)} placeholder="Ex: Desconto fidelidade" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscountDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddDiscount}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Dialog with Bank Account */}
      <Dialog open={!!markPaidPayment} onOpenChange={open => { if (!open) { setMarkPaidPayment(null); setMarkPaidBankId(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              Confirmar Pagamento
            </DialogTitle>
          </DialogHeader>
          {markPaidPayment && (() => {
            const isCard = markPaidPayment.payment_method?.includes("cartao");
            const displayAmount = markPaidPayment.amount;
            return (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border border-border/40">
                <p className="text-xs text-muted-foreground">
                  {markPaidPayment.type === "entrada" ? "Entrada" : "Parcela"}
                  {isCard && " (Cartão — valor líquido)"}
                </p>
                <p className="text-lg font-bold">
                  {displayAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
                {isCard && (
                  <p className="text-[11px] text-amber-500 mt-0.5">
                    💳 Valor já com desconto da taxa do cartão
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vencimento: {format(new Date(markPaidPayment.due_date + "T12:00:00"), "dd/MM/yyyy")}
                </p>
              </div>
              <BankAccountSelect
                value={markPaidBankId}
                onValueChange={setMarkPaidBankId}
                label="Conta de destino"
                placeholder="Selecione a conta..."
              />
            </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMarkPaidPayment(null); setMarkPaidBankId(null); }}>Cancelar</Button>
            <Button onClick={confirmMarkAsPaid} className="bg-emerald-600 hover:bg-emerald-700 text-white">Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Optional Dialog */}
      <Dialog open={optionalDialogOpen} onOpenChange={(open) => { if (!open) resetOptionalDialog(); }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-violet-500" /> Adicionar Opcional</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button type="button" variant={!optionalManualMode ? "default" : "outline"} size="sm" className="flex-1 text-xs" onClick={() => setOptionalManualMode(false)}>
                Do catálogo
              </Button>
              <Button type="button" variant={optionalManualMode ? "default" : "outline"} size="sm" className="flex-1 text-xs" onClick={() => setOptionalManualMode(true)}>
                Manual
              </Button>
            </div>

            {!optionalManualMode ? (
              <>
                {catalogOptionals.length > 0 ? (
                  <>
                    <div>
                      <Label>Opcional</Label>
                      <Select value={selectedOptionalId} onValueChange={setSelectedOptionalId}>
                        <SelectTrigger><SelectValue placeholder="Selecione um opcional..." /></SelectTrigger>
                        <SelectContent>
                          {catalogOptionals
                            .filter(co => !eventOptionals.some((eo: any) => eo.name === co.name))
                            .map(co => {
                              const price = co.value || 0;
                              const pp = co.valor_por_pessoa || 0;
                              const label = price > 0 ? ` — R$ ${price.toFixed(2)}` : pp > 0 ? ` — R$ ${pp.toFixed(2)}/pessoa` : "";
                              return <SelectItem key={co.id} value={co.id}>{co.name}{label}</SelectItem>;
                            })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Quantidade</Label>
                      <Input type="number" min={1} value={optionalQty} onChange={e => setOptionalQty(Math.max(1, Number(e.target.value) || 1))} />
                    </div>
                    <div>
                      <Label>Data de vencimento</Label>
                      <Input type="date" value={optionalDueDate} onChange={e => setOptionalDueDate(e.target.value)} />
                    </div>
                    {selectedOptionalId && (() => {
                      const sel = catalogOptionals.find(c => c.id === selectedOptionalId);
                      if (!sel) return null;
                      const unitP = sel.value || 0;
                      const ppP = sel.valor_por_pessoa || 0;
                      const preview = (unitP * optionalQty) + (ppP > 0 ? ppP * eventGuestCount * optionalQty : 0);
                      return (
                        <div className="p-3 rounded-lg bg-muted/50 border border-border/40 text-sm">
                          <p className="text-muted-foreground">Valor estimado:</p>
                          <p className="text-lg font-bold text-foreground">{preview.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                          {ppP > 0 && <p className="text-[11px] text-muted-foreground">R$ {ppP.toFixed(2)}/pessoa × {eventGuestCount} convidados × {optionalQty}</p>}
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum opcional cadastrado. Use o modo "Manual" ou cadastre em Configurações.
                  </p>
                )}
              </>
            ) : (
              <>
                <div>
                  <Label>Nome do opcional</Label>
                  <Input placeholder="Ex: Topo de bolo, Pipoca..." value={optionalManualName} onChange={e => setOptionalManualName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Valor unitário (R$)</Label>
                    <Input type="number" min={0} step={0.01} placeholder="0,00" value={optionalManualValue ?? ""} onChange={e => setOptionalManualValue(e.target.value ? Number(e.target.value) : null)} />
                  </div>
                  <div>
                    <Label>Quantidade</Label>
                    <Input type="number" min={1} value={optionalQty} onChange={e => setOptionalQty(Math.max(1, Number(e.target.value) || 1))} />
                  </div>
                </div>
                <div>
                  <Label>Data de vencimento</Label>
                  <Input type="date" value={optionalDueDate} onChange={e => setOptionalDueDate(e.target.value)} />
                </div>
                {optionalManualValue && optionalManualValue > 0 && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border/40 text-sm">
                    <p className="text-muted-foreground">Valor total:</p>
                    <p className="text-lg font-bold text-foreground">{(optionalManualValue * optionalQty).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetOptionalDialog}>Cancelar</Button>
            <Button
              disabled={
                addingOptional ||
                (!optionalManualMode && !selectedOptionalId) ||
                (optionalManualMode && (!optionalManualName.trim() || !optionalManualValue))
              }
              onClick={() => {
                if (optionalManualMode) {
                  handleAddManualOptional();
                } else {
                  const sel = catalogOptionals.find(c => c.id === selectedOptionalId);
                  if (sel) handleAddOptionalInline(sel);
                }
              }}
            >
              {addingOptional ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Optional Quantity Dialog */}
      <Dialog open={editingOptionalIdx !== null} onOpenChange={open => { if (!open) setEditingOptionalIdx(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" /> Editar Opcional
            </DialogTitle>
          </DialogHeader>
          {editingOptionalIdx !== null && eventOptionals[editingOptionalIdx] && (() => {
            const opt = eventOptionals[editingOptionalIdx];
            const unitVal = Number(opt.value) || 0;
            const ppVal = Number(opt.valor_por_pessoa) || 0;
            const previewTotal = (unitVal * editOptionalQty) + (ppVal > 0 ? ppVal * eventGuestCount * editOptionalQty : 0);
            return (
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">{opt.name}</p>
                <div>
                  <Label>Quantidade</Label>
                  <Input type="number" min={1} value={editOptionalQty} onChange={e => setEditOptionalQty(Math.max(1, Number(e.target.value) || 1))} />
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border/40 text-sm">
                  <p className="text-muted-foreground">Novo valor:</p>
                  <p className="text-lg font-bold text-foreground">{previewTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingOptionalIdx(null)}>Cancelar</Button>
            <Button onClick={handleEditOptional}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
