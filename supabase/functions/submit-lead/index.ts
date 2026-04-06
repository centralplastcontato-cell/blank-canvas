import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple in-memory rate limiting (resets on function restart)
// In production, consider using Redis or a database table
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_REQUESTS_PER_WINDOW = 5; // 5 leads per hour per phone number

function isRateLimited(phone: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(phone);
  
  if (!record) {
    rateLimitMap.set(phone, { count: 1, windowStart: now });
    return false;
  }
  
  // Reset window if expired
  if (now - record.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(phone, { count: 1, windowStart: now });
    return false;
  }
  
  // Check if limit exceeded
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  // Increment count
  record.count++;
  return false;
}

// Validation functions
function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Nome é obrigatório' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Nome deve ter pelo menos 2 caracteres' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Nome deve ter no máximo 100 caracteres' };
  }
  // Check for suspicious patterns
  if (/[<>{}]/.test(trimmed)) {
    return { valid: false, error: 'Nome contém caracteres inválidos' };
  }
  return { valid: true };
}

function validateWhatsApp(phone: string): { valid: boolean; error?: string; normalized?: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'WhatsApp é obrigatório' };
  }
  // Remove non-digits
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return { valid: false, error: 'Número de WhatsApp inválido' };
  }
  return { valid: true, normalized: digits };
}

function validateCampaignId(campaignId: string): { valid: boolean; error?: string } {
  if (!campaignId || typeof campaignId !== 'string') {
    return { valid: false, error: 'ID da campanha é obrigatório' };
  }
  if (campaignId.length > 100) {
    return { valid: false, error: 'ID da campanha inválido' };
  }
  return { valid: true };
}

function validateUnit(unit: string | null): { valid: boolean; error?: string } {
  if (!unit) return { valid: true }; // Optional
  if (typeof unit !== 'string' || unit.length > 100) {
    return { valid: false, error: 'Unidade inválida' };
  }
  return { valid: true };
}

function validateMonth(month: string | null): { valid: boolean; error?: string } {
  if (!month) return { valid: true }; // Optional
  const validMonths = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  // Support month with year suffix like "Março/27" or "Março/2027"
  const monthName = month.split('/')[0].trim();
  if (!validMonths.includes(monthName)) {
    return { valid: false, error: 'Mês inválido' };
  }
  return { valid: true };
}

function validateDayOfMonth(day: number | null): { valid: boolean; error?: string } {
  if (day === null || day === undefined) return { valid: true }; // Optional
  if (typeof day !== 'number' || day < 1 || day > 31) {
    return { valid: false, error: 'Dia do mês inválido' };
  }
  return { valid: true };
}

