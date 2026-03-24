import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, CheckCircle, Tag, Receipt } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-muted text-muted-foreground" },
  paid: { label: "Pago", className: "bg-emerald-500/20 text-emerald-400" },
  late: { label: "Atrasado", className: "bg-red-500/20 text-red-400" },
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

      const rows: any[] = [];
      if (pd.entrada_valor && pd.entrada_valor > 0) {
        rows.push({
          event_id: eventId, company_id: companyId, type: "entrada",
          amount: pd.entrada_valor,
          due_date: pd.parcelas_details?.[0]?.vencimento || new Date().toISOString().split("T")[0],
          payment_method: pd.entrada_forma || null, status: "pending",
        });
      }
      if (pd.parcelas_details?.length) {
        pd.parcelas_details.forEach((p: any) => {
          if (p.valor && p.valor > 0) {
            rows.push({
              event_id: eventId, company_id: companyId, type: "parcela",
              amount: p.valor,
              due_date: p.vencimento || new Date().toISOString().split("T")[0],
              payment_method: pd.saldo_forma || null, status: "pending",
            });
          }
        });
      }
      if (rows.length > 0) {
        await supabase.from("event_payments").insert(rows);
        financial.refresh();
      }
    })();
  }, [financial.isLoading, financial.payments.length, eventId, companyId]);

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

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <FinancialSummaryCards summary={financial.summary} showValues={showValues} />

      {/* Payments Section */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Parcelas
          </h3>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setPaymentDialogOpen(true)} className="h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          )}
        </div>
        {financial.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma parcela cadastrada</p>
        ) : (
          <div className="space-y-2">
            {financial.payments.map(p => {
              const sb = STATUS_BADGE[p.status];
              return (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        {p.type === "entrada" ? "Entrada" : "Parcela"}
                      </span>
                      <Badge className={`text-[10px] px-1.5 py-0 ${sb.className}`}>{sb.label}</Badge>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{fmt(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      Vence: {format(new Date(p.due_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      {p.payment_method && ` • ${METHOD_LABELS[p.payment_method] || p.payment_method}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {canPay && p.status !== "paid" && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-400 hover:text-emerald-300" onClick={() => financial.markAsPaid(p)} title="Marcar como pago">
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {canEdit && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => financial.deletePayment(p.id)} title="Excluir">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Extras Section */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Plus className="h-4 w-4" /> Extras
          </h3>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setExtraDialogOpen(true)} className="h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          )}
        </div>
        {financial.extras.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">Nenhum extra</p>
        ) : (
          <div className="space-y-1.5">
            {financial.extras.map(e => (
              <div key={e.id} className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border">
                <div>
                  <p className="text-sm text-foreground">{e.description}</p>
                  <p className="text-xs text-emerald-400 font-medium">{fmt(e.amount)}</p>
                </div>
                {canEdit && (
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => financial.deleteExtra(e.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Discounts Section */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Tag className="h-4 w-4" /> Descontos
          </h3>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setDiscountDialogOpen(true)} className="h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" /> Aplicar
            </Button>
          )}
        </div>
        {financial.discounts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">Nenhum desconto</p>
        ) : (
          <div className="space-y-1.5">
            {financial.discounts.map(d => (
              <div key={d.id} className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border">
                <div>
                  <p className="text-sm text-foreground">
                    {d.type === "percentage" ? `${d.value}%` : fmt(d.value)}
                  </p>
                  {d.reason && <p className="text-xs text-muted-foreground">{d.reason}</p>}
                </div>
                {canEdit && (
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => financial.deleteDiscount(d.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Timeline */}
      <Card className="p-4 bg-card border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3">📜 Timeline</h3>
        <FinancialTimeline timeline={financial.timeline} />
      </Card>

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
