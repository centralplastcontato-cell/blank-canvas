import { supabase } from "@/integrations/supabase/client";

/**
 * Webhook URL used for ALL W-API/Z-API event callbacks.
 * Keep this in sync with the URL displayed in the Connection settings UI.
 */
export const WAPI_WEBHOOK_URL =
  "https://rsezgnkfhodltrsewlhz.supabase.co/functions/v1/wapi-webhook";

/**
 * Re-applies the webhook configuration on the W-API/Z-API side for a given
 * instance. This is critical after a QR Code reconnection because the provider
 * frequently drops the webhook bindings, which causes incoming messages to
 * stop being delivered to our backend even though the instance is "connected".
 *
 * Fire-and-forget by design — never throws, never blocks the caller. Any
 * failure is logged so it shows up in the browser console for diagnostics.
 */
export async function configureWapiWebhooks(
  instanceId: string,
  instanceToken: string,
  context: string = "auto",
): Promise<void> {
  try {
    const response = await supabase.functions.invoke("wapi-send", {
      body: {
        action: "configure-webhooks",
        webhookUrl: WAPI_WEBHOOK_URL,
        instanceId,
        instanceToken,
      },
    });

    if (response.error) {
      console.error(
        `[wapi-webhook-config] (${context}) Failed to configure webhooks for ${instanceId}:`,
        response.error,
      );
    } else {
      console.log(
        `[wapi-webhook-config] (${context}) Webhooks reconfigured for ${instanceId}`,
      );
    }
  } catch (error) {
    console.error(
      `[wapi-webhook-config] (${context}) Unexpected error for ${instanceId}:`,
      error,
    );
  }
}
