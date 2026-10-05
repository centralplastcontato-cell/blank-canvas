// ============= MATERIAIS DE QUALIFICAÇÃO (fotos + vídeo + PDF) =============
// Rotina única de envio automático dos materiais depois da qualificação, usada
// pelo bot fixo (index.ts) e pela IA (ai-agent.ts) — mesma ordem, legendas,
// intervalos e opções de "envio automático" do número (wapi_bot_settings).
// Quem chama passa a função de envio (cada lado tem o seu wrapper do wapi-send).

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type MaterialSender = (
  action: 'send-text' | 'send-image' | 'send-video' | 'send-document',
  payload: { message?: string; mediaUrl?: string; caption?: string; fileName?: string },
  options?: { timeoutMs?: number; logLabel?: string },
) => Promise<string | null>;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendQualificationMaterials(
  supabase: SupabaseClient,
  instance: { id: string; instance_id: string; instance_token: string; unit: string | null; company_id: string },
  conv: { id: string; remote_jid: string },
  botData: Record<string, string>,
  settings: {
    auto_send_materials?: boolean;
    auto_send_photos?: boolean;
    auto_send_presentation_video?: boolean;
    auto_send_promo_video?: boolean;
    auto_send_pdf?: boolean;
    auto_send_photos_intro?: string | null;
    auto_send_pdf_intro?: string | null;
    message_delay_seconds?: number;
  } | null,
  send: MaterialSender,
): Promise<{ sentAny: boolean; failedSteps: string[] }> {
  const failedSteps: string[] = [];
  let sentAny = false;

  try {
    if (settings?.auto_send_materials === false) {
      console.log('[Bot Materials] Auto-send is disabled in settings');
      return { sentAny: false, failedSteps };
    }

    const unit = instance.unit;
    const month = botData.mes || '';
    const guestsStr = botData.convidados || '';
    const phone = conv.remote_jid.replace('@s.whatsapp.net', '').replace('@c.us', '');

    let companyName = unit || '';
    const { data: companyRow } = await supabase
      .from('companies')
      .select('name')
      .eq('id', instance.company_id)
      .maybeSingle();
    if (companyRow?.name) companyName = companyRow.name;

    console.log(`[Bot Materials] Starting auto-send for ${phone}, unit: ${unit}, companyName: ${companyName}, month: ${month}, guests: ${guestsStr}`);

    if (!unit) {
      console.log('[Bot Materials] No unit configured, skipping');
      return { sentAny: false, failedSteps };
    }

    const sendPhotos = settings?.auto_send_photos !== false;
    const sendPresentationVideo = settings?.auto_send_presentation_video !== false;
    const sendPromoVideo = settings?.auto_send_promo_video !== false;
    const sendPdf = settings?.auto_send_pdf !== false;
    const messageDelay = (settings?.message_delay_seconds || 5) * 1000;
    const photosIntro = settings?.auto_send_photos_intro || '✨ Conheça nosso espaço incrível! 🏰🎉';
    const pdfIntro = settings?.auto_send_pdf_intro || '📋 Oi {nome}! Segue o pacote completo para {convidados} no {empresa}. Qualquer dúvida é só chamar! 💜';

    await delay(messageDelay);

    const { data: captions } = await supabase
      .from('sales_material_captions')
      .select('caption_type, caption_text')
      .eq('is_active', true);

    const captionMap: Record<string, string> = {};
    captions?.forEach((caption) => {
      captionMap[caption.caption_type] = caption.caption_text;
    });

    let { data: materials, error: matError } = await supabase
      .from('sales_materials')
      .select('*')
      .eq('unit', unit)
      .eq('is_active', true)
      .order('type', { ascending: true })
      .order('sort_order', { ascending: true });

    if ((!materials || materials.length === 0) && instance.company_id) {
      console.log(`[Bot Materials] No materials for unit "${unit}", falling back to company_id`);
      const fallback = await supabase
        .from('sales_materials')
        .select('*')
        .eq('company_id', instance.company_id)
        .eq('is_active', true)
        .order('type', { ascending: true })
        .order('sort_order', { ascending: true });
      materials = fallback.data;
      matError = fallback.error;
    }

    if (matError || !materials?.length) {
      console.log(`[Bot Materials] No materials found for unit ${unit} or company fallback`);
      if (matError) failedSteps.push('materials_query');
      return { sentAny: false, failedSteps };
    }

    console.log(`[Bot Materials] Found ${materials.length} materials for ${unit}`);

    // 🎯 Filter by event_mode (interno/externo) when lead chose a venue type
    // local_festa = '1' → interno; local_festa = '2' → externo
    // Materials with event_mode = NULL are sent in both cases (universal)
    const localFesta = (botData.local_festa || '').trim();
    let chosenMode: 'interno' | 'externo' | null = null;
    if (localFesta === '1' || /interno|nosso\s*espa[çc]o|no\s*espa[çc]o/i.test(localFesta)) {
      chosenMode = 'interno';
    } else if (localFesta === '2' || /externa?|barraca|em\s*casa|condom[ií]nio|ch[áa]cara/i.test(localFesta)) {
      chosenMode = 'externo';
    }

    if (chosenMode) {
      const beforeCount = materials.length;
      materials = materials.filter((m) => !m.event_mode || m.event_mode === chosenMode);
      console.log(`[Bot Materials] Filtered by event_mode="${chosenMode}": ${beforeCount} → ${materials.length}`);
    }

    const photoCollections = materials.filter((material) => material.type === 'photo_collection');
    const allVideos = materials.filter((material) => material.type === 'video');
    const promoVideos = allVideos.filter((material) => material.name?.toLowerCase().includes('promo') || material.name?.toLowerCase().includes('carnaval'));
    const presentationVideos = allVideos.filter((material) => !promoVideos.includes(material));
    const pdfPackages = materials.filter((material) => material.type === 'pdf_package');

    const guestMatch = guestsStr.match(/(\d+)/);
    const guestCount = guestMatch ? parseInt(guestMatch[1], 10) : null;

    const sendText = async (message: string, logLabel: string) => {
      const msgId = await send('send-text', { message }, { timeoutMs: 30000, logLabel });
      if (!msgId) failedSteps.push(logLabel);
      if (msgId) sentAny = true;
      return msgId;
    };

    const sendImage = async (url: string, caption: string, logLabel: string) => {
      const msgId = await send('send-image', { mediaUrl: url, caption }, { timeoutMs: 30000, logLabel });
      if (!msgId) failedSteps.push(logLabel);
      if (msgId) sentAny = true;
      return msgId;
    };

    const sendVideo = async (url: string, caption: string, logLabel: string) => {
      const msgId = await send('send-video', { mediaUrl: url, caption }, { timeoutMs: 60000, logLabel });
      if (!msgId) failedSteps.push(logLabel);
      if (msgId) sentAny = true;
      return msgId;
    };

    const sendDocument = async (url: string, fileName: string, logLabel: string) => {
      const msgId = await send('send-document', { mediaUrl: url, fileName }, { timeoutMs: 30000, logLabel });
      if (!msgId) failedSteps.push(logLabel);
      if (msgId) sentAny = true;
      return msgId;
    };

    if (sendPhotos && photoCollections.length > 0) {
      const collection = photoCollections[0];
      const photos = collection.photo_urls || [];

      if (photos.length > 0) {
        console.log(`[Bot Materials] Sending ${photos.length} photos from collection`);
        const introText = photosIntro.replace(/\{unidade\}/gi, companyName).replace(/\{empresa\}/gi, companyName);
        await sendText(introText, 'photos_intro');
        await delay(messageDelay / 2);

        for (let i = 0; i < photos.length; i++) {
          await sendImage(photos[i], '', `photo_${i + 1}`);
          if (i < photos.length - 1) await delay(800);
        }

        console.log('[Bot Materials] Photos step complete');
        await delay(messageDelay);
      }
    }

    if (sendPresentationVideo && presentationVideos.length > 0) {
      // When event_mode filter is active, send ALL matching videos (e.g. 3 external videos for Carrossel).
      // Otherwise keep legacy behavior (single video) to avoid changing other clients.
      const videosToSend = chosenMode ? presentationVideos : [presentationVideos[0]];
      const videoCaption = captionMap['video'] || `🎬 Conheça o ${companyName}! ✨`;
      const caption = videoCaption.replace(/\{unidade\}/gi, companyName).replace(/\{empresa\}/gi, companyName);

      for (let i = 0; i < videosToSend.length; i++) {
        const video = videosToSend[i];
        console.log(`[Bot Materials] Sending presentation video ${i + 1}/${videosToSend.length}: ${video.name}`);
        // Caption only on the first video to avoid spam
        await sendVideo(video.file_url, i === 0 ? caption : '', `presentation_video_${i + 1}`);
        if (i < videosToSend.length - 1) await delay(messageDelay / 2);
      }
      await delay(messageDelay);
    }

    if (sendPromoVideo && promoVideos.length > 0) {
      const promoVideo = promoVideos[0];
      console.log(`[Bot Materials] Sending promo video: ${promoVideo.name}`);

      const promoCaption = captionMap['video_promo'] || captionMap['video'] || '🎬 Confira nosso vídeo! ✨';
      const caption = promoCaption.replace(/\{unidade\}/gi, companyName).replace(/\{empresa\}/gi, companyName);
      await sendVideo(promoVideo.file_url, caption, 'promo_video');
      await delay(messageDelay * 1.5);
    }

    if (sendPdf && pdfPackages.length > 0) {
      const universalPdfs = pdfPackages.filter((pkg) => pkg.guest_count === null);
      const specificPdfs = pdfPackages.filter((pkg) => pkg.guest_count !== null);

      let pdfsToSend: typeof pdfPackages = [];

      if (universalPdfs.length > 0) {
        pdfsToSend = universalPdfs;
        console.log(`[Bot Materials] Found ${universalPdfs.length} universal PDFs`);
      } else if (guestCount && specificPdfs.length > 0) {
        let matchingPdf = specificPdfs.find((pkg) => pkg.guest_count === guestCount);
        if (!matchingPdf) {
          const sortedPackages = [...specificPdfs].sort((a, b) => (a.guest_count || 0) - (b.guest_count || 0));
          matchingPdf = sortedPackages.find((pkg) => (pkg.guest_count || 0) >= guestCount) || sortedPackages[sortedPackages.length - 1];
        }
        if (matchingPdf) pdfsToSend = [matchingPdf];
      }

      if (pdfsToSend.length > 0) {
        const firstPdf = pdfsToSend[0];
        console.log(`[Bot Materials] Sending ${pdfsToSend.length} PDF(s): ${firstPdf.name}`);

        const firstName = (botData.nome || '').split(' ')[0] || 'você';
        const pdfIntroText = pdfIntro
          .replace(/\{nome\}/gi, firstName)
          .replace(/\{convidados\}/gi, guestsStr)
          .replace(/\{unidade\}/gi, companyName)
          .replace(/\{empresa\}/gi, companyName);

        await sendText(pdfIntroText, 'pdf_intro');
        await delay(messageDelay / 4);

        for (let i = 0; i < pdfsToSend.length; i++) {
          const pdf = pdfsToSend[i];
          const isPkgImage = /\.(png|jpe?g|webp)(\?|$)/i.test(pdf.file_url || '');
          const cleanName = (pdf.name || 'Pacote').trim();
          if (isPkgImage) {
            await sendImage(pdf.file_url, cleanName, `pdf_image_${i + 1}`);
          } else {
            const sanitizedName = cleanName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
            const fileName = `${sanitizedName || 'Pacote'}.pdf`;
            await sendDocument(pdf.file_url, fileName, `pdf_document_${i + 1}`);
          }

          if (i < pdfsToSend.length - 1) await delay(2000);
        }

        await delay(messageDelay);
      }
    }

    if (sentAny) {
      await supabase.from('wapi_conversations').update({
        last_message_at: new Date().toISOString(),
        last_message_content: '📄 Materiais enviados',
        last_message_from_me: true,
      }).eq('id', conv.id);
    }

    console.log(`[Bot Materials] Auto-send complete for ${phone}. Failures: ${failedSteps.join(', ') || 'none'}`);
    return { sentAny, failedSteps };
  } catch (err) {
    console.error('[Bot Materials] Fatal error during auto-send:', err);
    failedSteps.push('fatal_materials_error');
    return { sentAny, failedSteps };
  }
}

