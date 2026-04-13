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
SET search_path = public, extensions
AS $$
DECLARE
  v_sig record;
  v_content text;
  v_hash text;
BEGIN
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

  IF v_sig.otp_attempts >= 3 THEN
    UPDATE public.contract_signatures SET status = 'expired' WHERE id = v_sig.id;
    RETURN jsonb_build_object('success', false, 'error', 'Número máximo de tentativas excedido.');
  END IF;

  IF v_sig.otp_code IS NULL OR v_sig.otp_code != _otp THEN
    UPDATE public.contract_signatures SET otp_attempts = otp_attempts + 1 WHERE id = v_sig.id;
    RETURN jsonb_build_object('success', false, 'error', 'Código OTP inválido.', 'attempts_left', 2 - v_sig.otp_attempts);
  END IF;

  IF v_sig.otp_sent_at IS NULL OR (now() - v_sig.otp_sent_at) > interval '10 minutes' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código OTP expirado. Solicite um novo código.');
  END IF;

  SELECT conteudo_renderizado INTO v_content FROM public.generated_contracts WHERE id = v_sig.contract_id;
  v_hash := encode(digest(v_content, 'sha256'), 'hex');

  UPDATE public.contract_signatures SET
    signature_image_url = _signature_base64,
    document_hash = v_hash,
    ip_address = _ip,
    user_agent = _user_agent,
    otp_verified_at = now(),
    signed_at = now(),
    status = 'signed'
  WHERE id = v_sig.id;

  UPDATE public.generated_contracts SET status = 'assinado', signature_token = _token WHERE id = v_sig.contract_id;

  INSERT INTO public.contract_audit_logs (company_id, contract_id, template_id, action, details, performed_by)
  SELECT v_sig.company_id, v_sig.contract_id, gc.template_id, 'contract_signed',
    jsonb_build_object('signer_name', v_sig.signer_name, 'signer_phone', v_sig.signer_phone, 'ip', _ip, 'hash', v_hash, 'signed_by', 'public_signer'),
    NULL
  FROM public.generated_contracts gc WHERE gc.id = v_sig.contract_id;

  INSERT INTO public.notifications (user_id, company_id, type, title, message, data)
  SELECT uc.user_id, v_sig.company_id, 'contract_signed',
    '✅ Contrato assinado!',
    COALESCE(v_sig.signer_name, 'Cliente') || ' assinou o contrato digitalmente.',
    jsonb_build_object('contract_id', v_sig.contract_id, 'signer_name', v_sig.signer_name)
  FROM public.user_companies uc WHERE uc.company_id = v_sig.company_id;

  RETURN jsonb_build_object('success', true);
END;
$$;