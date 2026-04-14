import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    const todayStr = today.toISOString().split("T")[0];

    // Look ahead 7 days
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 7);
    const horizonStr = horizon.toISOString().split("T")[0];

    // Fetch recurring parent tasks
    const { data: recurringTasks, error } = await supabase
      .from("company_tasks")
      .select("*")
      .eq("is_recurring", true)
      .is("parent_task_id", null);

    if (error) throw error;

    let generated = 0;

    for (const task of recurringTasks || []) {
      // Check if recurrence has ended
      if (task.recurrence_end_date && task.recurrence_end_date < todayStr) continue;

      const dates = getNextDates(task, todayStr, horizonStr);

      for (const date of dates) {
        // Check if child already exists for this date
        const { data: existing } = await supabase
          .from("company_tasks")
          .select("id")
          .eq("parent_task_id", task.id)
          .eq("due_date", date)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Create child task
        const { error: insertErr } = await supabase.from("company_tasks").insert({
          company_id: task.company_id,
          title: task.title,
          description: task.description,
          category: task.category,
          priority: task.priority,
          due_date: date,
          due_time: task.due_time,
          assigned_to: task.assigned_to,
          created_by: task.created_by,
          status: "pendente",
          parent_task_id: task.id,
          is_recurring: false,
        });

        if (insertErr) {
          console.error(`Error creating child task for ${task.id} on ${date}:`, insertErr);
        } else {
          generated++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, recurring_tasks: recurringTasks?.length || 0, generated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-recurring-tasks:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getNextDates(task: any, fromStr: string, toStr: string): string[] {
  const dates: string[] = [];
  const from = new Date(fromStr + "T00:00:00Z");
  const to = new Date(toStr + "T00:00:00Z");
  const recurrenceType = task.recurrence_type;
  const interval = task.recurrence_interval || 1;
  const recurrenceDays: number[] = task.recurrence_days || [];

  if (recurrenceType === "diaria") {
    const cursor = new Date(from);
    while (cursor <= to) {
      dates.push(cursor.toISOString().split("T")[0]);
      cursor.setDate(cursor.getDate() + interval);
    }
  } else if (recurrenceType === "semanal") {
    const cursor = new Date(from);
    while (cursor <= to) {
      const dayOfWeek = cursor.getDay();
      if (recurrenceDays.length === 0 || recurrenceDays.includes(dayOfWeek)) {
        dates.push(cursor.toISOString().split("T")[0]);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (recurrenceType === "mensal") {
    // Generate for the current and next month on the same day
    const baseDay = task.due_date ? new Date(task.due_date + "T00:00:00Z").getDate() : 1;
    const cursor = new Date(from);
    cursor.setDate(baseDay);
    if (cursor < from) cursor.setMonth(cursor.getMonth() + 1);
    while (cursor <= to) {
      dates.push(cursor.toISOString().split("T")[0]);
      cursor.setMonth(cursor.getMonth() + interval);
    }
  }

  // Filter by recurrence_end_date
  if (task.recurrence_end_date) {
    return dates.filter((d) => d <= task.recurrence_end_date);
  }

  return dates;
}