function validateGuests(guests: string | null): { valid: boolean; error?: string } {
  if (!guests) return { valid: true }; // Optional
  if (typeof guests !== 'string' || guests.length > 50) {
    return { valid: false, error: 'Número de convidados inválido' };
  }
  return { valid: true };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { name, whatsapp, unit, month, day_of_month, guests, campaign_id, campaign_name, company_id, status: customStatus, observacoes } = body;

    // Validate all inputs
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      return new Response(
        JSON.stringify({ error: nameValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const whatsappValidation = validateWhatsApp(whatsapp);
    if (!whatsappValidation.valid) {
      return new Response(
        JSON.stringify({ error: whatsappValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const campaignValidation = validateCampaignId(campaign_id);
    if (!campaignValidation.valid) {
      return new Response(
        JSON.stringify({ error: campaignValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate company_id (required)
    if (!company_id || typeof company_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'ID da empresa é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const unitValidation = validateUnit(unit);
    if (!unitValidation.valid) {
      return new Response(
        JSON.stringify({ error: unitValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const monthValidation = validateMonth(month);
    if (!monthValidation.valid) {
      return new Response(
        JSON.stringify({ error: monthValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dayValidation = validateDayOfMonth(day_of_month);
    if (!dayValidation.valid) {
      return new Response(
        JSON.stringify({ error: dayValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const guestsValidation = validateGuests(guests);
    if (!guestsValidation.valid) {
      return new Response(
        JSON.stringify({ error: guestsValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting by phone number
    const normalizedPhone = whatsappValidation.normalized!;

    // Resolve lead routing (which WhatsApp instance should receive this lead)
    let resolvedUnit = unit || null;
    if (company_id) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabaseEarly = createClient(supabaseUrl, supabaseServiceKey);

        const { data: routingSettings } = await supabaseEarly
          .from('lp_bot_settings')
          .select('lead_routing_mode, lead_routing_counter')
          .eq('company_id', company_id)
          .maybeSingle();

        if (routingSettings) {
          const mode = routingSettings.lead_routing_mode || 'auto';

          // Fetch the actual active units for THIS company (not hardcoded names)
          const { data: companyUnits } = await supabaseEarly
            .from('wapi_instances')
            .select('unit')
            .eq('company_id', company_id)
            .eq('status', 'connected')
            .order('created_at', { ascending: true });

          const activeUnits = (companyUnits || []).map((u: { unit: string }) => u.unit).filter(Boolean);

          if (activeUnits.length === 0) {
            // No active instances — keep original unit
            console.log(`No active instances for company ${company_id}, keeping original unit`);
          } else if (activeUnits.length === 1) {
            // Single instance — always route there
            resolvedUnit = activeUnits[0];
          } else {
            // Multiple instances — check routing mode
            if (mode === 'auto') {
              // Round-robin across all active units
              const counter = routingSettings.lead_routing_counter || 0;
              resolvedUnit = activeUnits[counter % activeUnits.length];
              await supabaseEarly
                .from('lp_bot_settings')
                .update({ lead_routing_counter: counter + 1 })
                .eq('company_id', company_id);
            } else if (mode.includes(',')) {
              // Multi-unit selection (comma-separated) — round-robin only among selected
              const selectedUnits = mode.split(',').filter((u: string) => activeUnits.includes(u));
              if (selectedUnits.length > 0) {
                const counter = routingSettings.lead_routing_counter || 0;
                resolvedUnit = selectedUnits[counter % selectedUnits.length];
                await supabaseEarly
                  .from('lp_bot_settings')
                  .update({ lead_routing_counter: counter + 1 })
                  .eq('company_id', company_id);
              } else {
                resolvedUnit = activeUnits[0];
              }
            } else {
              // Single unit mode — check if mode matches a specific unit name
              const fixedUnit = activeUnits.find((u: string) => u.toLowerCase().replace(/\s+/g, '') === mode.toLowerCase().replace(/\s+/g, ''));
              if (fixedUnit) {
                resolvedUnit = fixedUnit;
              } else {
                // Unknown mode — default to first unit
                resolvedUnit = activeUnits[0];
              }
            }
          }
        }
      } catch (routingErr) {
        console.error('Error resolving lead routing:', routingErr);
        // Non-blocking — fall back to original unit
      }
    }

    if (isRateLimited(normalizedPhone)) {
      console.log(`Rate limit exceeded for phone: ${normalizedPhone}`);
      return new Response(
        JSON.stringify({ error: 'Muitas solicitações. Tente novamente mais tarde.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if lead already exists
    const { data: existingLead } = await supabase
      .from('campaign_leads')
      .select('id, name, unit, month, day_of_month, guests, status')
      .eq('whatsapp', normalizedPhone)
      .eq('company_id', company_id)
      .limit(1)
      .maybeSingle();

    let leadId: string;

    if (existingLead) {
      // Lead already exists — update created_at to move to top + log return in history
      leadId = existingLead.id;
      const newData = {
        name: name.trim(),
        unit: resolvedUnit || unit || null,
        month: month || null,
        day_of_month: day_of_month || null,
        guests: guests || null,
        campaign_name: campaign_name || null,
        created_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('campaign_leads')
        .update(newData)
        .eq('id', existingLead.id);

      if (updateError) {
        console.error('Error updating returning lead:', updateError);
      }

      // Build a summary of what changed
      const changes: string[] = [];
      if (name.trim() !== existingLead.name) changes.push(`Nome: ${existingLead.name} → ${name.trim()}`);
      if ((unit || null) !== existingLead.unit) changes.push(`Unidade: ${existingLead.unit || '-'} → ${unit || '-'}`);
      if ((month || null) !== existingLead.month) changes.push(`Mês: ${existingLead.month || '-'} → ${month || '-'}`);
      if ((day_of_month || null) !== existingLead.day_of_month) changes.push(`Dia: ${existingLead.day_of_month || '-'} → ${day_of_month || '-'}`);
      if ((guests || null) !== existingLead.guests) changes.push(`Convidados: ${existingLead.guests || '-'} → ${guests || '-'}`);

      const changeSummary = changes.length > 0 ? changes.join(' | ') : 'Mesmos dados';

      // Add history entry for the return
      await supabase.from('lead_history').insert({
        lead_id: existingLead.id,
        company_id: company_id,
        user_id: null,
        user_name: 'Sistema',
        action: 'Lead retornou pela Landing Page',
        old_value: `Status atual: ${existingLead.status}`,
        new_value: changeSummary,
      });

      console.log(`Returning lead updated: ${name.trim()} - ${normalizedPhone} (company: ${company_id})`);
    } else {
      // New lead — insert and retrieve the ID
      const { data: newLead, error: insertError } = await supabase
        .from('campaign_leads')
        .insert({
          name: name.trim(),
          whatsapp: normalizedPhone,
          unit: resolvedUnit || unit || null,
          month: month || null,
          day_of_month: day_of_month || null,
          guests: guests || null,
          campaign_id: campaign_id,
          campaign_name: campaign_name || null,
          status: customStatus || 'novo',
          company_id: company_id,
          observacoes: observacoes || null,
        })
        .select('id')
        .single();

      if (insertError || !newLead) {
        console.error('Error inserting lead:', insertError);
        return new Response(
          JSON.stringify({ error: 'Erro ao salvar. Tente novamente.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      leadId = newLead.id;
      console.log(`New lead created: ${name.trim()} - ${normalizedPhone} (company: ${company_id})`);
    }

    // Link lead to existing WhatsApp conversation (if any)
    try {
      const { data: conversation } = await supabase
        .from('wapi_conversations')
        .select('id')
        .like('phone', `%${normalizedPhone}`)
        .eq('company_id', company_id)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (conversation) {
        const { error: linkError } = await supabase
          .from('wapi_conversations')
          .update({ lead_id: leadId, contact_name: name.trim() })
          .eq('id', conversation.id);

        if (linkError) {
          console.error('Error linking lead to conversation:', linkError);
        } else {
          console.log(`Lead ${leadId} linked to conversation ${conversation.id}`);
        }
      }
    } catch (linkErr) {
      // Non-blocking — don't fail the lead submission
      console.error('Error searching for conversation to link:', linkErr);
    }

    return new Response(
      JSON.stringify({ success: true, resolved_unit: resolvedUnit }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error processing lead submission:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
