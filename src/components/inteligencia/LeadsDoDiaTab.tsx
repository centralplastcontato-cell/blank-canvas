import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Download } from "lucide-react";
import { TemperatureBadge } from "./TemperatureBadge";
import { InlineAISummary } from "./InlineAISummary";
import { LeadIntelligence } from "@/hooks/useLeadIntelligence";
import { LEAD_STATUS_LABELS, LeadStatus } from "@/types/crm";
import { format, isToday } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface LeadsDoDiaTabProps {
  data: LeadIntelligence[];
  canExport: boolean;
}

export function LeadsDoDiaTab({ data, canExport }: LeadsDoDiaTabProps) {
  const navigate = useNavigate();

  const todayLeads = data.filter(d => {
    const createdAt = d.lead_created_at || d.created_at;
    return isToday(new Date(createdAt));
  });

  const handleExport = () => {
    const rows = todayLeads.map(d => [
      d.lead_name,
      d.score,
      d.temperature,
      LEAD_STATUS_LABELS[d.lead_status as LeadStatus] || d.lead_status,
      d.lead_whatsapp,
    ]);

    const csv = [
      ['Nome', 'Score', 'Temperatura', 'Status', 'WhatsApp'].join(','),
      ...rows.map(r => r.join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inteligencia-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          Leads do Dia ({todayLeads.length})
        </CardTitle>
        {canExport && todayLeads.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {todayLeads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum lead novo hoje
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Temperatura</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayLeads.map(item => (
                  <React.Fragment key={item.id}>
                    <TableRow>
                      <TableCell className="font-medium">{item.lead_name}</TableCell>
                      <TableCell>
                        <span className="font-semibold">{item.score}</span>
                      </TableCell>
                      <TableCell>
                        <TemperatureBadge temperature={item.temperature} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {LEAD_STATUS_LABELS[item.lead_status as LeadStatus] || item.lead_status}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/atendimento?phone=${item.lead_whatsapp}`)}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={5} className="pt-0 pb-2">
                        <InlineAISummary leadId={item.lead_id} />
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
