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

function escapeHtml(content: string): string {
  return content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatContractHtmlForPdf(content: string): string {
  return escapeHtml(content)
    .replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");
}

function buildContractPdfSections(content: string): string[] {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (blocks.length > 0 ? blocks : [normalized]).map(
    (block) => `
      <div
        data-pdf-section
        style="
          margin: 0 0 18px;
          text-align: justify;
          line-height: 1.85;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 13px;
          color: #1f2937;
          word-break: break-word;
          overflow-wrap: anywhere;
        "
      >
        ${formatContractHtmlForPdf(block)}
      </div>
    `,
  );
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
    if (companyId) {
      try {
        const { data } = await supabase
          .from("companies")
          .select("logo_url")
          .eq("id", companyId)
          .single();
        logoUrl = data?.logo_url || null;
      } catch { /* ignore */ }
    }

    // Build styled wrapper matching the signature page layout
    const headerHtml = `
      <div
        data-pdf-section
        style="
          text-align:center;
          margin-bottom:24px;
          padding-bottom:16px;
          border-bottom:2px solid #e5e7eb;
        "
      >
        ${logoUrl ? `<img src="${logoUrl}" style="height:112px; max-width:280px; object-fit:contain; margin:0 auto 8px; display:block;" crossorigin="anonymous" />` : ""}
        <h1 style="font-size:16px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; margin:0; color:#1f2937; font-family:Georgia,'Times New Roman',serif;">
          ${contractName || "Contrato"}
        </h1>
      </div>
    `;

    const wrappedContent = [headerHtml, ...buildContractPdfSections(htmlContent)].join("");

    // Create an off-screen container with A4-like width
    const container = document.createElement("div");
    container.style.cssText = `
      position: fixed; left: -9999px; top: 0;
      width: 794px; /* A4 at 96dpi */
      background: white; color: black;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 13px; line-height: 1.85;
      padding: 40px 50px 48px;
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

    const sections = Array.from(
      container.querySelectorAll("[data-pdf-section]"),
    ) as HTMLElement[];

    const renderedSections = await Promise.all(
      sections.map(async (section) => {
        const canvas = await html2canvas(section, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
        });

        return canvas;
      }),
    );

    document.body.removeChild(container);

    // Convert section canvases to multi-page A4 PDF with smart page breaks and footer
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const marginX = 15;
    const marginTop = 14;
    const marginBottom = 10;
    const footerHeight = 10;
    const sectionGap = 4;
    const contentWidth = pdfWidth - marginX * 2;
    const pageStartY = marginTop;
    const pageEndY = pdfHeight - marginBottom - footerHeight;
    const usableHeight = pageEndY - pageStartY;
    let currentY = pageStartY;

    const addSectionSlice = (
      canvas: HTMLCanvasElement,
      srcY: number,
      srcHeight: number,
      targetY: number,
    ) => {
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = srcHeight;

      const ctx = sliceCanvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, srcY, canvas.width, srcHeight, 0, 0, canvas.width, srcHeight);

      const pxToMm = contentWidth / canvas.width;
      const targetHeight = srcHeight * pxToMm;
      pdf.addImage(
        sliceCanvas.toDataURL("image/jpeg", 0.96),
        "JPEG",
        marginX,
        targetY,
        contentWidth,
        targetHeight,
      );
    };

    for (const canvas of renderedSections) {
      const pxToMm = contentWidth / canvas.width;
      const sectionHeightMm = canvas.height * pxToMm;

      if (sectionHeightMm <= usableHeight) {
        if (currentY + sectionHeightMm > pageEndY && currentY > pageStartY) {
          pdf.addPage();
          currentY = pageStartY;
        }

        addSectionSlice(canvas, 0, canvas.height, currentY);
        currentY += sectionHeightMm + sectionGap;
        continue;
      }

      if (currentY > pageStartY) {
        pdf.addPage();
        currentY = pageStartY;
      }

      let consumedPx = 0;
      while (consumedPx < canvas.height) {
        const remainingPx = canvas.height - consumedPx;
        const availableHeightMm = pageEndY - currentY;
        const maxSlicePx = Math.max(1, Math.floor(availableHeightMm / pxToMm));
        const slicePx = Math.min(remainingPx, maxSlicePx);

        addSectionSlice(canvas, consumedPx, slicePx, currentY);
        consumedPx += slicePx;
        currentY += slicePx * pxToMm;

        if (consumedPx < canvas.height) {
          pdf.addPage();
          currentY = pageStartY;
        } else {
          currentY += sectionGap;
        }
      }
    }

    const totalPages = pdf.getNumberOfPages();
    for (let page = 1; page <= totalPages; page++) {
      pdf.setPage(page);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Página ${page} de ${totalPages}`, pdfWidth / 2, pdfHeight - 6, {
        align: "center",
      });
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
    const pdfBlob = await renderContractHtmlToPdf(contractContent, contractName, companyId);
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
