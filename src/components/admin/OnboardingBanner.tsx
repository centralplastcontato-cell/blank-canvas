import { useState } from 'react';
import { X, Rocket, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingChecklist } from './OnboardingChecklist';
import { Json } from '@/integrations/supabase/types';

export function OnboardingBanner() {
  const { steps, completedCount, totalCount, isLoading, isDismissed } = useOnboardingProgress();
  const { currentCompany, currentCompanyId } = useCompany();
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || isDismissed || dismissed || totalCount === 0 || completedCount === totalCount) return null;

  const percentage = Math.round((completedCount / totalCount) * 100);

  const handleDismiss = async () => {
    setDismissed(true);
    if (!currentCompanyId) return;
    const currentSettings = (currentCompany?.settings as Record<string, Json | undefined>) || {};
    await supabase.from('companies').update({
      settings: { ...currentSettings, onboarding_checklist_dismissed: true } as unknown as Json,
    }).eq('id', currentCompanyId);
  };

  return (
    <>
      <div className="mx-3 mt-3 md:mx-5 md:mt-4">
        <div className="relative flex flex-col md:flex-row md:items-center gap-2 md:gap-4 rounded-xl border border-primary/20 bg-primary/5 p-3 md:p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">Primeiros Passos</p>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{completedCount}/{totalCount}</span>
          </div>
          <Progress value={percentage} className="h-2 w-full md:flex-1" />
          <Button variant="ghost" size="sm" onClick={() => setIsChecklistOpen(true)} className="self-start md:self-auto shrink-0 gap-1 text-primary hover:text-primary">
            Ver passos <ChevronRight className="h-4 w-4" />
          </Button>
          <button onClick={handleDismiss} className="absolute top-2 right-2 rounded-sm p-0.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <OnboardingChecklist
        open={isChecklistOpen}
        onOpenChange={setIsChecklistOpen}
        steps={steps}
        completedCount={completedCount}
        totalCount={totalCount}
        onDismiss={handleDismiss}
      />
    </>
  );
}
