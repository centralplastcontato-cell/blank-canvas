// Módulo "IA Conversacional" (Hub → Módulos → Inteligência Artificial).
// Só liga pelo Hub; com ele desligado a IA não responde clientes da empresa,
// mesmo que ai_agent_settings.enabled esteja true.
export function isAiConversationalEnabled(companySettings: unknown): boolean {
  if (!companySettings || typeof companySettings !== "object") return false;
  const modules = (companySettings as Record<string, unknown>).enabled_modules;
  if (!modules || typeof modules !== "object") return false;
  return (modules as Record<string, unknown>).ia_conversacional === true;
}

// deno-lint-ignore no-explicit-any
export async function loadAiConversationalEnabled(supabase: any, companyId: string): Promise<boolean> {
  const { data } = await supabase.from("companies").select("settings").eq("id", companyId).maybeSingle();
  return isAiConversationalEnabled(data?.settings);
}
