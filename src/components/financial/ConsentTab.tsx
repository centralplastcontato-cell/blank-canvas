import { ConsentCard } from './ConsentCard';
import { useFinancialConsent } from '@/hooks/useFinancialConsent';
import { ClipboardCheck } from 'lucide-react';

interface Props {
  consentHook: ReturnType<typeof useFinancialConsent>;
  onRefreshDashboard: () => void;
}

export function ConsentTab({ consentHook, onRefreshDashboard }: Props) {
  const { pendingConsents, approveConsent, rejectConsent } = consentHook;

  const handleApprove = async (consent: any) => {
    await approveConsent(consent);
    onRefreshDashboard();
  };

  const handleReject = async (id: string) => {
    await rejectConsent(id);
  };

  if (pendingConsents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Tudo aprovado!</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Não há ações financeiras pendentes de aprovação.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
      {pendingConsents.map(consent => (
        <ConsentCard
          key={consent.id}
          consent={consent}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      ))}
    </div>
  );
}
