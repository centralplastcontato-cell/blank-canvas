// wapi-queue-processor
// Runs every minute via pg_cron. Responsibilities:
//   1. Auto-approve pending queue items older than instance.queue_auto_approve_minutes
//   2. For each instance with approved items due (scheduled_for <= now):
//      - respect 08h-22h send window (server tz: America/Sao_Paulo)
//      - respect queue_max_per_hour
//      - send ONE message via wapi-send (as manual, bypassing quarantine)
//      - schedule the NEXT approved item for now + random(min,max) seconds
//   3. On send failure: mark item failed, set last_error
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function nowInSaoPauloHour(): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false,
  });
  return parseInt(fmt.format(new Date()), 10);
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const stats = { autoApproved: 0, sent: 0, failed: 0, skippedWindow: 0, skippedLimit: 0, skippedNoDue: 0 };

  try {
    // ── 1. Auto-approval ────────────────────────────────────────────────────
    // Pull pending items + their instance auto-approve window
    const { data: pendingItems } = await supabase
      .from('whatsapp_outbound_queue')
      .select('id, created_at, instance_id, wapi_instances!inner(queue_auto_approve_minutes)')
      .eq('status', 'pending')
      .limit(500);

    if (pendingItems) {
      const toApprove: string[] = [];
      const nowMs = Date.now();
      for (const it of pendingItems as any[]) {
        const mins = it.wapi_instances?.queue_auto_approve_minutes ?? 30;
        const ageMs = nowMs - new Date(it.created_at).getTime();
        if (ageMs >= mins * 60_000) toApprove.push(it.id);
      }
      if (toApprove.length > 0) {
        const nowIso = new Date().toISOString();
        await supabase
          .from('whatsapp_outbound_queue')
          .update({ status: 'approved', approved_at: nowIso, scheduled_for: nowIso })
          .in('id', toApprove);
        stats.autoApproved = toApprove.length;
      }
    }

    // ── 2. Send window check ────────────────────────────────────────────────
    const hour = nowInSaoPauloHour();
    if (hour < 8 || hour >= 22) {
      stats.skippedWindow = 1;
      return new Response(JSON.stringify({ ok: true, reason: 'outside_window', stats }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Drip send per instance ───────────────────────────────────────────
    // Get distinct instances with approved+due items
    const nowIso = new Date().toISOString();
    const { data: dueItems } = await supabase
      .from('whatsapp_outbound_queue')
      .select('instance_id')
      .eq('status', 'approved')
      .lte('scheduled_for', nowIso)
      .limit(200);

    const instanceIds = [...new Set((dueItems ?? []).map((r: any) => r.instance_id))];

    for (const instanceUUID of instanceIds) {
      // Load instance config + credentials
      const { data: inst } = await supabase
        .from('wapi_instances')
        .select('id, instance_id, instance_token, client_token, provider, queue_drip_seconds_min, queue_drip_seconds_max, queue_max_per_hour')
        .eq('id', instanceUUID)
        .maybeSingle();
      if (!inst) continue;

      // Hourly limit check
      const oneHourAgo = new Date(Date.now() - 60 * 60_000).toISOString();
      const { count: sentLastHour } = await supabase
        .from('whatsapp_outbound_queue')
        .select('id', { count: 'exact', head: true })
        .eq('instance_id', instanceUUID)
        .eq('status', 'sent')
        .gte('sent_at', oneHourAgo);

      const maxPerHour = inst.queue_max_per_hour ?? 10;
      if ((sentLastHour ?? 0) >= maxPerHour) {
        stats.skippedLimit++;
        continue;
      }

      // Pick oldest approved+due item
      const { data: next } = await supabase
        .from('whatsapp_outbound_queue')
        .select('id, to_phone, payload, attempts')
        .eq('instance_id', instanceUUID)
        .eq('status', 'approved')
        .lte('scheduled_for', nowIso)
        .order('scheduled_for', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!next) { stats.skippedNoDue++; continue; }

      // Build body for wapi-send: reuse original payload but force manual mode
      const body: any = {
        ...(next.payload as any),
        instance_id: inst.instance_id,
        instance_token: inst.instance_token,
        client_token: inst.client_token,
        // Force "manual" classification so quarantine guard does not re-enqueue
        automation: false,
        source: 'queue-drip',
      };

      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/wapi-send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'apikey': SERVICE_KEY,
          },
          body: JSON.stringify(body),
        });
        const respText = await resp.text();
        const ok = resp.ok;

        if (ok) {
          await supabase
            .from('whatsapp_outbound_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              attempts: (next.attempts ?? 0) + 1,
            })
            .eq('id', next.id);
          stats.sent++;
        } else {
          const attempts = (next.attempts ?? 0) + 1;
          const finalFail = attempts >= 3;
          await supabase
            .from('whatsapp_outbound_queue')
            .update({
              status: finalFail ? 'failed' : 'approved',
              attempts,
              last_error: respText.slice(0, 500),
              scheduled_for: finalFail
                ? new Date().toISOString()
                : new Date(Date.now() + 5 * 60_000).toISOString(),
            })
            .eq('id', next.id);
          stats.failed++;
        }

        // Schedule the NEXT approved item for this instance with drip delay
        const dripMin = inst.queue_drip_seconds_min ?? 30;
        const dripMax = inst.queue_drip_seconds_max ?? 90;
        const delaySec = randInt(dripMin, dripMax);
        const nextScheduled = new Date(Date.now() + delaySec * 1000).toISOString();

        const { data: followup } = await supabase
          .from('whatsapp_outbound_queue')
          .select('id, scheduled_for')
          .eq('instance_id', instanceUUID)
          .eq('status', 'approved')
          .order('scheduled_for', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (followup && followup.id !== next.id) {
          // Only push later — never bring earlier
          if (new Date(followup.scheduled_for) < new Date(nextScheduled)) {
            await supabase
              .from('whatsapp_outbound_queue')
              .update({ scheduled_for: nextScheduled })
              .eq('id', followup.id);
          }
        }
      } catch (e) {
        console.error('[wapi-queue-processor] Send error:', e);
        await supabase
          .from('whatsapp_outbound_queue')
          .update({
            status: 'approved',
            attempts: (next.attempts ?? 0) + 1,
            last_error: String((e as Error)?.message ?? e).slice(0, 500),
            scheduled_for: new Date(Date.now() + 5 * 60_000).toISOString(),
          })
          .eq('id', next.id);
        stats.failed++;
      }
    }

    return new Response(JSON.stringify({ ok: true, stats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[wapi-queue-processor] Fatal:', err);
    return new Response(JSON.stringify({ ok: false, error: String((err as Error)?.message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
