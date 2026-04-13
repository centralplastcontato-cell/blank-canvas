import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchAll(supabase: any, table: string, companyId: string, orderBy = "created_at") {
  const all: any[] = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("company_id", companyId)
      .order(orderBy, { ascending: false })
      .range(from, from + batchSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < batchSize) break;
    from += batchSize;
  }
  return all;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    // Handle download action
    if (body.action === "download" && body.file_name) {
      const { data: signedData, error: signError } = await supabase.storage
        .from("data-backups")
        .createSignedUrl(body.file_name, 300);
      if (signError || !signedData?.signedUrl) {
        return new Response(JSON.stringify({ error: "Não foi possível gerar URL de download" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ url: signedData.signedUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetCompanyId = body.company_id;

    let companies: { id: string; name: string; slug: string }[];
    if (targetCompanyId) {
      const { data } = await supabase.from("companies").select("id, name, slug").eq("id", targetCompanyId).single();
      companies = data ? [data] : [];
    } else {
      const { data } = await supabase.from("companies").select("id, name, slug").eq("is_active", true);
      companies = data || [];
    }

    const results: any[] = [];

    for (const company of companies) {
      const logEntry = {
        company_id: company.id,
        backup_type: "full",
        status: "running",
        started_at: new Date().toISOString(),
      };
      const { data: log } = await supabase.from("backup_logs").insert(logEntry).select("id").single();
      const logId = log?.id;

      try {
        // Fetch all data
        const leads = await fetchAll(supabase, "campaign_leads", company.id);
        const events = await fetchAll(supabase, "company_events", company.id, "event_date");
        const expenses = await fetchAll(supabase, "company_expenses", company.id, "expense_date");
        const contacts = await fetchAll(supabase, "company_contacts", company.id);

        // Build XLSX workbook with separate sheets
        const wb = XLSX.utils.book_new();

        // Sheet 1: Leads
        const leadsData = leads.map(l => ({
          "Nome": l.name,
          "WhatsApp": l.whatsapp,
          "Unidade": l.unit,
          "Campanha": l.campaign_name || l.campaign_id,
          "Mês": l.month,
          "Dia": l.day_of_month || l.day_preference,
          "Convidados": l.guests,
          "Status": l.status,
          "Responsável": l.responsavel_id,
          "Observações": l.observacoes,
          "Criado em": l.created_at,
        }));
        const wsLeads = XLSX.utils.json_to_sheet(leadsData.length ? leadsData : [{}]);
        XLSX.utils.book_append_sheet(wb, wsLeads, "Leads");

        // Sheet 2: Eventos
        const eventsData = events.map(e => ({
          "Título": e.title,
          "Data": e.event_date,
          "Início": e.start_time || "",
          "Fim": e.end_time || "",
          "Tipo": e.event_type,
          "Pacote": e.package_name,
          "Convidados": e.guest_count,
          "Valor Total": e.total_value,
          "Status": e.status,
          "Unidade": e.unit,
          "Pagamento": e.payment_method,
          "Criança": e.child_name,
          "Pais": e.parent_names,
          "Observações": e.notes,
        }));
        const wsEvents = XLSX.utils.json_to_sheet(eventsData.length ? eventsData : [{}]);
        XLSX.utils.book_append_sheet(wb, wsEvents, "Eventos");

        // Sheet 3: Despesas
        const expensesData = expenses.map(e => ({
          "Descrição": e.description,
          "Valor": e.amount,
          "Categoria": e.category,
          "Tipo": e.expense_type,
          "Data": e.expense_date,
          "Status": e.status,
          "Unidade": e.unit,
          "Observações": e.notes,
        }));
        const wsExpenses = XLSX.utils.json_to_sheet(expensesData.length ? expensesData : [{}]);
        XLSX.utils.book_append_sheet(wb, wsExpenses, "Despesas");

        // Sheet 4: Contatos
        const contactsData = contacts.map(c => ({
          "Nome": c.name,
          "Telefone": c.phone,
          "Email": c.email,
          "Tags": c.tags ? JSON.stringify(c.tags) : "",
          "Observações": c.notes,
          "Criado em": c.created_at,
        }));
        const wsContacts = XLSX.utils.json_to_sheet(contactsData.length ? contactsData : [{}]);
        XLSX.utils.book_append_sheet(wb, wsContacts, "Contatos");

        // Generate XLSX buffer
        const xlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const fileName = `${company.slug}/backup_${dateStr}.xlsx`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("data-backups")
          .upload(fileName, xlsxBuffer, {
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const recordsCount = { leads: leads.length, events: events.length, expenses: expenses.length, contacts: contacts.length };

        await supabase.from("backup_logs").update({
          status: "completed",
          file_name: fileName,
          file_url: fileName,
          file_size_bytes: xlsxBuffer.byteLength,
          records_count: recordsCount,
          completed_at: new Date().toISOString(),
        }).eq("id", logId);

        results.push({ company: company.name, status: "ok", records: recordsCount });
      } catch (err) {
        await supabase.from("backup_logs").update({
          status: "error",
          error_message: String(err),
          completed_at: new Date().toISOString(),
        }).eq("id", logId);
        results.push({ company: company.name, status: "error", error: String(err) });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
