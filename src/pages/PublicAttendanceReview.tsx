import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, Users, Copy, Baby, Phone, Info } from "lucide-react";
import { format } from "date-fns";

interface Guest {
  name: string;
  age: string;
  phone: string;
  is_child_only: boolean;
  guardian_name: string;
  guardian_phone: string;
  wants_info: boolean;
}

export default function PublicAttendanceReview() {
  const { recordId } = useParams<{ recordId: string }>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");

  useEffect(() => {
    async function load() {
      if (!recordId) { setNotFound(true); setLoading(false); return; }

      const { data, error } = await supabase
        .from("attendance_entries")
        .select("*")
        .eq("id", recordId)
        .single();

      if (error || !data) { setNotFound(true); setLoading(false); return; }

      setGuests((data.guests || []) as unknown as Guest[]);

      const { data: companyArr } = await supabase.rpc("get_company_public_info", { _company_id: data.company_id });
      const company = companyArr && (companyArr as any[])[0];
      if (company) {
        setCompanyName(company.name || "");
        setCompanyLogo(company.logo_url || "");
      }

      if (data.event_id) {
        const { data: evArr } = await supabase.rpc("get_event_public_info", { _event_id: data.event_id });
        const ev = evArr && (evArr as any[])[0];
        if (ev) {
          setEventTitle(ev.title);
          setEventDate(ev.event_date);
        }
      }

      setLoading(false);
    }
    load();
  }, [recordId]);

  const ageStats = useMemo(() => {
    const stats = { total: guests.length, "0-4": 0, "5-10": 0, "11-16": 0, "17-18": 0, "18+": 0, na: 0 };
    for (const g of guests) {
      const n = parseInt(g.age);
      if (isNaN(n) || !g.age?.trim()) { stats.na++; continue; }
      if (n <= 4) stats["0-4"]++;
      else if (n <= 10) stats["5-10"]++;
      else if (n <= 16) stats["11-16"]++;
      else if (n <= 18) stats["17-18"]++;
      else stats["18+"]++;
    }
    return stats;
  }, [guests]);

  const handleCopyList = () => {
    const lines: string[] = [];
    if (companyName) lines.push(`Lista de Presença - ${companyName}`);
    if (eventTitle) lines.push(`Festa: ${eventTitle}`);
    if (eventDate) lines.push(`Data: ${format(new Date(eventDate + "T12:00:00"), "dd/MM/yyyy")}`);
    lines.push(`${guests.length} convidado${guests.length !== 1 ? "s" : ""}`);
    lines.push("");
    guests.forEach((g, i) => {
      let line = `#${i + 1} ${g.name}`;
      if (g.age?.trim()) line += ` - ${g.age} anos`;
      if (g.phone?.trim()) line += ` - ${g.phone}`;
      if (g.is_child_only) line += ` - 👶 Resp: ${g.guardian_name} ${g.guardian_phone}`;
      if (g.wants_info) line += ` - Quer info`;
      lines.push(line);
    });
    navigator.clipboard.writeText(lines.join("\n"));
    toast({ title: "📋 Lista copiada!" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold mb-2">Lista não encontrada</h1>
        <p className="text-muted-foreground text-center">Este link pode estar expirado ou inválido.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header card */}
      <div className="bg-card border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-5">
          <div className="flex items-center gap-3 mb-3">
            {companyLogo && (
              <img src={companyLogo} alt="" className="h-12 w-12 rounded-xl object-cover shadow-sm" />
            )}
            <div className="min-w-0">
              <h1 className="font-bold text-lg text-foreground">{companyName || "Lista de Presença"}</h1>
              {eventTitle && <p className="text-sm text-muted-foreground">{eventTitle}</p>}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-muted-foreground">
              {eventDate && (
                <span>{format(new Date(eventDate + "T12:00:00"), "dd/MM/yyyy")}</span>
              )}
              <span className="font-semibold text-foreground">
                {guests.length} convidado{guests.length !== 1 ? "s" : ""}
              </span>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleCopyList}>
              <Copy className="h-3.5 w-3.5" /> Copiar
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Age stats */}
        {ageStats.total > 0 && (
          <Card>
            <CardContent className="py-3 px-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Faixa Etária</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Total", value: ageStats.total },
                  { label: "0-4", value: ageStats["0-4"] },
                  { label: "5-10", value: ageStats["5-10"] },
                  { label: "11-16", value: ageStats["11-16"] },
                  { label: "17-18", value: ageStats["17-18"] },
                  { label: "18+", value: ageStats["18+"] },
                  ...(ageStats.na > 0 ? [{ label: "S/I", value: ageStats.na }] : []),
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-muted/50 p-2">
                    <p className="text-lg font-bold text-foreground">{item.value}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{item.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Guest list */}
        {guests.length > 0 && (
          <div className="space-y-2">
            {guests.map((guest, i) => (
              <Card key={i}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold text-muted-foreground bg-muted rounded-full h-6 w-6 flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="font-medium text-foreground">
                        {guest.name}
                        {guest.age?.trim() && (
                          <span className="text-muted-foreground font-normal"> · {guest.age} anos</span>
                        )}
                      </p>
                      {guest.phone?.trim() && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {guest.phone}
                        </p>
                      )}
                      {guest.is_child_only && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Baby className="h-3 w-3" /> Criança desacompanhada
                          {(guest.guardian_name || guest.guardian_phone) && (
                            <span> — Resp: {guest.guardian_name} {guest.guardian_phone}</span>
                          )}
                        </p>
                      )}
                      {guest.wants_info && (
                        <p className="text-xs text-primary flex items-center gap-1">
                          <Info className="h-3 w-3" /> Quer receber informações
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {guests.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Nenhum convidado registrado ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
