import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { taskReminders } from "../_shared/task-reminders.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];

    // Find tasks due tomorrow that are not completed
    const { data: dueTasks, error: fetchError } = await supabase
      .from("company_tasks")
      .select("id, company_id, title, due_date, assigned_to, created_by, is_recurring, parent_task_id")
      .eq("due_date", tomorrowStr)
      .neq("status", "concluida");

    if (fetchError) throw fetchError;

    let notificationsCreated = 0;

    // Só para o responsável (ou quem criou), e só se a pessoa ainda é da empresa
    for (const { task, userId } of taskReminders(dueTasks || [])) {
      const { data: member } = await supabase
        .from("user_companies")
        .select("user_id")
        .eq("company_id", task.company_id)
        .eq("user_id", userId)
        .limit(1);
      if (!member || member.length === 0) continue;

      // Dedup: check if notification already exists for this task + user + date
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "tarefa_vencendo")
        .eq("company_id", task.company_id)
        .gte("created_at", todayStr + "T00:00:00Z")
        .contains("data", { task_id: task.id })
        .limit(1);

      if (existing && existing.length > 0) continue;

      await supabase.from("notifications").insert({
        user_id: userId,
        company_id: task.company_id,
        type: "tarefa_vencendo",
        title: "⏰ Tarefa vence amanhã",
        message: task.title,
        data: { task_id: task.id, task_title: task.title, due_date: task.due_date },
      });

      notificationsCreated++;
    }

    return new Response(
      JSON.stringify({ success: true, tasks_found: dueTasks?.length || 0, notifications_created: notificationsCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in task-notifications:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
