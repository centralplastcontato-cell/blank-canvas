import { Card, CardContent } from "@/components/ui/card";
import { Lead, LeadStatus } from "@/types/crm";
import { Users, UserPlus, Clock, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricsCardsProps {
  leads: Lead[];
  isLoading: boolean;
}

export function MetricsCards({ leads, isLoading }: MetricsCardsProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalLeads = leads.length;
  const leadsToday = leads.filter((lead) => {
    const createdAt = new Date(lead.created_at);
    createdAt.setHours(0, 0, 0, 0);
    return createdAt.getTime() === today.getTime();
  }).length;

  const leadsByStatus = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<LeadStatus, number>);

  const newLeads = leadsByStatus["novo"] || 0;
  const inContact = leadsByStatus["em_contato"] || 0;
  const closed = leadsByStatus["fechado"] || 0;
  const lost = leadsByStatus["perdido"] || 0;

  const metrics = [
    {
      title: "Total de Leads",
      value: totalLeads,
      icon: Users,
      gradient: "from-primary/20 via-primary/10 to-transparent",
      iconBg: "bg-primary/15",
      iconColor: "text-primary",
      borderColor: "border-primary/20",
    },
    {
      title: "Leads Hoje",
      value: leadsToday,
      icon: UserPlus,
      gradient: "from-sky-500/20 via-sky-500/10 to-transparent",
      iconBg: "bg-sky-500/15",
      iconColor: "text-sky-600",
      borderColor: "border-sky-500/20",
    },
    {
      title: "Novos",
      value: newLeads,
      icon: Clock,
      gradient: "from-amber-500/20 via-amber-500/10 to-transparent",
      iconBg: "bg-amber-500/15",
      iconColor: "text-amber-600",
      borderColor: "border-amber-500/20",
    },
    {
      title: "Em Contato",
      value: inContact,
      icon: TrendingUp,
      gradient: "from-orange-500/20 via-orange-500/10 to-transparent",
      iconBg: "bg-orange-500/15",
      iconColor: "text-orange-600",
      borderColor: "border-orange-500/20",
    },
    {
      title: "Fechados",
      value: closed,
      icon: CheckCircle,
      gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent",
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-600",
      borderColor: "border-emerald-500/20",
    },
    {
      title: "Perdidos",
      value: lost,
      icon: XCircle,
      gradient: "from-rose-500/20 via-rose-500/10 to-transparent",
      iconBg: "bg-rose-500/15",
      iconColor: "text-rose-600",
      borderColor: "border-rose-500/20",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-border/50 overflow-hidden">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-3" />
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {metrics.map((metric) => (
        <Card 
          key={metric.title} 
          className={`
            relative border ${metric.borderColor} overflow-hidden
            hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.02]
            transition-all duration-300 ease-out cursor-default
            bg-card
          `}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} pointer-events-none`} />
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center gap-2.5 mb-3">
              <div className={`p-2 rounded-lg ${metric.iconBg} shadow-sm`}>
                <metric.icon className={`w-4 h-4 ${metric.iconColor}`} />
              </div>
              <span className="text-xs text-muted-foreground font-medium truncate">
                {metric.title}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground tracking-tight">{metric.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
