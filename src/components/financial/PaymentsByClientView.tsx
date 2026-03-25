import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, PartyPopper } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FinancialPaymentCard } from './FinancialPaymentCard';
import type { EnrichedPayment } from '@/hooks/useFinanceiroDashboard';

interface Props {
  payments: EnrichedPayment[];
  onMarkAsPaid?: (id: string) => void;
  onOpenEvent?: (eventId: string) => void;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface ClientGroup {
  clientName: string;
  payments: EnrichedPayment[];
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
  totalLate: number;
  lateCount: number;
  pendingCount: number;
  paidCount: number;
}

export function PaymentsByClientView({ payments, onMarkAsPaid, onOpenEvent }: Props) {
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  const clientGroups = useMemo(() => {
    const map = new Map<string, EnrichedPayment[]>();
    payments.forEach(p => {
      const key = p.lead_name || p.event_title || 'Sem identificação';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });

    const groups: ClientGroup[] = Array.from(map.entries()).map(([name, pays]) => ({
      clientName: name,
      payments: pays.sort((a, b) => a.due_date.localeCompare(b.due_date)),
      totalAmount: pays.reduce((s, p) => s + p.amount, 0),
      totalPaid: pays.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0),
      totalPending: pays.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0),
      totalLate: pays.filter(p => p.status === 'late').reduce((s, p) => s + p.amount, 0),
      lateCount: pays.filter(p => p.status === 'late').length,
      pendingCount: pays.filter(p => p.status === 'pending').length,
      paidCount: pays.filter(p => p.status === 'paid').length,
    }));

    // Sort: clients with late payments first, then by total amount desc
    return groups.sort((a, b) => {
      if (a.lateCount > 0 && b.lateCount === 0) return -1;
      if (a.lateCount === 0 && b.lateCount > 0) return 1;
      return b.totalAmount - a.totalAmount;
    });
  }, [payments]);

  const toggleClient = (name: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  if (clientGroups.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nenhum pagamento encontrado</p>;
  }

  return (
    <div className="space-y-2">
      {clientGroups.map(group => {
        const isExpanded = expandedClients.has(group.clientName);
        return (
          <div key={group.clientName} className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Client Header */}
            <button
              onClick={() => toggleClient(group.clientName)}
              className="w-full flex items-center justify-between gap-3 p-3 md:p-4 hover:bg-muted/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="shrink-0 text-muted-foreground">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-foreground truncate">{group.clientName}</p>
                    <span className="text-xs text-muted-foreground">({group.payments.length} parcelas)</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {group.lateCount > 0 && (
                      <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-500 border-red-500/20">
                        {group.lateCount} atrasado{group.lateCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {group.pendingCount > 0 && (
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20">
                        {group.pendingCount} pendente{group.pendingCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {group.paidCount > 0 && (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                        {group.paidCount} pago{group.paidCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 space-y-0.5">
                <p className="text-sm font-bold text-foreground">{fmt(group.totalAmount)}</p>
                {group.totalLate > 0 && (
                  <p className="text-[10px] text-red-400 font-medium">{fmt(group.totalLate)} em atraso</p>
                )}
              </div>
            </button>

            {/* Expanded Payment List */}
            {isExpanded && (
              <div className="border-t border-border/50 p-2 md:p-3 space-y-2 bg-muted/10">
                {group.payments.map(p => (
                  <FinancialPaymentCard
                    key={p.id}
                    payment={p}
                    onMarkAsPaid={onMarkAsPaid}
                    onOpenEvent={onOpenEvent}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
