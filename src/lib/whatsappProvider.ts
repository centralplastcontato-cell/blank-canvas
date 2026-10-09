// Provedores de WhatsApp aceitos em wapi_instances.provider
export type WhatsAppProvider = "wapi" | "zapi" | "evolution";

export const WHATSAPP_PROVIDERS: { value: WhatsAppProvider; label: string }[] = [
  { value: "wapi", label: "W-API" },
  { value: "zapi", label: "Z-API" },
  { value: "evolution", label: "Evolution Go" },
];

export function providerLabel(provider: string | null | undefined): string {
  return WHATSAPP_PROVIDERS.find((p) => p.value === provider)?.label || "W-API";
}

export function asWhatsAppProvider(provider: string | null | undefined): WhatsAppProvider {
  return provider === "zapi" || provider === "evolution" ? provider : "wapi";
}
