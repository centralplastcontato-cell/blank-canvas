import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, CheckCircle, RotateCcw, Tag, Receipt, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useEventFinancial } from "@/hooks/useEventFinancial";
import { FinancialSummaryCards } from "./FinancialSummaryCards";
import { PaymentFormDialog } from "./PaymentFormDialog";
import { FinancialTimeline } from "./FinancialTimeline";
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
};

interface Props {
  eventId: string;
  companyId: string;
  baseValue: number;
  canEdit?: boolean;
  canPay?: boolean;
  showValues?: boolean;
}

export function EventFinancialTab({ eventId, companyId, baseValue, canEdit = true, canPay = true, showValues = true }: Props) {
  const financial = useEventFinancial(eventId, companyId, baseValue);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [extraDialogOpen, setExtraDialogOpen] = useState(false);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [extraDesc, setExtraDesc] = useState("");
  const [extraAmount, setExtraAmount] = useState("");
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">("fixed");
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [recentlyPaidIds, setRecentlyPaidIds] = useState<Set<string>>(new Set());
  const syncAttempted = useRef(false);

  // Auto-sync: if no payments exist but event has payment_details, sync them
  useEffect(() => {
    if (financial.isLoading || syncAttempted.current) return;
    if (financial.payments.length > 0) return;
    syncAttempted.current = true;

    (async () => {
      const { data: ev } = await supabase
        .from("company_events")
        .select("payment_details")
        .eq("id", eventId)
        .single();
      const pd = ev?.payment_details as any;
      if (!pd) return;

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
        rows.push({
          event_id: eventId, company_id: companyId, type: "entrada",
          amount: entradaAmount,
          due_date: parseDate(pd.entrada_data),
          payment_method: pd.entrada_forma || null, status: "pending",
        });
      }

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
      if (rows.length > 0) {
        await supabase.from("event_payments").insert(rows);
        financial.refresh();
      }
    })();
  }, [financial.isLoading, financial.payments.length, eventId, companyId]);

  const handleMarkAsPaid = async (payment: any) => {
    await financial.markAsPaid(payment);
    setRecentlyPaidIds(prev => new Set(prev).add(payment.id));
    setTimeout(() => {
      setRecentlyPaidIds(prev => {
        const next = new Set(prev);
        next.delete(payment.id);
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

  // Card fee data
  const [cardFees, setCardFees] = useState<any[]>([]);
  
  useEffect(() => {
    if (!companyId) return;
    supabase
      .from("company_card_fees" as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .then(({ data }) => setCardFees((data || []) as any[]));
  }, [companyId]);

  // Compute card fee losses from payments
  const cardFeeLoss = useMemo(() => {
    if (cardFees.length === 0) return null;
    const operator = cardFees[0]; // Use first operator
    let totalLoss = 0;
    let details: Array<{ type: string; bruto: number; taxa: number; desconto: number }> = [];

    financial.payments.forEach(p => {
      if (!p.payment_method || !p.payment_method.includes("cartao")) return;
      const isDebito = p.payment_method === "cartao_debito";
      const parcelas = p.type === "entrada" ? 1 : Math.max(1, financial.payments.filter(pp => pp.type === "parcela").length);
      const taxaKey = isDebito ? "taxa_debito" : `taxa_credito_${Math.min(parcelas, 12)}x`;
      const taxa = Number(operator[taxaKey] || 0);
      if (taxa > 0) {
        const desconto = p.amount * taxa / 100;
        totalLoss += desconto;
        details.push({ type: p.type, bruto: p.amount, taxa, desconto });
      }
    });

    return totalLoss > 0 ? { operator: operator.operator_name, totalLoss, details } : null;
  }, [cardFees, financial.payments]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <FinancialSummaryCards summary={financial.summary} showValues={showValues} />

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
                const sb = STATUS_BADGE[p.status];
                const justPaid = recentlyPaidIds.has(p.id);
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
                    className={`flex items-center gap-3 p-3 rounded-xl border shadow-sm ${
                      justPaid
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : sb.bgRow || "bg-card border-border/40"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-[10px] px-2 py-0.5 font-medium border ${sb.className}`}>
                          {p.status === "paid" ? "✅" : p.status === "late" ? "🔴" : "⏳"} {sb.label}
                        </Badge>
                        <span className="text-[11px] font-medium text-muted-foreground uppercase">
                          {p.type === "entrada" ? "Entrada" : "Parcela"}
                        </span>
                      </div>
                      <p className="text-base font-bold text-foreground">{fmt(p.amount)}</p>
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
                      </div>
                      {p.notes && (
                        <p className="text-[11px] text-muted-foreground/70 italic mt-0.5">{p.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {canPay && p.status !== "paid" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
                          onClick={() => handleMarkAsPaid(p)}
                          title="Marcar como pago"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {canPay && p.status === "paid" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300"
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
                          className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center"
                        >
                          <CheckCircle className="h-4 w-4 text-emerald-400" />
                        </motion.div>
                      )}
                      {canEdit && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => financial.deletePayment(p.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Extras Section */}
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
                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10" onClick={() => financial.deleteExtra(e.id)}>
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
                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10" onClick={() => financial.deleteDiscount(d.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
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
    </div>
  );
}
