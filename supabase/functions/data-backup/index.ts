import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    // Baixar ou gerar o backup de uma empresa exige login com acesso a ela.
    // Antes, a chave pública do site bastava para baixar o backup (leads com
    // telefone, festas, despesas) de qualquer buffet.
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const isService = !!jwt && jwt === serviceKey;
    let userId: string | null = null;
    let isAdmin = false;
    if (!isService && jwt) {
      const { data: { user } } = await supabase.auth.getUser(jwt);
      if (user) {
        userId = user.id;
        const { data: admin } = await supabase.rpc("is_admin", { _user_id: user.id });
        isAdmin = admin === true;
      }
    }
    const canAccessCompany = async (companyId: string): Promise<boolean> => {
      if (isService || isAdmin) return true;
      if (!userId) return false;
      const { data } = await supabase.rpc("user_has_company_access", { _user_id: userId, _company_id: companyId });
      return data === true;
    };
    // O backup semanal (cron, sábado à noite) ainda chama com a chave pública: pode gerar o
    // backup de todas as empresas, mas a resposta não traz nenhum detalhe.
    const canSeeDetails = isService || isAdmin;

    // Handle download action
    if (body.action === "download" && body.file_name) {
      // O arquivo fica em "<slug da empresa>/backup_<data>.xlsx"
      const fileName = String(body.file_name);
      const slug = fileName.split("/")[0];
      const { data: owner } = await supabase.from("companies").select("id").eq("slug", slug).maybeSingle();
      if (!userId && !isService) return json({ error: "Faça login" }, 401);
      if (fileName.includes("..") || !owner || !(await canAccessCompany(owner.id))) {
        return json({ error: "Sem acesso a este backup" }, 403);
      }
      const { data: signedData, error: signError } = await supabase.storage
        .from("data-backups")
        .createSignedUrl(fileName, 300);
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
    if (targetCompanyId) {
      if (!userId && !isService) return json({ error: "Faça login" }, 401);
      if (!(await canAccessCompany(targetCompanyId))) return json({ error: "Sem acesso a esta empresa" }, 403);
    }

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
        const payments = await fetchAll(supabase, "event_payments", company.id, "due_date");
        const visits = await fetchAll(supabase, "lead_visits", company.id, "data_visita");
        const clientForms = await fetchAll(supabase, "client_data_requests", company.id);
        // Pagamentos e formulários mostram a festa e a visita mostra o cliente pelo nome
        const eventTitle = new Map(events.map((e) => [e.id, e.title]));
        const eventDate = new Map(events.map((e) => [e.id, e.event_date]));
        const leadName = new Map(leads.map((l) => [l.id, l.name]));
        const leadPhone = new Map(leads.map((l) => [l.id, l.whatsapp]));

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

        // Sheet 4: Pagamentos (parcelas e sinal das festas)
        const paymentsData = payments.map(p => ({
          "Festa": eventTitle.get(p.event_id) || "",
          "Data da festa": eventDate.get(p.event_id) || "",
          "Tipo": p.type,
          "Valor": p.amount,
          "Vencimento": p.due_date,
          "Status": p.status,
          "Pago em": p.paid_at || "",
          "Forma": p.payment_method || "",
          "Parcelas no cartão": p.card_installments || "",
          "Observações": p.notes || "",
        }));
        const wsPayments = XLSX.utils.json_to_sheet(paymentsData.length ? paymentsData : [{}]);
        XLSX.utils.book_append_sheet(wb, wsPayments, "Pagamentos");

        // Sheet 5: Visitas
        const visitsData = visits.map(v => ({
          "Cliente": leadName.get(v.lead_id) || "",
          "WhatsApp": leadPhone.get(v.lead_id) || "",
          "Data": v.data_visita,
          "Horário": v.horario_visita || "",
          "Status": v.status_visita,
          "Tipo": v.visit_type,
          "Unidade": v.unit || "",
          "Pacote de interesse": v.package_interest || "",
          "Convidados": v.guest_count || "",
          "Data da festa (interesse)": v.party_date_interest || "",
          "Interesse": v.interest_level || "",
          "Observações": [v.observacoes, v.seller_notes].filter(Boolean).join(" | "),
        }));
        const wsVisits = XLSX.utils.json_to_sheet(visitsData.length ? visitsData : [{}]);
        XLSX.utils.book_append_sheet(wb, wsVisits, "Visitas");

        // Sheet 6: Dados do contratante (só os formulários preenchidos)
        const clientData = clientForms.filter(r => r.client_data && r.completed_at).map(r => {
          const d = (r.client_data || {}) as Record<string, any>;
          const kids = Array.isArray(d.birthday_children) ? d.birthday_children : [];
          const resp = Array.isArray(d.responsaveis) ? d.responsaveis : [];
          return {
            "Festa": eventTitle.get(r.event_id) || "",
            "Data da festa": eventDate.get(r.event_id) || "",
            "Nome": d.nome || "",
            "CPF": d.cpf || "",
            "RG": d.rg || "",
            "Nascimento": d.nascimento || "",
            "E-mail": d.email || "",
            "Endereço": [d.endereco, d.numero, d.complemento, d.bairro, d.cidade, d.estado, d.cep].filter(Boolean).join(", "),
            "Aniversariantes": kids.filter((k: any) => k?.name).map((k: any) => [k.name, k.age && `${k.age} anos`, k.birthdate].filter(Boolean).join(" · ")).join("; "),
            "Responsáveis": resp.filter((x: any) => x?.name).map((x: any) => [x.name, x.relation, x.phone].filter(Boolean).join(" · ")).join("; "),
            "Pacote": d.pacote || "",
            "Convidados": d.convidados || "",
            "Preenchido em": r.completed_at || "",
          };
        });
        const wsClient = XLSX.utils.json_to_sheet(clientData.length ? clientData : [{}]);
        XLSX.utils.book_append_sheet(wb, wsClient, "Dados do contratante");

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

        const recordsCount = {
          leads: leads.length, events: events.length, expenses: expenses.length,
          payments: payments.length, visits: visits.length, client_data: clientData.length,
        };

        await supabase.from("backup_logs").update({
          status: "completed",
          file_name: fileName,
          file_url: fileName,
          file_size_bytes: xlsxBuffer.byteLength,
          records_count: recordsCount,
          completed_at: new Date().toISOString(),
        }).eq("id", logId);

        results.push({ company: company.name, status: "ok", records: recordsCount, file_name: fileName });
      } catch (err) {
        await supabase.from("backup_logs").update({
          status: "error",
          error_message: String(err),
          completed_at: new Date().toISOString(),
        }).eq("id", logId);
        results.push({ company: company.name, status: "error", error: String(err) });
      }
    }

    // Quem pediu o backup de uma empresa já teve o acesso conferido acima
    if (!canSeeDetails && !targetCompanyId) return json({ success: true });
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
