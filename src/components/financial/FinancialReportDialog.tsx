import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, CalendarRange, Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { generateFinancialPDF, type ReportType } from '@/lib/generateFinancialPDF';
import type { EnrichedPayment, Expense } from '@/hooks/useFinanceiroDashboard';
import type { DateRange } from 'react-day-picker';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payments: EnrichedPayment[];
  expenses: Expense[];
  companyName: string;
  unitOptions: { value: string; label: string }[];
}

const REPORT_TYPES: { value: ReportType; label: string; desc: string }[] = [
  { value: 'despesas', label: 'Despesas', desc: 'Lista completa de despesas com categoria e status' },
  { value: 'receitas', label: 'Receitas', desc: 'Parcelas por cliente: pagas, pendentes e atrasadas' },
  { value: 'resultado', label: 'Resultado Geral', desc: 'Resumo consolidado: receitas vs despesas e saldo' },
];

type Preset = 'mes' | 'bimestre' | 'trimestre' | 'semestre' | 'ano' | 'custom';

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'mes', label: 'Mês atual' },
  { value: 'bimestre', label: 'Bimestre' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'semestre', label: 'Semestre' },
  { value: 'ano', label: 'Ano' },
];

function getPresetRange(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const fmtd = (d: Date) => format(d, 'yyyy-MM-dd');
  switch (preset) {
    case 'mes': return { from: fmtd(startOfMonth(now)), to: fmtd(endOfMonth(now)) };
    case 'bimestre': return { from: fmtd(startOfMonth(now)), to: fmtd(endOfMonth(addMonths(now, 1))) };
    case 'trimestre': return { from: fmtd(startOfMonth(now)), to: fmtd(endOfMonth(addMonths(now, 2))) };
    case 'semestre': return { from: fmtd(startOfMonth(now)), to: fmtd(endOfMonth(addMonths(now, 5))) };
    case 'ano': return { from: fmtd(startOfYear(now)), to: fmtd(endOfYear(now)) };
    default: return { from: fmtd(startOfMonth(now)), to: fmtd(endOfMonth(now)) };
  }
}

export function FinancialReportDialog({ open, onOpenChange, payments, expenses, companyName, unitOptions }: Props) {
  const [reportType, setReportType] = useState<ReportType>('resultado');
  const [activePreset, setActivePreset] = useState<Preset>('mes');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [customOpen, setCustomOpen] = useState(false);
  const [unit, setUnit] = useState('all');
  const [outputFormat, setOutputFormat] = useState<'pdf' | 'xlsx'>('pdf');
  const [generating, setGenerating] = useState(false);

  const range = activePreset === 'custom' && customRange?.from && customRange?.to
    ? { from: format(customRange.from, 'yyyy-MM-dd'), to: format(customRange.to, 'yyyy-MM-dd') }
    : getPresetRange(activePreset);

  const periodLabel = format(new Date(range.from + 'T12:00:00'), 'dd/MM/yyyy') + ' a ' + format(new Date(range.to + 'T12:00:00'), 'dd/MM/yyyy');

  const handleGenerate = () => {
    setGenerating(true);

    const filteredPayments = unit === 'all' ? payments : payments.filter(p => p.unit === unit);
    const filteredExpenses = unit === 'all' ? expenses : expenses.filter(e => e.unit === unit);

    setTimeout(() => {
      generateFinancialPDF({
        type: reportType,
        companyName,
        periodLabel,
        from: range.from,
        to: range.to,
        payments: filteredPayments,
        expenses: filteredExpenses,
      });
      setGenerating(false);
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Gerar Relatório
          </DialogTitle>
          <DialogDescription>Escolha o tipo de relatório e o período desejado.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Report type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Tipo de relatório</label>
            <div className="grid gap-2">
              {REPORT_TYPES.map(rt => (
                <button
                  key={rt.value}
                  onClick={() => setReportType(rt.value)}
                  className={cn(
                    'flex flex-col items-start text-left rounded-lg border p-3 transition-all',
                    reportType === rt.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border hover:bg-accent/50'
                  )}
                >
                  <span className="text-sm font-medium">{rt.label}</span>
                  <span className="text-xs text-muted-foreground">{rt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Period */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Período</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => { setActivePreset(p.value); setCustomRange(undefined); }}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    activePreset === p.value
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-transparent text-muted-foreground border-border hover:bg-accent'
                  )}
                >
                  {p.label}
                </button>
              ))}
              <Popover open={customOpen} onOpenChange={setCustomOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      activePreset === 'custom'
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-transparent text-muted-foreground border-border hover:bg-accent'
                    )}
                  >
                    <CalendarRange className="h-3 w-3" />
                    Personalizado
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <Calendar
                    mode="range"
                    selected={customRange}
                    onSelect={setCustomRange}
                    numberOfMonths={1}
                    locale={ptBR}
                  />
                  <div className="flex justify-end pt-2 border-t border-border/40">
                    <Button
                      size="sm"
                      disabled={!customRange?.from || !customRange?.to}
                      onClick={() => { setActivePreset('custom'); setCustomOpen(false); }}
                    >
                      Aplicar
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-xs text-muted-foreground">{periodLabel}</p>
          </div>

          {/* Unit filter */}
          {unitOptions.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Unidade</label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas unidades</SelectItem>
                  {unitOptions.map(u => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Generate */}
          <Button onClick={handleGenerate} disabled={generating} className="w-full gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {generating ? 'Gerando...' : 'Gerar PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
