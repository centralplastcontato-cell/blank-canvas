import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const PAGE_SIZE = 20;

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  totalItems: number;
}

function PaginationBar({ page, totalPages, onPageChange, totalItems }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-3 border-t border-border/40">
      <p className="text-xs text-muted-foreground">
        Página {page + 1} de {totalPages} ({totalItems} itens)
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function paginate<T>(items: T[], page: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  return { items: items.slice(start, start + PAGE_SIZE), totalPages, total: items.length };
}

interface Props {
  kpiSheet: 'recebido' | 'a_receber' | 'atraso' | 'despesas' | 'despesas_pagas' | 'saldo' | null;
  dashboard: any;
  fmt: (v: number) => string;
  CATEGORY_LABELS: Record<string, string>;
}

export function KpiSheetBody({ kpiSheet, dashboard, fmt, CATEGORY_LABELS }: Props) {
  const [page, setPage] = useState(0);

  // Reset page when kpiSheet changes
  useEffect(() => { setPage(0); }, [kpiSheet]);

  const renderPaymentList = (
    payments: any[],
    colorClass: string,
    dateField: 'paid_at' | 'due_date',
    datePrefix: string
  ) => {
    const { items, totalPages, total } = paginate(payments, page);
    return (
      <div className="mt-4 space-y-2">
        {items.map((p: any) => (
          <Card key={p.id} className="p-3 bg-card border-border">
            <div className="flex justify-between items-start">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{p.lead_name || p.event_title}</p>
                <p className={`text-xs ${colorClass === 'text-red-400' ? 'text-red-400' : 'text-muted-foreground'}`}>
                  {p.type === 'entrada' ? 'Entrada' : 'Parcela'} · {datePrefix}{' '}
                  {dateField === 'paid_at' && p.paid_at
                    ? format(new Date(p.paid_at), 'dd/MM/yyyy')
                    : dateField === 'due_date' && p.due_date
                    ? format(new Date(p.due_date + 'T12:00:00'), 'dd/MM/yyyy')
                    : ''}
                </p>
                {p.unit && <Badge variant="outline" className="mt-1 text-[10px]">{p.unit}</Badge>}
              </div>
              <p className={`text-sm font-bold ${colorClass} whitespace-nowrap ml-2`}>{fmt(p.amount)}</p>
            </div>
          </Card>
        ))}
        <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} />
      </div>
    );
  };

  const renderExpenseList = (expenses: any[], colorClass: string, showStatus = false) => {
    const { items, totalPages, total } = paginate(expenses, page);
    return (
      <div className="mt-4 space-y-2">
        {items.map((e: any) => (
          <Card key={e.id} className="p-3 bg-card border-border">
            <div className="flex justify-between items-start">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{e.description}</p>
                <p className="text-xs text-muted-foreground">
                  {CATEGORY_LABELS[e.category] || e.category} · {format(new Date(e.expense_date + 'T12:00:00'), 'dd/MM/yyyy')}
                </p>
                {showStatus && (
                  <Badge variant={e.status === 'pago' ? 'default' : 'outline'} className="mt-1 text-[10px]">
                    {e.status === 'pago' ? 'Pago' : 'Pendente'}
                  </Badge>
                )}
              </div>
              <p className={`text-sm font-bold ${colorClass} whitespace-nowrap ml-2`}>{fmt(e.amount)}</p>
            </div>
          </Card>
        ))}
        <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} />
      </div>
    );
  };

  if (kpiSheet === 'recebido') {
    return renderPaymentList(dashboard.paidThisMonth, 'text-emerald-400', 'paid_at', '');
  }
  if (kpiSheet === 'a_receber') {
    return renderPaymentList(dashboard.pendingThisMonth, 'text-amber-400', 'due_date', 'Vence');
  }
  if (kpiSheet === 'atraso') {
    return renderPaymentList(dashboard.latePayments, 'text-red-400', 'due_date', 'Venceu');
  }
  if (kpiSheet === 'despesas') {
    const filtered = dashboard.expensesThisMonth.filter((e: any) => e.expense_type !== 'ajuste');
    return renderExpenseList(filtered, 'text-blue-400', true);
  }
  if (kpiSheet === 'despesas_pagas') {
    const filtered = dashboard.expensesThisMonth.filter((e: any) => e.expense_type !== 'ajuste' && e.status === 'pago');
    return renderExpenseList(filtered, 'text-teal-400');
  }
  if (kpiSheet === 'saldo') {
    return (
      <div className="mt-4 space-y-3">
        <Card className="p-4 bg-card border-border space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Receitas recebidas</span>
            <span className="text-emerald-400 font-medium">{fmt(dashboard.totalReceivedMonth)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Receitas pendentes</span>
            <span className="text-amber-400 font-medium">{fmt(dashboard.totalPendingMonth)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Em atraso</span>
            <span className="text-red-400 font-medium">{fmt(dashboard.totalLate)}</span>
          </div>
          <div className="border-t border-border my-1" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Despesas lançadas</span>
            <span className="text-blue-400 font-medium">{fmt(dashboard.totalExpensesMonth)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Despesas pagas</span>
            <span className="text-teal-400 font-medium">{fmt(dashboard.totalExpensesPaidMonth)}</span>
          </div>
          <div className="border-t border-border my-1" />
          <div className="flex justify-between text-sm font-bold">
            <span className="text-foreground">Saldo (Recebido - Despesas)</span>
            <span className={dashboard.saldoMonth >= 0 ? 'text-emerald-400' : 'text-red-400'}>{fmt(dashboard.saldoMonth)}</span>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
