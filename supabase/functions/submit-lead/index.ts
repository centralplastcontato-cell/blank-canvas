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
  const validUnits = ['Manchester', 'Trujillo', 'As duas'];
  if (!validUnits.includes(unit)) {
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
  if (!validMonths.includes(month)) {
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
    const { name, whatsapp, unit, month, day_of_month, guests, campaign_id, campaign_name, company_id } = body;

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

    // Insert lead
    const { error: insertError } = await supabase
      .from('campaign_leads')
      .insert({
        name: name.trim(),
        whatsapp: normalizedPhone,
        unit: unit || null,
        month: month || null,
        day_of_month: day_of_month || null,
        guests: guests || null,
        campaign_id: campaign_id,
        campaign_name: campaign_name || null,
        status: 'novo',
        company_id: company_id,
      });

    if (insertError) {
      console.error('Error inserting lead:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Lead created successfully: ${name.trim()} - ${normalizedPhone} (company: ${company_id})`);

    return new Response(
      JSON.stringify({ success: true }),
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
