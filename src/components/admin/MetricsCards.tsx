import { Card, CardContent } from "@/components/ui/card";
import { Users, UserPlus, Clock, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export interface LeadMetrics {
  total: number;
  today: number;
  novo: number;
  em_contato: number;
  fechado: number;
  perdido: number;
}

interface MetricsCardsProps {
  metrics: LeadMetrics;
  isLoading: boolean;
}

export function MetricsCards({ metrics, isLoading }: MetricsCardsProps) {
  const cards = [
    {
      title: "Total de Leads",
      value: metrics.total,
      icon: Users,
      gradient: "from-primary/20 via-primary/10 to-transparent",
      iconBg: "bg-primary/15",
      iconColor: "text-primary",
      borderColor: "border-primary/20",
    },
    {
      title: "Leads Hoje",
      value: metrics.today,
      icon: UserPlus,
      gradient: "from-sky-500/20 via-sky-500/10 to-transparent",
      iconBg: "bg-sky-500/15",
      iconColor: "text-sky-600",
      borderColor: "border-sky-500/20",
    },
    {
      title: "Novos",
      value: metrics.novo,
      icon: Clock,
      gradient: "from-amber-500/20 via-amber-500/10 to-transparent",
      iconBg: "bg-amber-500/15",
      iconColor: "text-amber-600",
      borderColor: "border-amber-500/20",
    },
    {
      title: "Em Contato",
      value: metrics.em_contato,
      icon: TrendingUp,
      gradient: "from-orange-500/20 via-orange-500/10 to-transparent",
      iconBg: "bg-orange-500/15",
      iconColor: "text-orange-600",
      borderColor: "border-orange-500/20",
    },
    {
      title: "Fechados",
      value: metrics.fechado,
      icon: CheckCircle,
      gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent",
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-600",
      borderColor: "border-emerald-500/20",
    },
    {
      title: "Perdidos",
      value: metrics.perdido,
      icon: XCircle,
      gradient: "from-rose-500/20 via-rose-500/10 to-transparent",
      iconBg: "bg-rose-500/15",
      iconColor: "text-rose-600",
      borderColor: "border-rose-500/20",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-border/50 overflow-hidden">
            <CardContent className="p-4">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-7 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
      {cards.map((metric) => (
        <Card 
          key={metric.title} 
          className={`
            relative border ${metric.borderColor} overflow-hidden
            hover:-translate-y-1
            transition-all duration-300 ease-out cursor-default
            bg-card
          `}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} pointer-events-none`} />
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center gap-2.5 mb-3">
              <div className={`p-2.5 rounded-xl ${metric.iconBg}`}>
                <metric.icon className={`w-5 h-5 ${metric.iconColor}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground tracking-tight mb-0.5">{metric.value}</p>
            <span className="text-xs text-muted-foreground font-medium">
              {metric.title}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
