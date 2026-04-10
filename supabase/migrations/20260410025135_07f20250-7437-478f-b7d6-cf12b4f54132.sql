
-- 1. Create contract_signatures table
CREATE TABLE public.contract_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.generated_contracts(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  signer_name text,
  signer_phone text,
  signature_image_url text,
  document_hash text,
  otp_code text,
  otp_sent_at timestamptz,
  otp_verified_at timestamptz,
  otp_attempts integer DEFAULT 0,
  ip_address text,
  user_agent text,
  signed_at timestamptz,
  token text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add signature_token to generated_contracts
ALTER TABLE public.generated_contracts ADD COLUMN IF NOT EXISTS signature_token text;

-- 3. Enable RLS
ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies - only authenticated users from the company can read
CREATE POLICY "Company members can view signatures"
  ON public.contract_signatures FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- 5. RPC: get contract for signing (public, security definer)
CREATE OR REPLACE FUNCTION public.get_contract_for_signing(_token text)
RETURNS TABLE(
  contract_id uuid,
  company_id uuid,
  company_name text,
  company_logo text,
  nome_documento text,
  conteudo_renderizado text,
  tipo_evento text,
  status text,
  signer_name text,
  signer_phone text,
  signature_status text,
  signed_at timestamptz,
  signature_image_url text,
  document_hash text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    gc.id AS contract_id,
    gc.company_id,
    c.name AS company_name,
    c.logo_url AS company_logo,
    gc.nome_documento,
    gc.conteudo_renderizado,
    gc.tipo_evento,
    gc.status,
    cs.signer_name,
    cs.signer_phone,
    cs.status AS signature_status,
    cs.signed_at,
    cs.signature_image_url,
    cs.document_hash
  FROM public.contract_signatures cs
  JOIN public.generated_contracts gc ON gc.id = cs.contract_id
  JOIN public.companies c ON c.id = gc.company_id
  WHERE cs.token = _token
  LIMIT 1;
$$;

-- 6. RPC: submit contract signature (public, security definer)
CREATE OR REPLACE FUNCTION public.submit_contract_signature(
  _token text,
  _otp text,
  _signature_base64 text,
  _ip text,
  _user_agent text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sig record;
  v_content text;
  v_hash text;
BEGIN
  -- Get signature record
  SELECT * INTO v_sig FROM public.contract_signatures WHERE token = _token;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token inválido.');
  END IF;

  IF v_sig.status = 'signed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contrato já foi assinado.');
  END IF;

  IF v_sig.status = 'expired' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token expirado.');
  END IF;

  -- Check OTP attempts
  IF v_sig.otp_attempts >= 3 THEN
    UPDATE public.contract_signatures SET status = 'expired' WHERE id = v_sig.id;
    RETURN jsonb_build_object('success', false, 'error', 'Número máximo de tentativas excedido.');
  END IF;

  -- Check OTP code
  IF v_sig.otp_code IS NULL OR v_sig.otp_code != _otp THEN
    UPDATE public.contract_signatures SET otp_attempts = otp_attempts + 1 WHERE id = v_sig.id;
    RETURN jsonb_build_object('success', false, 'error', 'Código OTP inválido.', 'attempts_left', 2 - v_sig.otp_attempts);
  END IF;

  -- Check OTP expiration (10 minutes)
  IF v_sig.otp_sent_at IS NULL OR (now() - v_sig.otp_sent_at) > interval '10 minutes' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código OTP expirado. Solicite um novo código.');
  END IF;

  -- Get contract content for hash
  SELECT conteudo_renderizado INTO v_content FROM public.generated_contracts WHERE id = v_sig.contract_id;
  v_hash := encode(digest(v_content, 'sha256'), 'hex');

  -- Update signature record
  UPDATE public.contract_signatures SET
    signature_image_url = _signature_base64,
    document_hash = v_hash,
    ip_address = _ip,
    user_agent = _user_agent,
    otp_verified_at = now(),
    signed_at = now(),
    status = 'signed'
  WHERE id = v_sig.id;

  -- Update contract status
  UPDATE public.generated_contracts SET status = 'assinado', signature_token = _token WHERE id = v_sig.contract_id;

  -- Log audit
  INSERT INTO public.contract_audit_logs (company_id, contract_id, template_id, action, details, performed_by)
  SELECT v_sig.company_id, v_sig.contract_id, gc.template_id, 'contract_signed',
    jsonb_build_object('signer_name', v_sig.signer_name, 'signer_phone', v_sig.signer_phone, 'ip', _ip, 'hash', v_hash),
    'public_signer'
  FROM public.generated_contracts gc WHERE gc.id = v_sig.contract_id;

  -- Send notification to company users
  INSERT INTO public.notifications (user_id, company_id, type, title, message, data)
  SELECT uc.user_id, v_sig.company_id, 'contract_signed',
    '✅ Contrato assinado!',
    COALESCE(v_sig.signer_name, 'Cliente') || ' assinou o contrato digitalmente.',
    jsonb_build_object('contract_id', v_sig.contract_id, 'signer_name', v_sig.signer_name)
  FROM public.user_companies uc WHERE uc.company_id = v_sig.company_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. Enable pgcrypto for SHA-256 (if not already)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 8. Index for token lookup
CREATE INDEX idx_contract_signatures_token ON public.contract_signatures(token);
CREATE INDEX idx_generated_contracts_signature_token ON public.generated_contracts(signature_token);
