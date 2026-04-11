import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Verify that a WhatsApp instance is actually connected (live check via W-API).
 * Returns { healthy: true } or { healthy: false, error: string }.
 */
async function verifyInstanceHealth(
  instanceId: string,
  instanceToken: string,
): Promise<{ healthy: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("wapi-send", {
      body: { action: "get-status", instanceId, instanceToken },
    });
    if (error) return { healthy: false, error: "Erro ao verificar instância." };
    const payload = data as { connected?: boolean; status?: string } | null;
    if (payload?.connected === true) return { healthy: true };
    return {
      healthy: false,
      error: `Instância WhatsApp está desconectada (${payload?.status || "offline"}). Reconecte antes de enviar.`,
    };
  } catch {
    return { healthy: false, error: "Não foi possível verificar a instância WhatsApp." };
  }
}

/**
 * Log a contract-related action to the audit trail.
 */
export async function logContractAction(
  companyId: string,
  contractId: string | null | undefined,
  templateId: string | null | undefined,
  action: string,
  performedBy: string,
  details: Record<string, any> = {},
) {
  try {
    await (supabase as any).from("contract_audit_logs").insert({
      company_id: companyId,
      contract_id: contractId || null,
      template_id: templateId || null,
      action,
      details,
      performed_by: performedBy,
    });
  } catch (e) {
    console.warn("[contract-audit] Failed to log action:", action, e);
  }
}

/**
 * Strip HTML tags and clean up contract content for WhatsApp plain-text sending.
 */
