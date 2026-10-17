// Aviso para o dono da Celebrei no WhatsApp, por um número do Castelo que não
// é da Evolution (Z-API primeiro). Nunca sai pelo número de um buffet cliente.
// Mesmo caminho do plano B do monitor da Evolution.

// deno-lint-ignore no-explicit-any
type SB = any;

export const OWNER_ALERT_PHONE = "5515981121710";
const CASTELO_COMPANY_ID = "a0000000-0000-0000-0000-000000000001";
const ZAPI_BASE_URL = "https://api.z-api.io/instances";
const WAPI_BASE_URL = "https://api.w-api.app/v1";

export async function sendOwnerAlert(supabase: SB, text: string): Promise<boolean> {
  const { data: senders } = await supabase
    .from("wapi_instances")
    .select("id, instance_id, instance_token, client_token, provider, company_id, unit")
    .eq("company_id", CASTELO_COMPANY_ID)
    .eq("is_active", true)
    .eq("status", "connected")
    .neq("provider", "evolution");
  // deno-lint-ignore no-explicit-any
  const sender = ((senders || []) as any[]).sort((a, b) => (a.provider === "zapi" ? 0 : 1) - (b.provider === "zapi" ? 0 : 1))[0];
  if (!sender) {
    console.error("[owner-alert] Nenhum número fora da Evolution conectado para avisar o dono");
    return false;
  }
  try {
    let res: Response;
    if (sender.provider === "zapi") {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sender.client_token) headers["Client-Token"] = sender.client_token;
      res = await fetch(`${ZAPI_BASE_URL}/${sender.instance_id}/token/${sender.instance_token}/send-text`, {
        method: "POST", headers, body: JSON.stringify({ phone: OWNER_ALERT_PHONE, message: text }),
      });
    } else {
      res = await fetch(`${WAPI_BASE_URL}/message/send-text?instanceId=${sender.instance_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sender.instance_token}` },
        body: JSON.stringify({ phone: OWNER_ALERT_PHONE, message: text }),
      });
    }
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    const messageId = data?.zapiMessageId || data?.messageId || null;
    // Grava como aviso do sistema antes do eco do webhook (senão o webhook acha
    // que foi digitada no celular e tira a conversa do robô/IA)
    if (messageId) {
      const variants = [OWNER_ALERT_PHONE, OWNER_ALERT_PHONE.slice(0, 4) + OWNER_ALERT_PHONE.slice(5)].map((p) => `${p}@s.whatsapp.net`);
      const { data: conv } = await supabase.from("wapi_conversations").select("id").eq("instance_id", sender.id).in("remote_jid", variants).limit(1);
      if (conv && conv[0]) {
        await supabase.from("wapi_messages").upsert({
          conversation_id: conv[0].id, message_id: messageId, from_me: true, message_type: "text", content: text,
          status: "sent", timestamp: new Date().toISOString(), company_id: sender.company_id, metadata: { source: "system_alert" },
        }, { onConflict: "conversation_id,message_id", ignoreDuplicates: true });
      }
    }
    return true;
  } catch (e) {
    console.error("[owner-alert] Falha ao avisar o dono:", e);
    return false;
  }
}

/** Sininho para os administradores da Celebrei */
export async function notifyCelebreiAdmins(supabase: SB, n: { title: string; message: string; type: string; company_id?: string | null; data?: Record<string, unknown> }): Promise<void> {
  const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
  const ids = [...new Set(((admins || []) as Array<{ user_id: string }>).map((a) => a.user_id))];
  if (ids.length === 0) return;
  await supabase.from("notifications").insert(ids.map((user_id) => ({
    user_id, company_id: n.company_id ?? null, type: n.type, title: n.title, message: n.message, data: n.data ?? {},
  })));
}
