import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, Check, Coins, MapPin, PartyPopper, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { EnrichedPayment } from '@/hooks/useFinanceiroDashboard';

interface Props {
  payment: EnrichedPayment;
  onMarkAsPaid?: (id: string) => void;
  onOpenEvent?: (eventId: string) => void;
  onPartialPayment?: (eventId: string) => void;
  bankAccountName?: string;
}

const statusConfig = {
  paid: { label: 'Pago', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  pending: { label: 'Pendente', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  late: { label: 'Atrasado', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
  partial: { label: 'Parcial', className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
};

const typeLabels: Record<string, string> = {
  entrada: 'Entrada',
  parcela: 'Parcela',
};

const borderColors: Record<string, string> = {
  late: 'border-l-red-500',
  pending: 'border-l-amber-500',
  paid: 'border-l-emerald-500',
  partial: 'border-l-orange-500',
};

export function FinancialPaymentCard({ payment, onMarkAsPaid, onOpenEvent, onPartialPayment, bankAccountName }: Props) {
  const cfg = statusConfig[payment.status];
  const daysLate = payment.status === 'late' ? differenceInDays(new Date(), new Date(payment.due_date)) : 0;
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const entriesTotal = payment.entries_total || 0;
  const progressPct = entriesTotal > 0 ? Math.min((entriesTotal / payment.amount) * 100, 100) : 0;

  return (
    <div
      className={`p-3 md:p-4 rounded-xl border border-border bg-card border-l-4 ${borderColors[payment.status] || 'border-l-border'} transition-all ${onOpenEvent ? 'cursor-pointer hover:border-primary/40 hover:bg-accent/30' : ''}`}
      onClick={() => onOpenEvent?.(payment.event_id)}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-foreground truncate">
              {payment.lead_name || payment.event_title || 'Sem identificação'}
            </p>
            <Badge variant="outline" className={cfg.className}>
              {cfg.label}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {typeLabels[payment.type] || payment.type}
            </Badge>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {payment.event_title && (
              <span className="flex items-center gap-1">
                <PartyPopper className="h-3 w-3" />
                {payment.event_type ? `${payment.event_type} — ` : ''}{payment.event_title}
              </span>
            )}
            {payment.event_date && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {format(new Date(payment.event_date + 'T12:00:00'), 'dd/MM/yyyy')}
              </span>
            )}
            {payment.unit && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {payment.unit}
              </span>
            )}
          </div>

          {/* Partial payment progress bar */}
          {entriesTotal > 0 && payment.status !== 'paid' && (
            <div className="space-y-0.5 pt-0.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-orange-500 font-medium">Pago: {fmt(entriesTotal)}</span>
                <span className="text-muted-foreground">Falta: {fmt(payment.amount - entriesTotal)}</span>
              </div>
              <Progress value={progressPct} className="h-1.5 bg-orange-500/10" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className={`text-sm font-bold ${
              payment.status === 'late' ? 'text-red-400' :
              payment.status === 'paid' ? 'text-emerald-400' :
              payment.status === 'partial' ? 'text-orange-400' :
              'text-foreground'
            }`}>
              {fmt(payment.amount)}
            </p>
            <p className="text-xs text-muted-foreground">
              {payment.status === 'late'
                ? `Venc. ${format(new Date(payment.due_date + 'T12:00:00'), 'dd/MM/yyyy')} · ${daysLate}d atraso`
                : payment.status === 'paid' && payment.paid_at
                  ? `Pago ${format(new Date(payment.paid_at), 'dd/MM', { locale: ptBR })}`
                  : `Venc. ${format(new Date(payment.due_date + 'T12:00:00'), 'dd/MM/yyyy')}`
              }
            </p>
            {payment.status === 'paid' && bankAccountName && (
              <p className="text-[10px] text-primary/70 flex items-center gap-1">
                <Building className="h-2.5 w-2.5" />
                {bankAccountName}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1">
            {payment.status !== 'paid' && onMarkAsPaid && (
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10" onClick={(e) => { e.stopPropagation(); onMarkAsPaid(payment.id); }} title="Marcar como pago">
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
