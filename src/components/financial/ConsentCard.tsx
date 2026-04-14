import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, DollarSign, Receipt, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { FinancialConsent } from '@/hooks/useFinancialConsent';

const ACTION_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  payment_paid: { label: 'Baixar Parcela', icon: <DollarSign className="h-4 w-4" />, color: 'text-emerald-500' },
  partial_payment: { label: 'Pagamento Parcial', icon: <DollarSign className="h-4 w-4" />, color: 'text-amber-500' },
  expense_paid: { label: 'Pagar Despesa', icon: <Receipt className="h-4 w-4" />, color: 'text-blue-500' },
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Props {
  consent: FinancialConsent;
  onApprove: (consent: FinancialConsent) => void;
  onReject: (id: string) => void;
}

export function ConsentCard({ consent, onApprove, onReject }: Props) {
  const [loading, setLoading] = useState(false);
  const actionInfo = ACTION_LABELS[consent.action_type] || { label: consent.action_type, icon: <Clock className="h-4 w-4" />, color: 'text-muted-foreground' };

  const handleApprove = async () => {
    setLoading(true);
    await onApprove(consent);
    setLoading(false);
  };

  const handleReject = async () => {
    setLoading(true);
    await onReject(consent.id);
    setLoading(false);
  };

  return (
    <Card className="p-4 space-y-3 border-amber-500/20 bg-amber-500/[0.03]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-muted ${actionInfo.color}`}>
            {actionInfo.icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{actionInfo.label}</p>
            {consent.description && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{consent.description}</p>
            )}
          </div>
        </div>
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] shrink-0">
          <Clock className="h-3 w-3 mr-1" />
          Pendente
        </Badge>
      </div>

      {consent.amount != null && consent.amount > 0 && (
        <div className="text-lg font-bold text-foreground">
          {fmt(consent.amount)}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <User className="h-3 w-3" />
        <span>{consent.requested_by_name || 'Usuário'}</span>
        <span>·</span>
        <span>{format(new Date(consent.requested_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
          onClick={handleReject}
          disabled={loading}
        >
          <XCircle className="h-3.5 w-3.5 mr-1" />
          Rejeitar
        </Button>
        <Button
          size="sm"
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleApprove}
          disabled={loading}
        >
          <CheckCircle className="h-3.5 w-3.5 mr-1" />
          Aprovar
        </Button>
      </div>
    </Card>
  );
}
