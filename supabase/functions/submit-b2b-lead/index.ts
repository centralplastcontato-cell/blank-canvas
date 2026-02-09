import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple in-memory rate limiting (resets on function restart)
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_REQUESTS_PER_WINDOW = 3; // 3 B2B leads per hour per email

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const key = email.toLowerCase();
  const record = rateLimitMap.get(key);
  
  if (!record) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return false;
  }
  
  // Reset window if expired
  if (now - record.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
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
function validateCompanyName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Nome da empresa é obrigatório' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Nome da empresa deve ter pelo menos 2 caracteres' };
  }
  if (trimmed.length > 150) {
    return { valid: false, error: 'Nome da empresa deve ter no máximo 150 caracteres' };
  }
  if (/[<>{}]/.test(trimmed)) {
    return { valid: false, error: 'Nome contém caracteres inválidos' };
  }
  return { valid: true };
}

function validateContactName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Nome do contato é obrigatório' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Nome do contato deve ter pelo menos 2 caracteres' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Nome do contato deve ter no máximo 100 caracteres' };
  }
  if (/[<>{}]/.test(trimmed)) {
    return { valid: false, error: 'Nome contém caracteres inválidos' };
  }
  return { valid: true };
}

function validateEmail(email: string): { valid: boolean; error?: string; normalized?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'E-mail é obrigatório' };
  }
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'E-mail inválido' };
  }
  if (trimmed.length > 255) {
    return { valid: false, error: 'E-mail muito longo' };
  }
  return { valid: true, normalized: trimmed };
}

function validatePhone(phone: string | null): { valid: boolean; error?: string } {
  if (!phone) return { valid: true }; // Optional
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return { valid: false, error: 'Telefone inválido' };
  }
  return { valid: true };
}

function validateTextField(value: string | null, fieldName: string, maxLength: number = 500): { valid: boolean; error?: string } {
  if (!value) return { valid: true }; // Optional
  if (typeof value !== 'string' || value.length > maxLength) {
    return { valid: false, error: `${fieldName} muito longo` };
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
    const { 
      company_name, 
      contact_name, 
      email, 
      phone, 
      city, 
      state,
      monthly_parties, 
      current_tools, 
      main_challenges, 
      how_found_us,
      // New hub prospect fields
      instagram,
      monthly_leads,
      lead_cost,
      has_lead_clarity,
      lead_organization,
      source,
    } = body;

    // Validate required fields
    const companyValidation = validateCompanyName(company_name);
    if (!companyValidation.valid) {
      return new Response(
        JSON.stringify({ error: companyValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contactValidation = validateContactName(contact_name);
    if (!contactValidation.valid) {
      return new Response(
        JSON.stringify({ error: contactValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return new Response(
        JSON.stringify({ error: emailValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate optional fields
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      return new Response(
        JSON.stringify({ error: phoneValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const toolsValidation = validateTextField(current_tools, 'Ferramentas atuais');
    if (!toolsValidation.valid) {
      return new Response(
        JSON.stringify({ error: toolsValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const challengesValidation = validateTextField(main_challenges, 'Desafios');
    if (!challengesValidation.valid) {
      return new Response(
        JSON.stringify({ error: challengesValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting by email
    const normalizedEmail = emailValidation.normalized!;
    if (isRateLimited(normalizedEmail)) {
      console.log(`Rate limit exceeded for email: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ error: 'Muitas solicitações. Tente novamente mais tarde.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert B2B lead with new fields
    const { error: insertError } = await supabase
      .from('b2b_leads')
      .insert({
        company_name: company_name.trim(),
        contact_name: contact_name.trim(),
        email: normalizedEmail,
        phone: phone?.replace(/\D/g, '') || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        monthly_parties: monthly_parties || null,
        current_tools: current_tools || null,
        main_challenges: main_challenges || null,
        how_found_us: how_found_us || null,
        status: 'novo',
        // New fields
        instagram: instagram?.trim() || null,
        monthly_leads: monthly_leads || null,
        lead_cost: lead_cost || null,
        has_lead_clarity: typeof has_lead_clarity === 'boolean' ? has_lead_clarity : null,
        lead_organization: lead_organization || null,
        source: source || 'b2b',
      });

    if (insertError) {
      console.error('Error inserting B2B lead:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sourceLabel = source === 'hub_landing' ? 'Hub Landing' : 'B2B';
    console.log(`${sourceLabel} Lead created successfully: ${company_name.trim()} - ${normalizedEmail}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error processing B2B lead submission:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
