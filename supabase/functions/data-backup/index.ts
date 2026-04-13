import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function csvEscape(val: unknown): string {
  const s = String(val ?? "").replace(/\n/g, " ").replace(/"/g, '""');
  return `"${s}"`;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.join(";"), ...rows.map(r => r.map(csvEscape).join(";"))].join("\n");
}

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

    // Support both cron (all companies) and manual (single company)
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    // Handle download action - generate signed URL
    if (body.action === "download" && body.file_name) {
      const { data: signedData, error: signError } = await supabase.storage
        .from("data-backups")
        .createSignedUrl(body.file_name, 300); // 5 min expiry
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
        // 1. Leads
        const leads = await fetchAll(supabase, "campaign_leads", company.id);
        const leadsCsv = toCsv(
          ["Nome", "WhatsApp", "Unidade", "Campanha", "Mês", "Dia", "Convidados", "Status", "Responsável", "Observações", "Criado em"],
          leads.map(l => [l.name, l.whatsapp, l.unit, l.campaign_name || l.campaign_id, l.month, l.day_of_month || l.day_preference, l.guests, l.status, l.responsavel_id, l.observacoes, l.created_at])
        );

        // 2. Events
        const events = await fetchAll(supabase, "company_events", company.id, "event_date");
        const eventsCsv = toCsv(
          ["Título", "Data", "Horário", "Tipo", "Pacote", "Convidados", "Valor Total", "Status", "Unidade", "Método Pagamento", "Criança", "Pais", "Observações"],
          events.map(e => [e.title, e.event_date, `${e.start_time || ""}-${e.end_time || ""}`, e.event_type, e.package_name, e.guest_count, e.total_value, e.status, e.unit, e.payment_method, e.child_name, e.parent_names, e.notes])
        );

        // 3. Expenses
        const expenses = await fetchAll(supabase, "company_expenses", company.id, "expense_date");
        const expensesCsv = toCsv(
          ["Descrição", "Valor", "Categoria", "Tipo", "Data", "Status", "Unidade", "Observações"],
          expenses.map(e => [e.description, e.amount, e.category, e.expense_type, e.expense_date, e.status, e.unit, e.notes])
        );

        // 4. Contacts
        const contacts = await fetchAll(supabase, "company_contacts", company.id);
        const contactsCsv = toCsv(
          ["Nome", "Telefone", "Email", "Tags", "Observações", "Criado em"],
          contacts.map(c => [c.name, c.phone, c.email, JSON.stringify(c.tags), c.notes, c.created_at])
        );

        // Combine all into one file with sections
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const bom = "\ufeff";

        const sections = [
          `=== BACKUP ${company.name.toUpperCase()} - ${dateStr} ===\n`,
          `\n--- LEADS (${leads.length} registros) ---\n${leadsCsv}`,
          `\n\n--- EVENTOS (${events.length} registros) ---\n${eventsCsv}`,
          `\n\n--- DESPESAS (${expenses.length} registros) ---\n${expensesCsv}`,
          `\n\n--- CONTATOS (${contacts.length} registros) ---\n${contactsCsv}`,
        ];

        const fullContent = bom + sections.join("");
        const fileName = `${company.slug}/backup_${dateStr}.csv`;
        const fileBytes = new TextEncoder().encode(fullContent);

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("data-backups")
          .upload(fileName, fileBytes, {
            contentType: "text/csv;charset=utf-8",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const recordsCount = { leads: leads.length, events: events.length, expenses: expenses.length, contacts: contacts.length };

        await supabase.from("backup_logs").update({
          status: "completed",
          file_name: fileName,
          file_url: fileName,
          file_size_bytes: fileBytes.length,
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
