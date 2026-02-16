import { Lead } from "@/types/crm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { UserWithRole, LEAD_STATUS_LABELS, ROLE_LABELS } from "@/types/crm";
import { maskPhone } from "@/lib/mask-utils";

interface ExportLeadsProps {
  leads: Lead[];
  responsaveis: UserWithRole[];
  canViewContact?: boolean;
}

export function exportLeadsToCSV({ leads, responsaveis, canViewContact = true }: ExportLeadsProps) {
  const getResponsavelName = (responsavelId: string | null) => {
    if (!responsavelId) return "";
    const r = responsaveis.find((r) => r.user_id === responsavelId);
    return r?.full_name || "";
  };

  // CSV Headers
  const headers = [
    "Nome",
    "WhatsApp",
    "Unidade",
    "Campanha",
    "Mês",
    "Dia",
    "Convidados",
    "Status",
    "Responsável",
    "Data Criação",
    "Observações",
  ];

  // CSV Rows
  const rows = leads.map((lead) => [
    lead.name,
    canViewContact ? lead.whatsapp : maskPhone(lead.whatsapp),
    lead.unit || "",
    lead.campaign_id,
    lead.month || "",
    lead.day_of_month || lead.day_preference || "",
    lead.guests || "",
    LEAD_STATUS_LABELS[lead.status],
    getResponsavelName(lead.responsavel_id),
    format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
    (lead.observacoes || "").replace(/\n/g, " ").replace(/"/g, '""'),
  ]);

  // Build CSV content
  const csvContent = [
    headers.join(";"),
    ...rows.map((row) =>
      row.map((cell) => `"${cell}"`).join(";")
    ),
  ].join("\n");

  // Create and download file
  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `leads_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
