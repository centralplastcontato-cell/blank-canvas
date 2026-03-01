import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { OnboardingStep } from '@/hooks/useOnboardingProgress';

interface OnboardingChecklistProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  onDismiss: () => void;
}

export function OnboardingChecklist({ open, onOpenChange, steps, completedCount, totalCount, onDismiss }: OnboardingChecklistProps) {
  const navigate = useNavigate();
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleGoTo = (route: string) => {
    onOpenChange(false);
    navigate(route);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Primeiros Passos</SheetTitle>
          <SheetDescription>
            Complete os passos abaixo para configurar sua plataforma.
          </SheetDescription>
          <div className="flex items-center gap-3 pt-2">
            <Progress value={percentage} className="h-2.5 flex-1" />
            <span className="text-sm font-medium text-foreground">{percentage}%</span>
          </div>
          <p className="text-xs text-muted-foreground">{completedCount} de {totalCount} passos concluídos</p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 -mx-6 px-6 space-y-1">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
                step.completed ? 'bg-muted/40' : 'hover:bg-muted/30'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              </div>
              {!step.completed && step.route && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleGoTo(step.route!)}
                  className="shrink-0 gap-1 text-xs text-primary hover:text-primary h-7 px-2"
                >
                  Ir <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <SheetFooter className="border-t pt-4">
          <Button variant="outline" size="sm" onClick={onDismiss} className="w-full">
            Dispensar checklist
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