function stripHtmlForWhatsApp(html: string): string {
  let text = html;
  // Convert <strong> to *bold* for WhatsApp formatting
  text = text.replace(/<strong>(.*?)<\/strong>/gi, "*$1*");
  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");
  // Decode common HTML entities
  text = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
  // Normalize whitespace but keep newlines
  text = text.replace(/[ \t]+/g, " ");
  // Remove excessive blank lines (max 2)
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

/**
 * Render contract HTML to a multi-page PDF using html2canvas,
 * preserving all formatting, images, and logos exactly as displayed.
 */
async function renderContractHtmlToPdf(
  htmlContent: string,
  contractName: string,
  companyId?: string,
): Promise<Blob | null> {
  try {
    // Fetch company logo if companyId provided
    let logoUrl: string | null = null;
    let companyName: string | null = null;
    if (companyId) {
      try {
        const { data } = await supabase
          .from("companies")
          .select("logo_url, name")
          .eq("id", companyId)
          .single();
        logoUrl = data?.logo_url || null;
        companyName = data?.name || null;
      } catch { /* ignore */ }
    }

    // Build styled wrapper matching the signature page layout
    const headerHtml = `
      <div style="text-align:center; margin-bottom:24px;">
        ${logoUrl ? `<img src="${logoUrl}" style="max-height:80px; max-width:280px; margin-bottom:16px;" crossorigin="anonymous" />` : ""}
        <h1 style="font-size:18px; font-weight:bold; text-transform:uppercase; letter-spacing:1px; margin:0 0 12px 0; font-family:Georgia,serif;">
          ${contractName || "Contrato"}
        </h1>
        <hr style="border:none; border-top:2px solid #222; margin:0 auto; width:100%;" />
      </div>
    `;

    const wrappedContent = headerHtml + `<div style="text-align:justify; line-height:1.85; font-family:Georgia,'Times New Roman',serif; font-size:13px;">${htmlContent}</div>`;

    // Create an off-screen container with A4-like width
    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed; left: -9999px; top: 0;
      width: 794px; /* A4 at 96dpi */
      background: white; color: black;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 13px; line-height: 1.85;
      padding: 40px 50px;
    `;
    container.innerHTML = wrappedContent;
    document.body.appendChild(container);

    // Wait for images to load
    const images = container.querySelectorAll("img");
    await Promise.all(
      Array.from(images).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }),
      ),
    );

    // Small delay to ensure rendering is complete
    await new Promise((r) => setTimeout(r, 200));

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    document.body.removeChild(container);

    // Convert canvas to multi-page A4 PDF
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    // Additional pages
    while (heightLeft > 0) {
      position = -(imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    return pdf.output("blob");
  } catch (e) {
    console.error("[contract-pdf] Error rendering HTML to PDF:", e);
    return null;
  }
}


export async function sendContractViaWhatsApp(
  companyId: string,
  leadId: string,
  contractContent: string,
  contractName: string,
  options?: { instanceId?: string; instanceToken?: string },
): Promise<{ success: boolean; error?: string; fileUrl?: string }> {
  try {
    // 1. Get lead phone
    const { data: lead, error: leadErr } = await supabase
      .from("campaign_leads")
      .select("whatsapp, name")
      .eq("id", leadId)
      .single();

    if (leadErr || !lead?.whatsapp) {
      return { success: false, error: "Lead não encontrado ou sem WhatsApp cadastrado." };
    }

    // 2. Find connected instance for this company
    let instance = null as { id?: string; instance_id: string; instance_token: string; status?: string } | null;

    if (options?.instanceId && options?.instanceToken) {
      instance = {
        instance_id: options.instanceId,
        instance_token: options.instanceToken,
      };
    } else {
      const { data: instances } = await (supabase as any)
        .from("wapi_instances")
        .select("id, instance_id, instance_token, status")
        .eq("company_id", companyId)
        .eq("status", "connected")
        .limit(1);

      instance = instances?.[0] ?? null;
    }

    if (!instance) {
      return { success: false, error: "Nenhuma instância do WhatsApp conectada." };
    }

    // 2b. Verify instance is actually connected (live check)
    const health = await verifyInstanceHealth(instance.instance_id, instance.instance_token);
    if (!health.healthy) {
      return { success: false, error: health.error || "Instância desconectada." };
    }

    // 3. Find existing conversation
    const phone = lead.whatsapp.replace(/\D/g, "");
    const { data: convs } = await (supabase as any)
      .from("wapi_conversations")
      .select("id, jid")
      .eq("company_id", companyId)
      .eq("instance_id", instance.id)
      .or(`jid.ilike.%${phone}%,lead_id.eq.${leadId}`)
      .limit(1);

    const conv = convs?.[0];

    // 4. Generate PDF from contract HTML content (preserving full formatting & logo)
    const pdfBlob = await renderContractHtmlToPdf(contractContent, contractName);
    if (!pdfBlob) {
      return { success: false, error: "Erro ao gerar PDF do contrato." };
    }

    const safeFileName = contractName.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 60);
    const storagePath = `contracts/${companyId}/${safeFileName}_${Date.now()}.pdf`;

    // 5. Upload PDF to storage
    const { error: uploadErr } = await supabase.storage
      .from("whatsapp-media")
      .upload(storagePath, pdfBlob, { contentType: "application/pdf", upsert: true });

    if (uploadErr) {
      return { success: false, error: "Erro ao gerar PDF do contrato: " + uploadErr.message };
    }

    // Get signed URL (1 hour)
    const { data: urlData, error: urlErr } = await supabase.storage
      .from("whatsapp-media")
      .createSignedUrl(storagePath, 3600);

    if (urlErr || !urlData?.signedUrl) {
      return { success: false, error: "Erro ao gerar URL do PDF." };
    }

    // 6. Send via wapi-send as document
    const { data: sendResult, error: sendErr } = await supabase.functions.invoke("wapi-send", {
      body: {
        action: "send-document",
        instanceId: instance.instance_id,
        instanceToken: instance.instance_token,
        phone: phone,
        mediaUrl: urlData.signedUrl,
        fileName: `${safeFileName}.pdf`,
        conversationId: conv?.id || undefined,
      },
    });

    const sendPayload = sendResult as { success?: boolean; error?: string } | null;

    if (sendErr) {
      return { success: false, error: sendErr.message || "Erro ao enviar documento." };
    }

    if (sendPayload?.success === false) {
      return { success: false, error: sendPayload.error || "Falha no envio pelo WhatsApp." };
    }

    return { success: true, fileUrl: urlData.signedUrl };
  } catch (e: any) {
    return { success: false, error: e.message || "Erro inesperado ao enviar contrato." };
  }
}
