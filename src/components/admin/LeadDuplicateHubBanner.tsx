import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/types/crm";

interface DuplicateRow {
  company_id: string;
  company_name: string;
  lead_id: string;
  status: LeadStatus;
  last_message_at: string | null;
  lead_created_at: string;
}

interface Props {
  phone: string | null | undefined;
  companyId: string | null | undefined;
}

export function LeadDuplicateHubBanner({ phone, companyId }: Props) {
  const [rows, setRows] = useState<DuplicateRow[]>([]);

  useEffect(() => {
    if (!phone || !companyId) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase.rpc("get_lead_duplicates_in_hub", {
        _phone: phone,
        _company_id: companyId,
      });
      if (!active) return;
      if (error) {
        console.error("[LeadDuplicateHubBanner]", error);
        return;
      }
      setRows((data || []) as DuplicateRow[]);
    })();
    return () => {
      active = false;
    };
  }, [phone, companyId]);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-300/40 bg-amber-50 dark:bg-amber-500/10 p-3 shadow-sm">
      <div className="flex items-start gap-2.5">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            ⚠️ Lead também existe em outra unidade do grupo
          </h4>
          <p className="text-xs text-amber-700/80 dark:text-amber-300/70 mt-0.5 leading-relaxed">
            Este telefone já está cadastrado em {rows.length === 1 ? "outra unidade" : `${rows.length} outras unidades`}. Cuidado com atendimento duplicado.
          </p>
          <ul className="mt-2 space-y-1">
            {rows.map((r) => (
              <li
                key={r.lead_id}
                className="text-xs flex flex-wrap items-center gap-x-2 gap-y-0.5 bg-white/60 dark:bg-amber-500/5 rounded-md px-2 py-1 border border-amber-200/50"
              >
                <span className="font-semibold text-amber-900 dark:text-amber-200">
                  {r.company_name}
                </span>
                <span className="text-amber-700/80">•</span>
                <span className="text-amber-700/90">
                  {LEAD_STATUS_LABELS[r.status] || r.status}
                </span>
                {r.last_message_at && (
                  <>
                    <span className="text-amber-700/80">•</span>
                    <span className="text-amber-700/70">
                      última msg{" "}
                      {formatDistanceToNow(new Date(r.last_message_at), {
                        locale: ptBR,
                        addSuffix: true,
                      })}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
