import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const WAPI_BASE_URL = 'https://api.w-api.app/v1';

// Helper to get instance credentials
async function getInstanceCredentials(
  supabase: ReturnType<typeof createClient>,
  req: Request,
  body: { instanceId?: string; instanceToken?: string; unit?: string; companyId?: string }
): Promise<{ instance_id: string; instance_token: string } | Response> {
  const { instanceId, instanceToken, unit, companyId } = body;
  
  // Direct credentials provided (backward compat for webhook/config flows)
  if (instanceId && instanceToken) {
    return { instance_id: instanceId, instance_token: instanceToken };
  }

  // Fetch by unit (public chatbot flow)
  if (unit) {
    const { data: instance, error } = await supabase
      .from('wapi_instances')
      .select('instance_id, instance_token')
      .eq('unit', unit)
      .eq('status', 'connected')
      .single();
    
    if (error || !instance) {
      return new Response(JSON.stringify({ error: `Instância não encontrada para unidade ${unit}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return { instance_id: instance.instance_id, instance_token: instance.instance_token };
  }

  // Authenticated user flow — resolve token server-side
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const jwtToken = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwtToken);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify user has company access before returning credentials
  if (instanceId) {
    // Lookup by instanceId (without token) — verify user belongs to the same company
    const { data: instance } = await supabase
      .from('wapi_instances')
      .select('instance_id, instance_token, company_id')
      .eq('instance_id', instanceId)
      .single();

    if (!instance) {
      return new Response(JSON.stringify({ error: 'Instance not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user has access to this company
    const { data: hasAccess } = await supabase.rpc('user_has_company_access', {
      _user_id: user.id,
      _company_id: instance.company_id,
    });

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Access denied to this instance' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return { instance_id: instance.instance_id, instance_token: instance.instance_token };
  }

  // Lookup by companyId — get first connected instance
  if (companyId) {
    const { data: hasAccess } = await supabase.rpc('user_has_company_access', {
      _user_id: user.id,
      _company_id: companyId,
    });

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: instance } = await supabase
      .from('wapi_instances')
      .select('instance_id, instance_token')
      .eq('company_id', companyId)
      .eq('status', 'connected')
      .limit(1)
      .maybeSingle();

    if (!instance) {
      return new Response(JSON.stringify({ error: 'No connected instance for this company' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return { instance_id: instance.instance_id, instance_token: instance.instance_token };
  }

  // Fallback: lookup by user_id
  const { data: instance } = await supabase
    .from('wapi_instances')
    .select('instance_id, instance_token')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (!instance) {
    return new Response(JSON.stringify({ error: 'No W-API instance configured' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return { instance_id: instance.instance_id, instance_token: instance.instance_token };
}

// Helper for W-API calls with error handling
async function wapiRequest(url: string, token: string, method: string, body?: unknown): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const contentType = res.headers.get('content-type');
    if (contentType?.includes('text/html')) {
      return { ok: false, error: 'Instância W-API indisponível' };
    }

    const data = await res.json();
    if (!res.ok || data.error) {
      return { ok: false, error: data.message || 'Erro na W-API' };
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro de comunicação' };
  }
}

function extractWapiMessageId(payload: unknown): string | null {
  const data = payload as Record<string, unknown> | undefined;
  const nested = (data?.data as Record<string, unknown> | undefined) || {};
  const id = data?.messageId || nested.messageId || data?.id || nested.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

async function sendTextWithFallback(instanceId: string, token: string, rawPhone: string, message: string) {
  const endpoint = `${WAPI_BASE_URL}/message/send-text?instanceId=${instanceId}`;

  // Detect group JIDs and send directly via chatId (skip phone normalization)
  if (rawPhone && rawPhone.endsWith('@g.us')) {
    const groupAttempts = [
      { name: 'phone+message', body: { phone: rawPhone, message, delayTyping: 1 } },
      { name: 'phone+text', body: { phone: rawPhone, text: message, delayTyping: 1 } },
      { name: 'chatId+message', body: { chatId: rawPhone, message, delayTyping: 1 } },
      { name: 'chatId+text', body: { chatId: rawPhone, text: message, delayTyping: 1 } },
      { name: 'number+message', body: { number: rawPhone, message, delayTyping: 1 } },
      { name: 'groupId+message', body: { groupId: rawPhone, message, delayTyping: 1 } },
    ];
    for (const attempt of groupAttempts) {
      const res = await wapiRequest(endpoint, token, 'POST', attempt.body);
      if (res.ok) {
        const msgId = extractWapiMessageId(res.data);
        console.log(`[send-text] Group success [${attempt.name}] msgId=${msgId || 'NONE'}`);
        return { ok: true, data: res.data, attempt: attempt.name };
      }
      console.warn(`[send-text] Group failed [${attempt.name}]: ${res.error}`);
    }
    return { ok: false, error: 'Falha ao enviar para grupo (W-API)' };
  }

  const phone = String(rawPhone || '').replace(/\D/g, '');

  const attempts: Array<{ name: string; body: Record<string, unknown> }> = [
    { name: 'phone+message', body: { phone, message, delayTyping: 1 } },
    { name: 'phone+text', body: { phone, text: message, delayTyping: 1 } },
    { name: 'phoneNumber+message', body: { phoneNumber: phone, message, delayTyping: 1 } },
    { name: 'phoneNumber+text', body: { phoneNumber: phone, text: message, delayTyping: 1 } },
    { name: 'chatId+message', body: { chatId: `${phone}@s.whatsapp.net`, message, delayTyping: 1 } },
    { name: 'chatId+text', body: { chatId: `${phone}@s.whatsapp.net`, text: message, delayTyping: 1 } },
  ];

  let lastError = 'Falha ao enviar mensagem (W-API)';

  for (const attempt of attempts) {
    const res = await wapiRequest(endpoint, token, 'POST', attempt.body);
    if (res.ok) {
      const msgId = extractWapiMessageId(res.data);
      // PHASE 1+2: Validate we got a real messageId back, log response for diagnostics
      if (!msgId) {
        console.warn(`[send-text] W-API returned ok but NO messageId [${attempt.name}]. Response:`, JSON.stringify(res.data).substring(0, 300));
        // Still return ok (provider accepted), but log the anomaly
      }
      console.log(`[send-text] Success [${attempt.name}] msgId=${msgId || 'NONE'}. Response:`, JSON.stringify(res.data).substring(0, 200));
      return { ok: true, data: res.data, attempt: attempt.name };
    }
    lastError = res.error || lastError;
    console.warn(`[send-text] Failed [${attempt.name}]: ${lastError}`);
  }

  return { ok: false, error: lastError };
}

// Helper to find or create a conversation for LP/bot outbound messages
async function findOrCreateConversation(
  supabase: ReturnType<typeof createClient>,
  phone: string,
  instanceExternalId: string,
  lpMode?: boolean,
  contactName?: string,
): Promise<{ conversationId: string; companyId: string } | null> {
  try {
    // Normalize phone for remote_jid format
    const cleanPhone = phone.replace(/\D/g, '');
    const remoteJid = `${cleanPhone}@s.whatsapp.net`;

    // Find the internal instance record
    const { data: instanceRecord } = await supabase
      .from('wapi_instances')
      .select('id, company_id')
      .eq('instance_id', instanceExternalId)
      .single();

    if (!instanceRecord) {
      console.log('findOrCreateConversation: instance not found for', instanceExternalId);
      return null;
    }

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('wapi_conversations')
      .select('id, company_id, contact_name, bot_data')
      .eq('instance_id', instanceRecord.id)
      .eq('remote_jid', remoteJid)
      .maybeSingle();

    if (existing) {
      // If lpMode, reset bot state so returning leads can re-engage
      if (lpMode) {
        const updateData: Record<string, unknown> = {
          bot_step: 'lp_sent',
          bot_enabled: true,
        };
        // Update contact_name if we have a real name and current one looks like a phone number
        if (contactName && /^\d+$/.test(existing.contact_name || '')) {
          updateData.contact_name = contactName;
        }
        // Ensure bot_data.nome is set
        if (contactName) {
          const existingBotData = (existing as any).bot_data || {};
          updateData.bot_data = { ...existingBotData, nome: contactName };
        }
        await supabase.from('wapi_conversations').update(updateData).eq('id', existing.id);
        console.log('findOrCreateConversation: reset bot_step to lp_sent for existing conversation', existing.id);
      } else {
        console.log('findOrCreateConversation: found existing conversation', existing.id);
      }
      return { conversationId: existing.id, companyId: existing.company_id };
    }

    // Create new conversation
    const { data: newConv, error: createError } = await supabase
      .from('wapi_conversations')
      .insert({
        instance_id: instanceRecord.id,
        company_id: instanceRecord.company_id,
        remote_jid: remoteJid,
        contact_phone: cleanPhone,
        contact_name: contactName || cleanPhone,
        bot_enabled: true,
        bot_step: 'lp_sent',
        last_message_from_me: true,
        ...(contactName ? { bot_data: { nome: contactName } } : {}),
      })
      .select('id, company_id')
      .single();

    if (createError) {
      // Handle unique constraint violation (race condition)
      if (createError.code === '23505') {
        const { data: retry } = await supabase
          .from('wapi_conversations')
          .select('id, company_id')
          .eq('instance_id', instanceRecord.id)
          .eq('remote_jid', remoteJid)
          .single();
        if (retry) {
          console.log('findOrCreateConversation: found after conflict', retry.id);
          return { conversationId: retry.id, companyId: retry.company_id };
        }
      }
      console.error('findOrCreateConversation: create error', createError);
      return null;
    }

    console.log('findOrCreateConversation: created new conversation', newConv.id);
    return { conversationId: newConv.id, companyId: newConv.company_id };
  } catch (err) {
    console.error('findOrCreateConversation error:', err);
    return null;
  }
}

// === PHASE 1: Session health preflight ===
// Checks if the instance session is healthy enough to send messages.
// Returns null if healthy, or a Response with error if blocked.
async function checkSessionHealth(
  instanceExternalId: string,
  instanceToken: string,
  supabase: ReturnType<typeof createClient>,
  action: string,
  conversationId?: string,
  companyId?: string | null,
  messageContent?: string,
): Promise<Response | null> {
  // Only block send actions, not status/config actions
  const sendActions = ['send-text', 'send-image', 'send-audio', 'send-video', 'send-document', 'send-contact'];
  if (!sendActions.includes(action)) return null;

  // Check DB first
  const { data: dbInstance } = await supabase
    .from('wapi_instances')
    .select('id, status, phone_number')
    .eq('instance_id', instanceExternalId)
    .single();

  if (!dbInstance) return null;

  // SESSION_INCOMPLETE: connected but no phone_number
  if (dbInstance.status === 'connected' && !dbInstance.phone_number) {
    console.warn(`[Preflight] BLOCKED ${action}: instance ${instanceExternalId} is connected but has no phone_number (SESSION_INCOMPLETE)`);
    
    if (conversationId && messageContent) {
      const failedMsgId = `blocked_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await supabase.from('wapi_messages').insert({
        conversation_id: conversationId,
        message_id: failedMsgId,
        from_me: true,
        message_type: 'text',
        content: messageContent,
        status: 'failed',
        timestamp: new Date().toISOString(),
        company_id: companyId,
        metadata: { blocked_reason: 'SESSION_INCOMPLETE' },
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Sessão do WhatsApp incompleta. Reconecte a instância.',
      errorType: 'SESSION_INCOMPLETE',
      blocked: true,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // DISCONNECTED: check real status before blocking
  if (dbInstance.status === 'disconnected') {
    console.warn(`[Preflight] Instance ${instanceExternalId} is disconnected in DB. Checking real status...`);
    
    // Quick real-time check against W-API
    try {
      const statusRes = await fetch(
        `${WAPI_BASE_URL}/instance/qr-code?instanceId=${instanceExternalId}`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${instanceToken}` },
        }
      );
      
      if (statusRes.ok) {
        const ct = statusRes.headers.get('content-type');
        // If response is an image or HTML, QR is being shown = still disconnected
        if (ct?.includes('image') || ct?.includes('text/html')) {
          // Confirmed disconnected
        } else {
          const statusData = await statusRes.json();
          const isConnected = statusData?.connected === true || 
                              statusData?.status === 'connected' || 
                              statusData?.state === 'connected' ||
                              // No QR code and no error = likely connected
                              (!statusData?.qrcode && !statusData?.qrCode && !statusData?.qr && !statusData?.base64 && !statusData?.error);
          
          if (isConnected) {
            console.log(`[Preflight] ✅ W-API says connected! Auto-recovering instance ${instanceExternalId}`);
            const phone = statusData?.phone || statusData?.phoneNumber || statusData?.me?.id?.split('@')[0] || null;
            await supabase.from('wapi_instances').update({ 
              status: 'connected', 
              connected_at: new Date().toISOString(),
              ...(phone ? { phone_number: phone } : {}),
            }).eq('id', dbInstance.id);
            return null; // Allow send
          }
        }
      }
    } catch (err) {
      console.warn(`[Preflight] Real-time status check failed for ${instanceExternalId}:`, err);
    }
    
    // Confirmed disconnected - save message as failed
    console.warn(`[Preflight] BLOCKED ${action}: instance ${instanceExternalId} confirmed disconnected`);
    
    if (conversationId && messageContent) {
      const failedMsgId = `blocked_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await supabase.from('wapi_messages').insert({
        conversation_id: conversationId,
        message_id: failedMsgId,
        from_me: true,
        message_type: 'text',
        content: messageContent,
        status: 'failed',
        timestamp: new Date().toISOString(),
        company_id: companyId,
        metadata: { blocked_reason: 'DISCONNECTED' },
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Sessão do WhatsApp desconectada. Reconecte via QR Code nas Configurações.',
      errorType: 'DISCONNECTED',
      blocked: true,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, phone, message, conversationId } = body;

    const creds = await getInstanceCredentials(supabase, req, body);
    if (creds instanceof Response) return creds;
    const { instance_id, instance_token } = creds;

    console.log('wapi-send:', action, phone ? `phone:${phone}` : '', 'instance:', instance_id);

    // Resolve company_id from conversation for message inserts
    let companyId: string | null = null;
    if (conversationId) {
      const { data: convData } = await supabase
        .from('wapi_conversations')
        .select('company_id')
        .eq('id', conversationId)
        .single();
      companyId = convData?.company_id || null;
    }

    // === PHASE 1: Preflight session health check for all send actions ===
    const preflightResult = await checkSessionHealth(instance_id, instance_token, supabase, action, conversationId, companyId, message);
    if (preflightResult) return preflightResult;

    switch (action) {
      case 'send-text': {
        console.log('send-text: sending message to', phone);
        const sendResult = await sendTextWithFallback(instance_id, instance_token, phone, message);

        console.log('send-text response:', JSON.stringify(sendResult));

        if (!sendResult.ok) {
          console.error('send-text failed:', sendResult.error);
          return new Response(JSON.stringify({ error: sendResult.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const messageId = extractWapiMessageId(sendResult.data) || `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        // Resolve or create conversation for DB tracking
        let resolvedConvId = conversationId;
        let resolvedCompanyId = companyId;

        if (!resolvedConvId && phone) {
          // Auto-find or create conversation (LP/bot outbound flow)
          const convResult = await findOrCreateConversation(supabase, phone, instance_id, body.lpMode, body.contactName);
          if (convResult) {
            resolvedConvId = convResult.conversationId;
            resolvedCompanyId = convResult.companyId;
          }
        }

        if (resolvedConvId) {
          await supabase.from('wapi_messages').insert({
            conversation_id: resolvedConvId,
            message_id: messageId,
            from_me: true,
            message_type: 'text',
            content: message,
            status: 'sent',
            timestamp: new Date().toISOString(),
            company_id: resolvedCompanyId,
          });
          await supabase.from('wapi_conversations').update({
            last_message_at: new Date().toISOString(),
            last_message_content: message.substring(0, 100),
            last_message_from_me: true,
          }).eq('id', resolvedConvId);
        }

        return new Response(JSON.stringify({ success: true, messageId, conversationId: resolvedConvId, providerAttempt: (sendResult as { attempt?: string }).attempt }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'send-image': {
        const { base64, caption, mediaUrl } = body;
        
        let imagePayload: Record<string, string> = { phone, caption: caption || '' };
        
        // Prefer sending by URL directly (avoids base64 memory/size limits)
        if (mediaUrl && !base64) {
          console.log('send-image: sending by URL:', mediaUrl.substring(0, 80));
          imagePayload.image = mediaUrl;
        } else if (base64) {
          // Use provided base64
          let imageBase64 = base64;
          if (!imageBase64.startsWith('data:')) {
            imageBase64 = `data:image/jpeg;base64,${imageBase64}`;
          }
          imagePayload.image = imageBase64;
        } else {
          return new Response(JSON.stringify({ error: 'Imagem é obrigatória' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const res = await wapiRequest(
          `${WAPI_BASE_URL}/message/send-image?instanceId=${instance_id}`,
          instance_token,
          'POST',
          imagePayload
        );
        
        console.log('send-image response:', JSON.stringify(res));
        
        if (!res.ok) {
          console.error('send-image failed:', res.error, 'mediaUrl:', mediaUrl?.substring(0, 80));
          return new Response(JSON.stringify({ error: res.error }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const messageId = (res.data as { messageId?: string })?.messageId;
        
        if (conversationId) {
          await supabase.from('wapi_messages').insert({
            conversation_id: conversationId,
            message_id: messageId,
            from_me: true,
            message_type: 'image',
            content: caption || '[Imagem]',
            media_url: mediaUrl || null,
            status: 'sent',
            timestamp: new Date().toISOString(),
            company_id: companyId,
          });
          await supabase.from('wapi_conversations').update({ 
            last_message_at: new Date().toISOString(),
            last_message_content: caption ? `📷 ${caption.substring(0, 90)}` : '📷 Imagem',
            last_message_from_me: true,
          }).eq('id', conversationId);
        }

        return new Response(JSON.stringify({ success: true, messageId }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'send-audio': {
        const { base64: audioBase64, mediaUrl: audioMediaUrl } = body;
        
        let finalAudio = audioBase64;
        if (!finalAudio && audioMediaUrl) {
          const audioRes = await fetch(audioMediaUrl);
          const buf = await audioRes.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let bin = '';
          for (let i = 0; i < bytes.length; i += 32768) {
            const chunk = bytes.subarray(i, Math.min(i + 32768, bytes.length));
            bin += String.fromCharCode.apply(null, Array.from(chunk));
          }
          finalAudio = btoa(bin);
        }

        const res = await wapiRequest(
          `${WAPI_BASE_URL}/message/send-audio?instanceId=${instance_id}`,
          instance_token,
          'POST',
          { phone, base64: finalAudio }
        );
        
        if (!res.ok) {
          return new Response(JSON.stringify({ error: res.error }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const messageId = (res.data as { messageId?: string })?.messageId;
        
        if (conversationId) {
          await supabase.from('wapi_messages').insert({
            conversation_id: conversationId,
            message_id: messageId,
            from_me: true,
            message_type: 'audio',
            content: '[Áudio]',
            media_url: audioMediaUrl || null,
            status: 'sent',
            timestamp: new Date().toISOString(),
            company_id: companyId,
          });
          await supabase.from('wapi_conversations').update({ 
            last_message_at: new Date().toISOString(),
            last_message_content: '🎤 Áudio',
            last_message_from_me: true,
          }).eq('id', conversationId);
        }

        return new Response(JSON.stringify({ success: true, messageId }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'send-document': {
        const { fileName, mediaUrl: docUrl } = body;
        
        if (!docUrl) {
          return new Response(JSON.stringify({ error: 'URL do documento é obrigatória' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const ext = fileName?.split('.').pop()?.toLowerCase() || 
                    docUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || 'pdf';

        const res = await wapiRequest(
          `${WAPI_BASE_URL}/message/send-document?instanceId=${instance_id}`,
          instance_token,
          'POST',
          { phone, document: docUrl, fileName: fileName || 'document', extension: ext }
        );
        
        if (!res.ok) {
          return new Response(JSON.stringify({ error: res.error }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const messageId = (res.data as { messageId?: string })?.messageId;
        
        if (conversationId) {
          await supabase.from('wapi_messages').insert({
            conversation_id: conversationId,
            message_id: messageId,
            from_me: true,
            message_type: 'document',
            content: fileName || '[Documento]',
            media_url: docUrl,
            status: 'sent',
            timestamp: new Date().toISOString(),
            company_id: companyId,
          });
          await supabase.from('wapi_conversations').update({ 
            last_message_at: new Date().toISOString(),
            last_message_content: `📄 ${fileName || 'Documento'}`,
            last_message_from_me: true,
          }).eq('id', conversationId);
        }

        return new Response(JSON.stringify({ success: true, messageId }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'send-video': {
        const { mediaUrl: videoUrl, caption } = body;
        
        if (!videoUrl) {
          return new Response(JSON.stringify({ error: 'URL do vídeo é obrigatória' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const res = await wapiRequest(
          `${WAPI_BASE_URL}/message/send-video?instanceId=${instance_id}`,
          instance_token,
          'POST',
          { phone, video: videoUrl, caption: caption || '' }
        );
        
        if (!res.ok) {
          return new Response(JSON.stringify({ error: res.error }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const messageId = (res.data as { messageId?: string })?.messageId;
        
        if (conversationId) {
          await supabase.from('wapi_messages').insert({
            conversation_id: conversationId,
            message_id: messageId,
            from_me: true,
            message_type: 'video',
            content: caption || '[Vídeo]',
            media_url: videoUrl,
            status: 'sent',
            timestamp: new Date().toISOString(),
            company_id: companyId,
          });
          await supabase.from('wapi_conversations').update({ 
            last_message_at: new Date().toISOString(),
            last_message_content: caption ? `🎬 ${caption.substring(0, 90)}` : '🎬 Vídeo',
            last_message_from_me: true,
          }).eq('id', conversationId);
        }

        return new Response(JSON.stringify({ success: true, messageId }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'send-contact': {
        const { contactName, contactPhone } = body;
        
        if (!contactName || !contactPhone) {
          return new Response(JSON.stringify({ error: 'Nome e telefone do contato são obrigatórios' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const cleanContactPhone = contactPhone.replace(/\D/g, '');
        
        const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${contactName}\nTEL;type=CELL;waid=${cleanContactPhone}:+${cleanContactPhone}\nEND:VCARD`;

        const res = await wapiRequest(
          `${WAPI_BASE_URL}/message/send-contact?instanceId=${instance_id}`,
          instance_token,
          'POST',
          {
            phone,
            contact: {
              fullName: contactName,
              organization: '',
              phoneNumber: `+${cleanContactPhone}`,
              wuid: cleanContactPhone,
              displayName: contactName,
            },
            name: {
              formatted_name: contactName,
              first_name: contactName,
            },
            vcard,
          }
        );
        
        if (!res.ok) {
          return new Response(JSON.stringify({ error: res.error }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const messageId = (res.data as { messageId?: string })?.messageId;
        
        if (conversationId) {
          const contactContent = `[Contato] ${contactName} - ${contactPhone}`;
          await supabase.from('wapi_messages').insert({
            conversation_id: conversationId,
            message_id: messageId,
            from_me: true,
            message_type: 'contact',
            content: contactContent,
            status: 'sent',
            timestamp: new Date().toISOString(),
            company_id: companyId,
          });
          await supabase.from('wapi_conversations').update({ 
            last_message_at: new Date().toISOString(),
            last_message_content: `👤 ${contactName}`,
            last_message_from_me: true,
          }).eq('id', conversationId);
        }

        return new Response(JSON.stringify({ success: true, messageId }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-status': {
        try {
          console.log('get-status: checking via qr-code endpoint for', instance_id);
          
          // The only reliable endpoint in W-API LITE is /instance/qr-code
          // All other endpoints (/instance/status, /info, /connection-state, /profile) return 404
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          
          let qrRes: Response | null = null;
          try {
            qrRes = await fetch(
              `${WAPI_BASE_URL}/instance/qr-code?instanceId=${instance_id}`,
              { headers: { 'Authorization': `Bearer ${instance_token}` }, signal: controller.signal }
            );
            clearTimeout(timeout);
          } catch (fetchErr) {
            clearTimeout(timeout);
            console.warn('get-status: qr-code fetch failed:', fetchErr instanceof Error ? fetchErr.message : String(fetchErr));
            return new Response(JSON.stringify({ 
              status: 'degraded',
              connected: false,
              error: 'Instabilidade temporária na W-API.',
              errorType: 'TIMEOUT_OR_GATEWAY',
            }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          console.log('get-status qr response:', qrRes.status);
          
          if (qrRes.status === 404) {
            console.error(`get-status: qr-code returned 404 for ${instance_id}. Instance may be expired.`);
            return new Response(JSON.stringify({ 
              status: 'instance_not_found',
              connected: false,
              error: 'Instância não encontrada na W-API. Verifique no painel da W-API (w-api.app) se a instância ainda existe.',
              errorType: 'NOT_FOUND',
            }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          if (qrRes.status === 401 || qrRes.status === 403) {
            return new Response(JSON.stringify({ 
              status: 'unauthorized',
              connected: false,
              error: 'Token da W-API inválido ou expirado.',
              errorType: 'UNAUTHORIZED',
            }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          if (!qrRes.ok) {
            return new Response(JSON.stringify({ 
              status: 'degraded',
              connected: false,
              error: `W-API retornou status ${qrRes.status}`,
              errorType: 'TIMEOUT_OR_GATEWAY',
            }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const ct = qrRes.headers.get('content-type');
          
          // If response is HTML, instance is likely disconnected
          if (ct?.includes('text/html')) {
            return new Response(JSON.stringify({ status: 'disconnected', connected: false }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // If response is an image, QR code is being shown = not connected yet
          if (ct?.includes('image')) {
            return new Response(JSON.stringify({ status: 'disconnected', connected: false }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const data = await qrRes.json();
          console.log('get-status qr data:', JSON.stringify(data));
          
          if (data.connected === true) {
            const qrPhone = data.phone || data.phoneNumber || data.me?.id?.split('@')[0] || null;
            return new Response(JSON.stringify({ 
              status: 'connected',
              phoneNumber: qrPhone,
              connected: true,
            }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const hasQrCode = data.qrcode || data.qrCode || data.qr || data.base64;
          
          if (hasQrCode) {
            return new Response(JSON.stringify({ 
              status: 'disconnected',
              phoneNumber: null,
              connected: false,
            }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          // No QR code and not explicitly connected - check if there's an error
          if (!data.error) {
            // W-API returned a response without error and without QR = likely connected
            return new Response(JSON.stringify({ 
              status: 'connected',
              phoneNumber: data.phone || data.phoneNumber || null,
              connected: true,
            }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          // Default to disconnected
          return new Response(JSON.stringify({ 
            status: 'disconnected',
            phoneNumber: null,
            connected: false,
          }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (e) {
          console.error('get-status error:', e);
          return new Response(JSON.stringify({ 
            status: 'degraded', 
            connected: false, 
            error: e instanceof Error ? e.message : 'Erro de comunicação',
            errorType: 'TIMEOUT_OR_GATEWAY',
          }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'get-qr': {
        try {
          console.log('wapi-send: get-qr - starting fetch for', instance_id);
          const qrController = new AbortController();
          const qrTimeout = setTimeout(() => qrController.abort(), 10000); // 10s timeout

          let res: Response;
          try {
            res = await fetch(
              `${WAPI_BASE_URL}/instance/qr-code?instanceId=${instance_id}&image=enable`,
              { headers: { 'Authorization': `Bearer ${instance_token}` }, signal: qrController.signal }
            );
            clearTimeout(qrTimeout);
          } catch (fetchErr) {
            clearTimeout(qrTimeout);
            const isAbort = fetchErr instanceof Error && (fetchErr.name === 'AbortError' || fetchErr.message.includes('aborted'));
            console.warn('wapi-send: get-qr fetch error:', isAbort ? 'TIMEOUT' : (fetchErr instanceof Error ? fetchErr.message : String(fetchErr)));
            return new Response(JSON.stringify({
              error: 'W-API instável no momento. Tente novamente ou conecte por Telefone.',
              errorType: 'TIMEOUT_OR_GATEWAY',
            }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          console.log('wapi-send: get-qr - received status:', res.status);

          // Gateway errors
          if (res.status === 502 || res.status === 503 || res.status === 504) {
            console.warn('wapi-send: get-qr gateway error:', res.status);
            return new Response(JSON.stringify({
              error: 'W-API instável no momento. Tente novamente ou conecte por Telefone.',
              errorType: 'TIMEOUT_OR_GATEWAY',
            }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          // W-API returns 500 when instance needs restart — auto-restart and retry
          if (res.status === 500) {
            console.warn('wapi-send: get-qr got 500 — attempting auto-restart for', instance_id);
            
            // Try restart endpoints
            const restartUrls = [
              { url: `${WAPI_BASE_URL}/instance/restart?instanceId=${instance_id}`, method: 'POST' },
              { url: `${WAPI_BASE_URL}/instance/restart?instanceId=${instance_id}`, method: 'PUT' },
              { url: `${WAPI_BASE_URL}/instance/reboot?instanceId=${instance_id}`, method: 'POST' },
              { url: `${WAPI_BASE_URL}/instance/restart?instanceId=${instance_id}`, method: 'GET' },
            ];
            
            let restarted = false;
            for (const ep of restartUrls) {
              try {
                const rCtrl = new AbortController();
                const rTimeout = setTimeout(() => rCtrl.abort(), 8000);
                const rRes = await fetch(ep.url, {
                  method: ep.method,
                  headers: { 'Authorization': `Bearer ${instance_token}`, 'Content-Type': 'application/json' },
                  signal: rCtrl.signal,
                });
                clearTimeout(rTimeout);
                console.log(`get-qr auto-restart: ${ep.method} => ${rRes.status}`);
                if (rRes.ok) { restarted = true; break; }
              } catch (e) {
                console.warn(`get-qr auto-restart ${ep.method} failed:`, e instanceof Error ? e.message : e);
              }
            }
            
            if (restarted) {
              // Wait 4s for instance to come back, then retry QR
              await new Promise(r => setTimeout(r, 4000));
              console.log('get-qr: retrying QR after restart...');
              
              try {
                const retryCtrl = new AbortController();
                const retryTimeout = setTimeout(() => retryCtrl.abort(), 10000);
                const retryRes = await fetch(
                  `${WAPI_BASE_URL}/instance/qr-code?instanceId=${instance_id}&image=enable`,
                  { headers: { 'Authorization': `Bearer ${instance_token}` }, signal: retryCtrl.signal }
                );
                clearTimeout(retryTimeout);
                
                console.log('get-qr retry status:', retryRes.status);
                
                if (retryRes.ok) {
                  const retryCt = retryRes.headers.get('content-type');
                  if (retryCt?.includes('application/json')) {
                    const retryData = await retryRes.json();
                    if (retryData.connected) {
                      return new Response(JSON.stringify({ connected: true, success: true }), {
                        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                      });
                    }
                    const retryQr = retryData.qrcode || retryData.qrCode || retryData.qr || retryData.base64;
                    if (retryQr) {
                      return new Response(JSON.stringify({ qrCode: retryQr, success: true }), {
                        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                      });
                    }
                  } else if (retryCt?.includes('image')) {
                    const buf = await retryRes.arrayBuffer();
                    const bytes = new Uint8Array(buf);
                    let bin = '';
                    for (let i = 0; i < bytes.length; i += 32768) {
                      const chunk = bytes.subarray(i, Math.min(i + 32768, bytes.length));
                      bin += String.fromCharCode.apply(null, Array.from(chunk));
                    }
                    return new Response(JSON.stringify({ qrCode: `data:${retryCt};base64,${btoa(bin)}`, success: true }), {
                      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                  }
                }
              } catch (retryErr) {
                console.warn('get-qr retry after restart failed:', retryErr instanceof Error ? retryErr.message : retryErr);
              }
            }
            
            // Restart failed or retry failed — return friendly error
            return new Response(JSON.stringify({
              error: 'Instância reiniciando. Aguarde alguns segundos e clique em "Tentar novamente".',
              errorType: restarted ? 'RESTARTING' : 'INSTANCE_ERROR',
            }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          if (!res.ok) {
            return new Response(JSON.stringify({ error: `Erro: ${res.status}` }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const ct = res.headers.get('content-type');
          if (ct?.includes('application/json')) {
            const data = await res.json();
            if (data.connected) {
              return new Response(JSON.stringify({ connected: true, success: true }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
            const qr = data.qrcode || data.qrCode || data.qr || data.base64;
            if (qr) {
              return new Response(JSON.stringify({ qrCode: qr, success: true }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
            return new Response(JSON.stringify({ error: 'QR não disponível' }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } else if (ct?.includes('image')) {
            const buf = await res.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let bin = '';
            for (let i = 0; i < bytes.length; i += 32768) {
              const chunk = bytes.subarray(i, Math.min(i + 32768, bytes.length));
              bin += String.fromCharCode.apply(null, Array.from(chunk));
            }
            return new Response(JSON.stringify({ qrCode: `data:${ct};base64,${btoa(bin)}`, success: true }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          return new Response(JSON.stringify({ error: 'Formato inesperado' }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (e) {
          console.error('wapi-send: get-qr unexpected error:', e instanceof Error ? e.message : String(e));
          return new Response(JSON.stringify({ 
            error: e instanceof Error ? e.message : 'Erro',
            errorType: 'UNKNOWN',
          }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'request-pairing-code': {
        const { phoneNumber } = body;
        if (!phoneNumber) {
          return new Response(JSON.stringify({ error: 'Número obrigatório' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        let cleanPhone = phoneNumber.replace(/\D/g, '');
        if (!cleanPhone.startsWith('55')) cleanPhone = '55' + cleanPhone;
        
        try {
          const res = await fetch(
            `${WAPI_BASE_URL}/instance/pairing-code?instanceId=${instance_id}&phoneNumber=${cleanPhone}`,
            { headers: { 'Authorization': `Bearer ${instance_token}` } }
          );
          
          if (!res.ok) {
            const txt = await res.text();
            return new Response(JSON.stringify({ error: `Erro: ${res.status}`, details: txt }), {
              status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const data = await res.json();
          const code = data.pairingCode || data.code || data.pairing_code;
          if (code) {
            return new Response(JSON.stringify({ success: true, pairingCode: code }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          if (data.connected) {
            return new Response(JSON.stringify({ error: 'Instância já conectada', connected: true }), {
              status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          return new Response(JSON.stringify({ error: 'Código não disponível' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'configure-webhooks': {
        const { webhookUrl } = body;
        const config = {
          onConnect: webhookUrl,
          onDisconnect: webhookUrl,
          onMessageSent: webhookUrl,
          onMessageReceived: webhookUrl,
          onMessageStatus: webhookUrl,
        };
        
        // Try multiple endpoint variants for compatibility across W-API plans
        const webhookEndpoints = [
          { url: `${WAPI_BASE_URL}/instance/webhooks?instanceId=${instance_id}`, method: 'PUT' },
          { url: `${WAPI_BASE_URL}/instance/webhooks?instanceId=${instance_id}`, method: 'POST' },
          { url: `${WAPI_BASE_URL}/instance/set-webhooks?instanceId=${instance_id}`, method: 'POST' },
        ];

        let lastError = '';
        let lastStatus = 0;

        for (const endpoint of webhookEndpoints) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            
            const res = await fetch(endpoint.url, {
              method: endpoint.method,
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instance_token}` },
              body: JSON.stringify(config),
              signal: controller.signal,
            });
            clearTimeout(timeout);
            
            lastStatus = res.status;
            
            // Gateway/timeout errors — do NOT disconnect, just try next
            if (res.status === 502 || res.status === 503 || res.status === 504) {
              console.warn(`configure-webhooks: gateway error ${res.status} on ${endpoint.method} ${endpoint.url.split('?')[0].split('/').pop()}`);
              lastError = `Timeout/gateway (${res.status})`;
              continue;
            }
            
            const contentType = res.headers.get('content-type');
            
            // 404 — try next endpoint variant
            if (res.status === 404) {
              console.warn(`configure-webhooks: 404 on ${endpoint.method} ${endpoint.url.split('?')[0].split('/').pop()}`);
              lastError = 'Endpoint não encontrado';
              continue;
            }
            
            // Non-JSON response — do NOT disconnect, could be gateway issue
            if (contentType && !contentType.includes('application/json')) {
              const textBody = await res.text();
              console.warn('configure-webhooks: non-JSON response:', res.status, textBody.substring(0, 200));
              lastError = 'Resposta inesperada da W-API';
              continue;
            }

            const data = await res.json();
            
            if (res.ok && !data.error) {
              console.log(`configure-webhooks: SUCCESS via ${endpoint.method} ${endpoint.url.split('?')[0].split('/').pop()}`);
              return new Response(JSON.stringify({ success: true, result: data, variant: endpoint.method }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
            
            lastError = data.message || data.error || 'Erro desconhecido';
          } catch (e) {
            console.warn(`configure-webhooks: fetch error on ${endpoint.method}:`, e instanceof Error ? e.message : String(e));
            lastError = e instanceof Error ? e.message : 'Erro de comunicação';
            // Network errors are transient — do NOT disconnect
            continue;
          }
        }

        // All attempts failed — but do NOT auto-disconnect
        console.error(`configure-webhooks: all ${webhookEndpoints.length} attempts failed for ${instance_id}. lastStatus=${lastStatus}, lastError=${lastError}`);
        
        const isTransient = lastStatus === 502 || lastStatus === 503 || lastStatus === 504 || lastError.includes('abort') || lastError.includes('Timeout');
        
        return new Response(JSON.stringify({ 
          success: false, 
          error: isTransient 
            ? 'Instabilidade temporária na W-API. Tente novamente em alguns minutos.'
            : `Não foi possível configurar webhooks: ${lastError}. Verifique as credenciais.`,
          errorType: isTransient ? 'TIMEOUT_OR_GATEWAY' : 'CONFIGURATION_FAILED',
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'check-webhooks': {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          
          const res = await fetch(`${WAPI_BASE_URL}/instance/webhooks?instanceId=${instance_id}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${instance_token}` },
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (res.status === 502 || res.status === 503 || res.status === 504) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'W-API instável. Tente novamente.',
              errorType: 'TIMEOUT_OR_GATEWAY',
            }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          if (!res.ok) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: `Erro ${res.status} ao consultar webhooks`,
            }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const ct = res.headers.get('content-type');
          if (!ct?.includes('application/json')) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'Resposta inesperada da W-API',
            }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const data = await res.json();
          console.log('check-webhooks data:', JSON.stringify(data));
          
          const webhookUrl = `https://rsezgnkfhodltrsewlhz.supabase.co/functions/v1/wapi-webhook`;
          
          const hasMessageReceived = data.onMessageReceived === webhookUrl;
          const hasMessageSent = data.onMessageSent === webhookUrl;
          const hasConnect = data.onConnect === webhookUrl;
          const hasDisconnect = data.onDisconnect === webhookUrl;
          
          const allConfigured = hasMessageReceived && hasMessageSent;
          
          return new Response(JSON.stringify({ 
            success: true,
            configured: allConfigured,
            details: {
              onMessageReceived: hasMessageReceived,
              onMessageSent: hasMessageSent,
              onConnect: hasConnect,
              onDisconnect: hasDisconnect,
              raw: data,
            },
          }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (e) {
          console.error('check-webhooks error:', e);
          return new Response(JSON.stringify({ 
            success: false, 
            error: e instanceof Error ? e.message : 'Erro ao verificar webhooks',
            errorType: 'TIMEOUT_OR_GATEWAY',
          }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'download-media': {
        const { messageId: msgId } = body;
        if (!msgId) {
          return new Response(JSON.stringify({ error: 'messageId obrigatório' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get message with instance info
        const { data: msg, error: msgErr } = await supabase
          .from('wapi_messages')
          .select(`media_key, media_direct_path, media_url, message_type,
            conversation:wapi_conversations!inner(instance:wapi_instances!inner(instance_id, instance_token))`)
          .eq('message_id', msgId)
          .single();
        
        if (msgErr || !msg) {
          return new Response(JSON.stringify({ error: 'Mensagem não encontrada' }), {
            status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // If already has a Supabase URL, return it
        if (msg.media_url && msg.media_url.includes('supabase.co')) {
          return new Response(JSON.stringify({ success: true, url: msg.media_url, mimeType: 'application/octet-stream' }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Try to download from WhatsApp URL directly if available
        if (msg.media_url && (msg.media_url.includes('mmg.whatsapp.net') || msg.media_url.includes('w-api.app'))) {
          console.log('Trying direct download from WhatsApp URL:', msg.media_url.substring(0, 60));
          try {
            const directRes = await fetch(msg.media_url);
            if (directRes.ok) {
              const ct = directRes.headers.get('content-type') || 'application/octet-stream';
              const mimeType = ct.split(';')[0].trim();
              const buf = await directRes.arrayBuffer();
              
              if (buf.byteLength > 0) {
                const extMap: Record<string, string> = { 'image/jpeg': 'jpg', 'video/mp4': 'mp4', 'audio/ogg': 'ogg', 'application/pdf': 'pdf' };
                const ext = extMap[mimeType] || 'bin';
                const path = `received/downloads/${msgId}.${ext}`;
                
                const { error: upErr } = await supabase.storage.from('whatsapp-media').upload(path, buf, {
                  contentType: mimeType,
                  upsert: true,
                });
                
                if (!upErr) {
                  // Use signed URL for private bucket (7-day expiry)
                  const { data: signedUrlData } = await supabase.storage.from('whatsapp-media').createSignedUrl(path, 604800);
                  const signedUrl = signedUrlData?.signedUrl;
                  
                  if (signedUrl) {
                    await supabase.from('wapi_messages').update({ 
                      media_key: null, 
                      media_direct_path: null,
                      media_url: signedUrl 
                    }).eq('message_id', msgId);
                    
                    return new Response(JSON.stringify({ success: true, url: signedUrl, mimeType }), {
                      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    });
                  }
                }
              }
            }
          } catch (e) {
            console.log('Direct URL download failed, trying W-API:', e instanceof Error ? e.message : String(e));
          }
        }
        
        if (!msg.media_key || !msg.media_direct_path) {
          return new Response(JSON.stringify({ error: 'Mídia expirada ou indisponível', canRetry: false, hint: 'A mídia não pode mais ser baixada do WhatsApp' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const inst = (msg.conversation as { instance?: { instance_id: string; instance_token: string } })?.instance;
        const iId = inst?.instance_id || instance_id;
        const iToken = inst?.instance_token || instance_token;
        const msgType = msg.message_type || 'image';

        const mimeMap: Record<string, string> = { image: 'image/jpeg', video: 'video/mp4', audio: 'audio/ogg', document: 'application/pdf' };
        const extMap: Record<string, string> = { 'image/jpeg': 'jpg', 'video/mp4': 'mp4', 'audio/ogg': 'ogg', 'application/pdf': 'pdf' };

        // Call W-API download
        const dlRes = await fetch(`${WAPI_BASE_URL}/message/download-media?instanceId=${iId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${iToken}` },
          body: JSON.stringify({
            messageId: msgId,
            type: msgType,
            mimetype: mimeMap[msgType] || 'application/octet-stream',
            mediaKey: msg.media_key,
            directPath: msg.media_direct_path,
          }),
        });

        if (!dlRes.ok) {
          const txt = await dlRes.text();
          console.error('W-API download failed:', txt.substring(0, 200));
          return new Response(JSON.stringify({ error: 'Falha no download', details: txt.substring(0, 100), canRetry: true }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const dlData = await dlRes.json();
        const fileLink = dlData.fileLink || dlData.url || dlData.link;
        let base64 = dlData.base64 || dlData.data || dlData.media;
        let mimeType = dlData.mimetype || mimeMap[msgType] || 'application/octet-stream';

        // If fileLink, fetch it (with size limit to avoid memory issues)
        if (!base64 && fileLink) {
          console.log('Fetching fileLink:', fileLink);
          const fileRes = await fetch(fileLink);
          if (!fileRes.ok) {
            return new Response(JSON.stringify({ error: 'Falha ao baixar do fileLink', canRetry: true }), {
              status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const ct = fileRes.headers.get('content-type');
          if (ct) mimeType = ct.split(';')[0].trim();
          
          const buf = await fileRes.arrayBuffer();
          
          // For large files (>10MB), upload directly without base64
          if (buf.byteLength > 10 * 1024 * 1024) {
            const ext = extMap[mimeType] || 'bin';
            const path = `received/downloads/${msgId}.${ext}`;
            
            const { error: upErr } = await supabase.storage.from('whatsapp-media').upload(path, buf, {
              contentType: mimeType,
              upsert: true,
            });
            
            if (upErr) {
              console.error('Upload error:', upErr);
              return new Response(JSON.stringify({ error: 'Falha ao salvar mídia' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
            
            // Use signed URL for private bucket (7-day expiry)
            const { data: signedUrlData } = await supabase.storage.from('whatsapp-media').createSignedUrl(path, 604800);
            const signedUrl = signedUrlData?.signedUrl;
            
            if (signedUrl) {
              await supabase.from('wapi_messages').update({ 
                media_key: null, 
                media_direct_path: null,
                media_url: signedUrl 
              }).eq('message_id', msgId);
              
              return new Response(JSON.stringify({ success: true, url: signedUrl, mimeType }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          }
          
          // Smaller files: convert to base64 in chunks
          const bytes = new Uint8Array(buf);
          let bin = '';
          for (let i = 0; i < bytes.length; i += 32768) {
            const chunk = bytes.subarray(i, Math.min(i + 32768, bytes.length));
            bin += String.fromCharCode.apply(null, Array.from(chunk));
          }
          base64 = btoa(bin);
        }

        if (!base64) {
          return new Response(JSON.stringify({ error: 'Sem dados de mídia', canRetry: false }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Upload to storage
        const ext = extMap[mimeType] || 'bin';
        const path = `received/downloads/${msgId}.${ext}`;
        
        const binStr = atob(base64);
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
        
        const { error: upErr } = await supabase.storage.from('whatsapp-media').upload(path, bytes, {
          contentType: mimeType,
          upsert: true,
        });

        if (upErr) {
          console.error('Upload error:', upErr);
          return new Response(JSON.stringify({ error: 'Falha ao salvar mídia' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Use signed URL for private bucket (7-day expiry)
        const { data: signedUrlData } = await supabase.storage.from('whatsapp-media').createSignedUrl(path, 604800);
        const signedUrl = signedUrlData?.signedUrl;
        
        if (!signedUrl) {
          return new Response(JSON.stringify({ error: 'Falha ao gerar URL assinada' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        await supabase.from('wapi_messages').update({ 
          media_key: null, 
          media_direct_path: null,
          media_url: signedUrl 
        }).eq('message_id', msgId);
        
        return new Response(JSON.stringify({ success: true, url: signedUrl, mimeType }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'disconnect': {
        try {
          // Try multiple W-API disconnect/logout endpoints
          const endpoints = [
            { url: `${WAPI_BASE_URL}/instance/logout?instanceId=${instance_id}`, method: 'DELETE' },
            { url: `${WAPI_BASE_URL}/instance/logout?instanceId=${instance_id}`, method: 'POST' },
            { url: `${WAPI_BASE_URL}/instance/disconnect?instanceId=${instance_id}`, method: 'DELETE' },
            { url: `${WAPI_BASE_URL}/instance/disconnect?instanceId=${instance_id}`, method: 'POST' },
          ];

          let disconnected = false;
          for (const ep of endpoints) {
            try {
              const res = await fetch(ep.url, {
                method: ep.method,
                headers: { 'Authorization': `Bearer ${instance_token}`, 'Content-Type': 'application/json' },
              });
              console.log(`disconnect ${ep.method} ${ep.url.split('?')[0].split('/').pop()} response:`, res.status);
              if (res.ok) {
                const data = await res.json().catch(() => ({}));
                console.log('disconnect success data:', JSON.stringify(data));
                disconnected = true;
                break;
              }
            } catch (fetchErr) {
              console.warn(`disconnect endpoint failed:`, fetchErr);
            }
          }

          // Even if W-API endpoints all fail, update local DB status so user can reconnect with new number
          if (!disconnected) {
            console.warn(`disconnect: all W-API endpoints returned non-OK for ${instance_id}. Forcing local disconnect.`);
          }

          // Always update DB to disconnected — allows user to reconnect
          await supabase
            .from('wapi_instances')
            .update({ status: 'disconnected', connected_at: null, phone_number: null })
            .eq('instance_id', instance_id);

          return new Response(JSON.stringify({ 
            success: true, 
            message: disconnected ? 'Desconectado com sucesso' : 'Desconectado localmente (W-API indisponível)',
            forced: !disconnected,
          }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (e) {
          console.error('disconnect error:', e);
          return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro ao desconectar' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'edit-text': {
        // Edit a sent message - fallback: delete original + send new
        const { messageId: editMsgId, newContent, conversationId: editConvId } = body;
        
        if (!editMsgId || !newContent) {
          return new Response(JSON.stringify({ error: 'messageId e newContent são obrigatórios' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Try W-API edit endpoint first
        const editRes = await wapiRequest(
          `${WAPI_BASE_URL}/message/edit?instanceId=${instance_id}`,
          instance_token,
          'PUT',
          { messageId: editMsgId, text: newContent }
        );

        if (editRes.ok) {
          // Edit succeeded - update DB
          await supabase.from('wapi_messages')
            .update({ content: newContent })
            .eq('message_id', editMsgId);

          return new Response(JSON.stringify({ success: true, method: 'edit' }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Fallback: delete + resend
        console.log('Edit not supported, falling back to delete+resend');
        
        // Try to delete the original message
        const deleteRes = await wapiRequest(
          `${WAPI_BASE_URL}/message/delete?instanceId=${instance_id}`,
          instance_token,
          'DELETE',
          { messageId: editMsgId, forEveryone: true }
        );

        if (!deleteRes.ok) {
          console.warn('Delete failed:', deleteRes.error, '- sending new message anyway');
        }

        // Send the new message
        const resendRes = await wapiRequest(
          `${WAPI_BASE_URL}/message/send-text?instanceId=${instance_id}`,
          instance_token,
          'POST',
          { phone, message: newContent }
        );

        if (!resendRes.ok) {
          return new Response(JSON.stringify({ error: resendRes.error || 'Falha ao reenviar mensagem' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const newMsgId = (resendRes.data as { messageId?: string })?.messageId;

        // Update message in DB
        await supabase.from('wapi_messages')
          .update({ content: newContent, message_id: newMsgId || editMsgId })
          .eq('message_id', editMsgId);

        // Update conversation preview
        if (editConvId) {
          await supabase.from('wapi_conversations').update({
            last_message_content: newContent.substring(0, 100),
          }).eq('id', editConvId);
        }

        return new Response(JSON.stringify({ success: true, method: 'delete-resend', messageId: newMsgId }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'repair-session': {
        // Repair a degraded instance by trying to extract phone from alternative endpoints
        // or accepting a manual phone number from the user
        const { manualPhone } = body;
        
        console.log(`[repair-session] Attempting repair for instance ${instance_id}, manualPhone=${manualPhone || 'none'}`);

        let extractedPhone: string | null = null;
        let source = 'none';

        // If manual phone provided, validate and use it
        if (manualPhone) {
          const cleaned = String(manualPhone).replace(/\D/g, '');
          if (cleaned.length >= 11 && cleaned.length <= 13) {
            extractedPhone = cleaned;
            source = 'manual';
            console.log(`[repair-session] Using manual phone: ${extractedPhone}`);
          } else {
            console.warn(`[repair-session] Invalid manual phone format: ${manualPhone}`);
            return new Response(JSON.stringify({ 
              repaired: false, 
              reason: 'Formato inválido. Use o número completo com DDI+DDD (ex: 5534991234567).' 
            }), {
              status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // If no manual phone, try alternative endpoints
        if (!extractedPhone) {
          const safeFetch = async (url: string) => {
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 8000);
              const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${instance_token}` },
                signal: controller.signal,
              });
              clearTimeout(timeout);
              return res;
            } catch {
              return null;
            }
          };

          // Try /instance/me (sometimes available on LITE)
          const meRes = await safeFetch(`${WAPI_BASE_URL}/instance/me?instanceId=${instance_id}`);
          if (meRes?.ok) {
            try {
              const meData = await meRes.json();
              console.log(`[repair-session] /instance/me data:`, JSON.stringify(meData).substring(0, 300));
              extractedPhone = meData.id?.split('@')[0] || meData.phone || meData.phoneNumber || meData.wid?.user || null;
              if (extractedPhone) source = 'auto:me';
            } catch {}
          }

          // Try /instance/qr-code for phone field
          if (!extractedPhone) {
            const qrRes = await safeFetch(`${WAPI_BASE_URL}/instance/qr-code?instanceId=${instance_id}`);
            if (qrRes?.ok) {
              try {
                const qrData = await qrRes.json();
                console.log(`[repair-session] /instance/qr-code data:`, JSON.stringify(qrData).substring(0, 300));
                extractedPhone = qrData.phone || qrData.phoneNumber || qrData.me?.id?.split('@')[0] || null;
                if (extractedPhone) source = 'auto:qr';
              } catch {}
            }
          }

          // Try /instance/status
          if (!extractedPhone) {
            const statusRes = await safeFetch(`${WAPI_BASE_URL}/instance/status?instanceId=${instance_id}`);
            if (statusRes?.ok) {
              try {
                const statusData = await statusRes.json();
                console.log(`[repair-session] /instance/status data:`, JSON.stringify(statusData).substring(0, 300));
                extractedPhone = statusData.me?.id?.split('@')[0] || statusData.phoneNumber || statusData.phone || null;
                if (extractedPhone) source = 'auto:status';
              } catch {}
            }
          }

          // Try /instance/profile
          if (!extractedPhone) {
            const profileRes = await safeFetch(`${WAPI_BASE_URL}/instance/profile?instanceId=${instance_id}`);
            if (profileRes?.ok) {
              try {
                const profileData = await profileRes.json();
                console.log(`[repair-session] /instance/profile data:`, JSON.stringify(profileData).substring(0, 300));
                extractedPhone = profileData.id?.split('@')[0] || profileData.phone || profileData.wid?.user || null;
                if (extractedPhone) source = 'auto:profile';
              } catch {}
            }
          }
        }

        if (extractedPhone) {
          // Clean the phone number
          const cleanPhone = extractedPhone.replace(/\D/g, '');
          
          // Update DB: set status to connected and fill phone_number
          const { error: updateError } = await supabase
            .from('wapi_instances')
            .update({ 
              status: 'connected', 
              phone_number: cleanPhone,
              connected_at: new Date().toISOString(),
            })
            .eq('instance_id', instance_id);

          if (updateError) {
            console.error(`[repair-session] DB update failed:`, updateError);
            return new Response(JSON.stringify({ 
              repaired: false, 
              reason: 'Erro ao atualizar banco de dados.' 
            }), {
              status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          console.log(`[repair-session] SUCCESS for ${instance_id}, phone=${cleanPhone}, source=${source}`);
          return new Response(JSON.stringify({ 
            repaired: true, 
            phoneNumber: cleanPhone,
            source,
          }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Could not extract phone automatically
        console.log(`[repair-session] FAILED for ${instance_id}, no phone found from any endpoint`);
        return new Response(JSON.stringify({ 
          repaired: false, 
          reason: 'Não foi possível extrair o número automaticamente. Informe o número manualmente (visível no painel W-API).',
          needsManualPhone: true,
        }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'restart-instance': {
        // Restart the W-API instance to refresh the cryptographic session
        // This fixes "Aguardando mensagem" caused by stale E2E encryption keys
        console.log(`[restart-instance] Attempting restart for instance ${instance_id}`);

        const restartEndpoints = [
          { url: `${WAPI_BASE_URL}/instance/restart?instanceId=${instance_id}`, method: 'POST' },
          { url: `${WAPI_BASE_URL}/instance/restart?instanceId=${instance_id}`, method: 'PUT' },
          { url: `${WAPI_BASE_URL}/instance/reboot?instanceId=${instance_id}`, method: 'POST' },
          { url: `${WAPI_BASE_URL}/instance/reboot?instanceId=${instance_id}`, method: 'GET' },
          { url: `${WAPI_BASE_URL}/instance/restart?instanceId=${instance_id}`, method: 'GET' },
        ];

        let restartSuccess = false;
        let restartEndpointUsed = '';

        for (const ep of restartEndpoints) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const res = await fetch(ep.url, {
              method: ep.method,
              headers: {
                'Authorization': `Bearer ${instance_token}`,
                'Content-Type': 'application/json',
              },
              signal: controller.signal,
            });
            clearTimeout(timeout);

            const contentType = res.headers.get('content-type');
            let resBody = '';
            if (contentType?.includes('application/json')) {
              const json = await res.json();
              resBody = JSON.stringify(json).substring(0, 300);
            } else {
              resBody = await res.text().then(t => t.substring(0, 200));
            }

            console.log(`[restart-instance] ${ep.method} ${ep.url.split('?')[0].split('/').pop()} => status=${res.status}, body=${resBody}`);

            if (res.ok) {
              restartSuccess = true;
              restartEndpointUsed = `${ep.method} ${ep.url.split('?')[0].split('/').pop()}`;
              break;
            }
          } catch (e) {
            console.warn(`[restart-instance] ${ep.method} ${ep.url.split('?')[0].split('/').pop()} failed:`, e instanceof Error ? e.message : e);
          }
        }

        if (restartSuccess) {
          console.log(`[restart-instance] SUCCESS via ${restartEndpointUsed}. Waiting 3s before verifying...`);
          
          // Wait 3 seconds for the instance to restart
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Verify status after restart
          let verifiedConnected = false;
          let verifiedPhone: string | null = null;

          try {
            const verifyRes = await fetch(`${WAPI_BASE_URL}/instance/qr-code?instanceId=${instance_id}`, {
              headers: { 'Authorization': `Bearer ${instance_token}` },
            });
            if (verifyRes.ok) {
              const verifyData = await verifyRes.json();
              console.log(`[restart-instance] Post-restart verify:`, JSON.stringify(verifyData).substring(0, 300));
              verifiedConnected = verifyData.connected === true;
              verifiedPhone = verifyData.phone || verifyData.phoneNumber || verifyData.me?.id?.split('@')[0] || null;
            }
          } catch (e) {
            console.warn(`[restart-instance] Post-restart verify failed:`, e);
          }

          // Update DB
          if (verifiedConnected) {
            const updateData: Record<string, unknown> = { 
              status: 'connected', 
              connected_at: new Date().toISOString() 
            };
            if (verifiedPhone) {
              updateData.phone_number = verifiedPhone.replace(/\D/g, '');
            }
            await supabase
              .from('wapi_instances')
              .update(updateData)
              .eq('instance_id', instance_id);
          }

          return new Response(JSON.stringify({ 
            success: true, 
            restarted: true,
            connected: verifiedConnected,
            phoneNumber: verifiedPhone,
            endpoint: restartEndpointUsed,
          }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // All restart endpoints failed
        console.log(`[restart-instance] FAILED for ${instance_id}, no endpoint worked`);
        return new Response(JSON.stringify({ 
          success: false, 
          restarted: false,
          reason: 'Nenhum endpoint de restart respondeu. Desconecte e reconecte a instância manualmente.',
        }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'send-reaction': {
        const { messageId: reactionMsgId, emoji } = body;
        
        if (!reactionMsgId || !emoji) {
          return new Response(JSON.stringify({ error: 'messageId e emoji são obrigatórios' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`send-reaction: msgId=${reactionMsgId}, emoji=${emoji}, phone=${phone}, instance=${instance_id}`);

        const reactionBody = { phone, messageId: reactionMsgId, emoji };
        
        // Try multiple endpoint/method combinations since W-API versions differ
        const attempts = [
          { url: `${WAPI_BASE_URL}/message/send-reaction?instanceId=${instance_id}`, method: 'POST' },
          { url: `${WAPI_BASE_URL}/message/sendReaction?instanceId=${instance_id}`, method: 'POST' },
          { url: `${WAPI_BASE_URL}/message/send-reaction?instanceId=${instance_id}`, method: 'PUT' },
          { url: `${WAPI_BASE_URL}/message/sendReaction?instanceId=${instance_id}`, method: 'PUT' },
        ];

        let lastStatus = 0;
        let lastBody = '';

        for (const attempt of attempts) {
          try {
            const res = await fetch(attempt.url, {
              method: attempt.method,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${instance_token}`,
              },
              body: JSON.stringify(reactionBody),
            });
            const text = await res.text();
            console.log(`send-reaction ${attempt.method} ${attempt.url} => status=${res.status}, body=${text.slice(0, 200)}`);
            
            if (res.ok) {
              return new Response(JSON.stringify({ success: true }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
            lastStatus = res.status;
            lastBody = text;
          } catch (e) {
            console.error(`send-reaction ${attempt.method} error:`, e);
          }
        }

        // All attempts failed
        let errorMsg = 'Reações não disponíveis neste plano da W-API';
        try {
          const parsed = JSON.parse(lastBody);
          if (parsed.message || parsed.error) {
            errorMsg = parsed.message || parsed.error;
          }
        } catch {}
        
        console.error(`send-reaction: all attempts failed. lastStatus=${lastStatus}`);
        
        return new Response(JSON.stringify({ error: errorMsg }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Ação desconhecida: ${action}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('wapi-send error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
