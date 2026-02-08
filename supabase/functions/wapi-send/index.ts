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

    console.log('wapi-send:', action, phone ? `phone:${phone}` : '');

    switch (action) {
      case 'send-text': {
        const res = await wapiRequest(
          `${WAPI_BASE_URL}/message/send-text?instanceId=${instance_id}`,
          instance_token,
          'POST',
          { phone, message }
        );
        
        if (!res.ok) {
          return new Response(JSON.stringify({ error: res.error }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const messageId = (res.data as { messageId?: string })?.messageId;
        
        if (conversationId) {
          await supabase.from('wapi_messages').insert({
            conversation_id: conversationId,
            message_id: messageId,
            from_me: true,
            message_type: 'text',
            content: message,
            status: 'sent',
            timestamp: new Date().toISOString(),
          });
          await supabase.from('wapi_conversations').update({ 
            last_message_at: new Date().toISOString(),
            last_message_content: message.substring(0, 100),
            last_message_from_me: true,
          }).eq('id', conversationId);
        }

        return new Response(JSON.stringify({ success: true, messageId }), {
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

      case 'get-status': {
        try {
          // Try the instance info endpoint first (more reliable)
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
              const isConnected = infoData.connected === true || 
                                  infoData.status === 'connected' ||
                                  infoData.state === 'connected' ||
                                  infoData.phone?.connected === true ||
                                  (infoData.me && infoData.me.id);
              
              const phoneNumber = infoData.phone?.number || 
                                  infoData.phone?.wid?.user ||
                                  infoData.me?.id?.split('@')[0] ||
                                  infoData.phoneNumber ||
                                  null;
              
              if (isConnected) {
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
          
          // Fallback to QR code endpoint to check status
          const qrRes = await fetch(`${WAPI_BASE_URL}/instance/qr-code?instanceId=${instance_id}`, {
            headers: { 'Authorization': `Bearer ${instance_token}` },
          });
          
          console.log('get-status qr response:', qrRes.status);
          
          const ct = qrRes.headers.get('content-type');
          if (ct?.includes('text/html') || !qrRes.ok) {
            return new Response(JSON.stringify({ status: 'disconnected' }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          const data = await qrRes.json();
          console.log('get-status qr data:', JSON.stringify(data));
          
          return new Response(JSON.stringify({ 
            status: data.connected ? 'connected' : 'disconnected',
            phoneNumber: data.phone || data.phoneNumber || null,
            connected: data.connected === true,
          }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (e) {
          console.error('get-status error:', e);
          return new Response(JSON.stringify({ status: 'disconnected', error: e instanceof Error ? e.message : 'Unknown error' }), {
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
