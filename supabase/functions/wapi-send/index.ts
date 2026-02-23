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
  body: { instanceId?: string; instanceToken?: string; unit?: string }
): Promise<{ instance_id: string; instance_token: string } | Response> {
  const { instanceId, instanceToken, unit } = body;
  
  // Direct credentials provided
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
  
  // Authenticated user flow
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
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

    switch (action) {
      case 'send-text': {
        console.log('send-text: sending message to', phone);
        const res = await wapiRequest(
          `${WAPI_BASE_URL}/message/send-text?instanceId=${instance_id}`,
          instance_token,
          'POST',
          { phone, message }
        );
        
        console.log('send-text response:', JSON.stringify(res));
        
        if (!res.ok) {
          console.error('send-text failed:', res.error);
          return new Response(JSON.stringify({ error: res.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const messageId = (res.data as { messageId?: string })?.messageId;
        
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

        return new Response(JSON.stringify({ success: true, messageId, conversationId: resolvedConvId }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'send-image': {
        const { base64, caption, mediaUrl } = body;
        
        let imageBase64 = base64;
        if (!imageBase64 && mediaUrl) {
          const imgRes = await fetch(mediaUrl);
          if (!imgRes.ok) {
            return new Response(JSON.stringify({ error: 'Falha ao baixar imagem' }), {
              status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          const buf = await imgRes.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let bin = '';
          for (let i = 0; i < bytes.length; i += 32768) {
            const chunk = bytes.subarray(i, Math.min(i + 32768, bytes.length));
            bin += String.fromCharCode.apply(null, Array.from(chunk));
          }
          const ct = imgRes.headers.get('content-type') || 'image/jpeg';
          imageBase64 = `data:${ct};base64,${btoa(bin)}`;
        }
        
        if (!imageBase64) {
          return new Response(JSON.stringify({ error: 'Imagem é obrigatória' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        if (!imageBase64.startsWith('data:')) {
          imageBase64 = `data:image/jpeg;base64,${imageBase64}`;
        }

        const res = await wapiRequest(
          `${WAPI_BASE_URL}/message/send-image?instanceId=${instance_id}`,
          instance_token,
          'POST',
          { phone, image: imageBase64, caption: caption || '' }
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
          // Strategy: Try multiple endpoints in order of reliability
          // W-API Lite instances may not support all endpoints
          // Priority order:
          // 1. /instance/status - simple status check
          // 2. /instance/info - usually available on all plans
          // 3. /instance/connection-state - more detailed but may 404
          // 4. /instance/profile - connected if returns profile
          // 5. /instance/qr-code - fallback, connected if no qrcode returned

          // Try simple status endpoint first (may work on Lite plans)
          const statusRes = await fetch(`${WAPI_BASE_URL}/instance/status?instanceId=${instance_id}`, {
            headers: { 'Authorization': `Bearer ${instance_token}` },
          });
          
          console.log('get-status status response:', statusRes.status);
          
          if (statusRes.ok) {
            const ct = statusRes.headers.get('content-type');
            if (ct?.includes('application/json')) {
              const statusData = await statusRes.json();
              console.log('get-status status data:', JSON.stringify(statusData));
              
              // Check various connection indicators
              const isConnected = statusData.state === 'open' || 
                                  statusData.state === 'connected' ||
                                  statusData.status === 'open' ||
                                  statusData.status === 'connected' ||
                                  statusData.connected === true ||
                                  statusData.loggedIn === true;
              
              if (isConnected) {
                const phoneNumber = statusData.me?.id?.split('@')[0] || 
                                   statusData.phoneNumber || 
                                   statusData.phone ||
                                   null;
                return new Response(JSON.stringify({ 
                  status: 'connected',
                  phoneNumber,
                  connected: true,
                }), {
                  status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }
            }
          }
          
          // Try instance info endpoint (most reliable across all plans)
          const infoRes = await fetch(`${WAPI_BASE_URL}/instance/info?instanceId=${instance_id}`, {
            headers: { 'Authorization': `Bearer ${instance_token}` },
          });
          
          console.log('get-status info response:', infoRes.status);
          
          if (infoRes.ok) {
            const ct = infoRes.headers.get('content-type');
            if (ct?.includes('application/json')) {
              const infoData = await infoRes.json();
              console.log('get-status info data:', JSON.stringify(infoData));
              
              // Check various connection indicators
              const isConnected = infoData.state === 'open' || 
                                  infoData.state === 'connected' ||
                                  infoData.status === 'connected' ||
                                  infoData.connected === true ||
                                  infoData.connectionState === 'open' ||
                                  infoData.me?.id; // Has a logged in user = connected
              
              if (isConnected) {
                const phoneNumber = infoData.me?.id?.split('@')[0] || 
                                   infoData.phoneNumber || 
                                   infoData.phone ||
                                   infoData.wid?.user ||
                                   null;
                return new Response(JSON.stringify({ 
                  status: 'connected',
                  phoneNumber,
                  connected: true,
                }), {
                  status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }
            }
          }
          
          // Try connection state endpoint
          const stateRes = await fetch(`${WAPI_BASE_URL}/instance/connection-state?instanceId=${instance_id}`, {
            headers: { 'Authorization': `Bearer ${instance_token}` },
          });
          
          console.log('get-status connection-state response:', stateRes.status);
          
          if (stateRes.ok) {
            const ct = stateRes.headers.get('content-type');
            if (ct?.includes('application/json')) {
              const stateData = await stateRes.json();
              console.log('get-status connection-state data:', JSON.stringify(stateData));
              
              const isConnected = stateData.state === 'open' || 
                                  stateData.state === 'connected' ||
                                  stateData.connected === true ||
                                  stateData.status === 'connected';
              
              if (isConnected) {
                return new Response(JSON.stringify({ 
                  status: 'connected',
                  phoneNumber: stateData.phoneNumber || stateData.phone || null,
                  connected: true,
                }), {
                  status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }
            }
          }
          
          // Try profile endpoint (has profile = connected)
          const profileRes = await fetch(`${WAPI_BASE_URL}/instance/profile?instanceId=${instance_id}`, {
            headers: { 'Authorization': `Bearer ${instance_token}` },
          });
          
          console.log('get-status profile response:', profileRes.status);
          
          if (profileRes.ok) {
            const ct = profileRes.headers.get('content-type');
            if (ct?.includes('application/json')) {
              const profileData = await profileRes.json();
              console.log('get-status profile data:', JSON.stringify(profileData));
              
              if (profileData.id || profileData.phone || profileData.wid || profileData.name) {
                const phoneNumber = profileData.id?.split('@')[0] || 
                                   profileData.phone ||
                                   profileData.wid?.user ||
                                   null;
                return new Response(JSON.stringify({ 
                  status: 'connected',
                  phoneNumber,
                  connected: true,
                }), {
                  status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }
            }
          }
          
          // Fallback to QR code endpoint - this is the most reliable indicator
          // If QR code endpoint returns a qrcode, we're disconnected
          // If it says connected or has no qrcode, we're connected
          const qrRes = await fetch(`${WAPI_BASE_URL}/instance/qr-code?instanceId=${instance_id}`, {
            headers: { 'Authorization': `Bearer ${instance_token}` },
          });
          
          console.log('get-status qr response:', qrRes.status);
          
          const ct = qrRes.headers.get('content-type');
          if (ct?.includes('text/html') || !qrRes.ok) {
            return new Response(JSON.stringify({ status: 'disconnected', connected: false }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const data = await qrRes.json();
          console.log('get-status qr data:', JSON.stringify(data));
          
          // Check for explicit connected flag
          if (data.connected === true) {
            return new Response(JSON.stringify({ 
              status: 'connected',
              phoneNumber: data.phone || data.phoneNumber || null,
              connected: true,
            }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          // Check if there's a QR code present - means not connected
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
          
          // No QR code and no error - likely connected
          if (!data.error) {
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
          return new Response(JSON.stringify({ status: 'disconnected', connected: false, error: e instanceof Error ? e.message : 'Unknown error' }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      case 'get-qr': {
        try {
          const res = await fetch(
            `${WAPI_BASE_URL}/instance/qr-code?instanceId=${instance_id}&image=enable`,
            { headers: { 'Authorization': `Bearer ${instance_token}` } }
          );
          
          if (!res.ok) {
            return new Response(JSON.stringify({ error: `Erro: ${res.status}` }), {
              status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
              status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        
        const res = await fetch(`${WAPI_BASE_URL}/instance/webhooks?instanceId=${instance_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instance_token}` },
          body: JSON.stringify(config),
        });
        
        const data = await res.json();
        return new Response(JSON.stringify({ success: !data.error, result: data }), {
          status: res.ok ? 200 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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
          // Try logout endpoint
          const logoutRes = await fetch(
            `${WAPI_BASE_URL}/instance/logout?instanceId=${instance_id}`,
            { 
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${instance_token}` },
            }
          );
          
          console.log('disconnect logout response:', logoutRes.status);
          
          if (logoutRes.ok) {
            const data = await logoutRes.json().catch(() => ({}));
            console.log('disconnect logout data:', JSON.stringify(data));
            return new Response(JSON.stringify({ success: true, message: 'Desconectado com sucesso' }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          // Fallback: try POST method
          const postRes = await fetch(
            `${WAPI_BASE_URL}/instance/logout?instanceId=${instance_id}`,
            { 
              method: 'POST',
              headers: { 'Authorization': `Bearer ${instance_token}`, 'Content-Type': 'application/json' },
            }
          );
          
          console.log('disconnect POST logout response:', postRes.status);
          
          if (postRes.ok) {
            return new Response(JSON.stringify({ success: true, message: 'Desconectado com sucesso' }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          return new Response(JSON.stringify({ error: 'Não foi possível desconectar a instância' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

      case 'send-reaction': {
        const { messageId: reactionMsgId, emoji } = body;
        
        if (!reactionMsgId || !emoji) {
          return new Response(JSON.stringify({ error: 'messageId e emoji são obrigatórios' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`send-reaction: msgId=${reactionMsgId}, emoji=${emoji}, phone=${phone}`);

        // Try POST method (W-API v1 standard)
        const res = await wapiRequest(
          `${WAPI_BASE_URL}/message/send-reaction?instanceId=${instance_id}`,
          instance_token,
          'POST',
          { phone, messageId: reactionMsgId, emoji }
        );

        console.log(`send-reaction response: ok=${res.ok}, error=${res.error}, data=${JSON.stringify(res.data)}`);

        if (!res.ok) {
          return new Response(JSON.stringify({ error: res.error }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
