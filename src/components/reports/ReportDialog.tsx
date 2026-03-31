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
import type { DateRange } from 'react-day-picker';

export interface ReportOption {
  value: string;
  label: string;
  desc: string;
}

export interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  reportTypes: ReportOption[];
  defaultType?: string;
  unitOptions: { value: string; label: string }[];
  onGenerate: (params: { type: string; from: string; to: string; periodLabel: string; unit: string; format: 'pdf' | 'xlsx' }) => void;
}

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

export function ReportDialog({ open, onOpenChange, title, reportTypes, defaultType, unitOptions, onGenerate }: ReportDialogProps) {
  const [reportType, setReportType] = useState(defaultType || reportTypes[0]?.value || '');
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
    setTimeout(() => {
      onGenerate({ type: reportType, from: range.from, to: range.to, periodLabel, unit, format: outputFormat });
      setGenerating(false);
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>Escolha o tipo, período e formato.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-5 pb-5 overflow-y-auto flex-1 min-h-0">
          {/* Report type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Tipo de relatório</label>
            <div className="grid gap-1.5">
              {reportTypes.map(rt => (
                <button
                  key={rt.value}
                  onClick={() => setReportType(rt.value)}
                  className={cn(
                    'flex flex-col items-start text-left rounded-lg border p-2.5 transition-all',
                    reportType === rt.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border hover:bg-accent/50'
                  )}
                >
                  <span className="text-sm font-medium">{rt.label}</span>
                  <span className="text-[11px] text-muted-foreground leading-tight">{rt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Period */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Período</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => { setActivePreset(p.value); setCustomRange(undefined); setCustomOpen(false); }}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                    activePreset === p.value && !customOpen
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-transparent text-muted-foreground border-border hover:bg-accent'
                  )}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => { setCustomOpen(!customOpen); if (!customOpen) setActivePreset('custom'); }}
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                  activePreset === 'custom'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-transparent text-muted-foreground border-border hover:bg-accent'
                )}
              >
                <CalendarRange className="h-3 w-3" />
                Personalizado
              </button>
            </div>

            {customOpen && (
              <div className="rounded-lg border border-border p-3 space-y-2">
                <Calendar
                  mode="range"
                  selected={customRange}
                  onSelect={(r) => { setCustomRange(r); if (r?.from && r?.to) setActivePreset('custom'); }}
                  numberOfMonths={1}
                  locale={ptBR}
                  className="p-0 w-full [&_.rdp-month]:w-full [&_.rdp-table]:w-full"
                />
                {customRange?.from && customRange?.to && (
                  <p className="text-xs text-center text-muted-foreground">
                    {format(customRange.from, "dd/MM/yyyy")} – {format(customRange.to, "dd/MM/yyyy")}
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground">{periodLabel}</p>
          </div>

          {/* Unit filter */}
          {unitOptions.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Unidade</label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="h-9 text-xs w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas unidades</SelectItem>
                  {unitOptions.map(u => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Format */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Formato</label>
            <div className="flex gap-2">
              <button onClick={() => setOutputFormat('pdf')} className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 transition-all text-sm font-medium',
                outputFormat === 'pdf' ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:bg-accent/50'
              )}>
                <FileText className="h-4 w-4" /> PDF
              </button>
              <button onClick={() => setOutputFormat('xlsx')} className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 transition-all text-sm font-medium',
                outputFormat === 'xlsx' ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:bg-accent/50'
              )}>
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </button>
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={generating} className="w-full gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {generating ? 'Gerando...' : `Gerar ${outputFormat === 'xlsx' ? 'Excel' : 'PDF'}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
