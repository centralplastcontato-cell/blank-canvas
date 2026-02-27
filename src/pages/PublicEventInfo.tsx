import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, FileText, CalendarDays, User, Phone } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { format } from "date-fns";

interface InfoBlock {
  title: string;
  content: string;
}

export default function PublicEventInfo() {
  const { recordId } = useParams<{ recordId: string }>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [items, setItems] = useState<InfoBlock[]>([]);
  const [notes, setNotes] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");

  useEffect(() => {
    if (!recordId) return;
    (async () => {
      const { data, error } = await supabase
        .from("event_info_entries")
        .select("*")
        .eq("id", recordId)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setItems(data.items as unknown as InfoBlock[]);
      setNotes(data.notes || "");

      // Fetch company info via RPC (security: no direct anon access to companies table)
      const { data: companyArr } = await supabase.rpc("get_company_public_info", { _company_id: data.company_id });
      const company = companyArr && (companyArr as any[])[0];
      if (company) {
        setCompanyName(company.name);
        setCompanyLogo(company.logo_url || "");
      }

      // Fetch event + lead info via RPC
      if (data.event_id) {
        const { data: evArr } = await supabase.rpc("get_event_public_info", { _event_id: data.event_id });
        const ev = evArr && (evArr as any[])[0];

        if (ev) {
          setEventTitle(ev.title);
          setEventDate(ev.event_date);

          if (ev.lead_id) {
            const { data: lead } = await supabase
              .from("campaign_leads")
              .select("name, whatsapp")
              .eq("id", ev.lead_id)
              .single();

            if (lead) {
              setLeadName(lead.name);
              setLeadPhone(lead.whatsapp || "");
            }
          }
        }
      }

      setLoading(false);
    })();
  }, [recordId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h1 className="text-xl font-semibold mb-2">Registro não encontrado</h1>
            <p className="text-muted-foreground text-sm">Este link pode estar incorreto ou o registro foi removido.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Header with company branding */}
        <div className="text-center space-y-3">
          {companyLogo && (
            <img src={companyLogo} alt={companyName} className="h-12 w-auto mx-auto object-contain" />
          )}
          <div>
            {companyName && <p className="text-xs text-muted-foreground uppercase tracking-wider">{companyName}</p>}
            <div className="flex items-center justify-center gap-2 mt-1">
              <FileText className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">Informações da Festa</h1>
            </div>
          </div>
        </div>

        {/* Event details card */}
        {(eventTitle || leadName) && (
          <Card>
            <CardContent className="p-4 space-y-2">
              {eventTitle && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{eventTitle}</span>
                  {eventDate && (
                    <span className="text-xs text-muted-foreground">
                      — {format(new Date(eventDate + "T12:00:00"), "dd/MM/yyyy")}
                    </span>
                  )}
                </div>
              )}
              {leadName && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{leadName}</span>
                </div>
              )}
              {leadPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{leadPhone}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Information blocks */}
        <div className="space-y-3">
          {items.map((block, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-primary mb-1.5">{block.title || "Sem título"}</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{block.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Notes */}
        {notes && (
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">📝 {notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
