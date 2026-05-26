-- =============================================
-- CORREÇÃO DE SEGURANÇA — RLS + STORAGE
-- Resolve todos os avisos do Lovable Security Advisor
-- =============================================


-- ─────────────────────────────────────────────
-- 1. TABELA DE BACKUP SEM RLS
--    wapi_messages_dedup_backup_20260514 foi criada com CREATE TABLE AS SELECT
--    sem herdar o RLS de wapi_messages. Habilita RLS e restringe a admins.
-- ─────────────────────────────────────────────
ALTER TABLE IF EXISTS public.wapi_messages_dedup_backup_20260514
  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins only backup access" ON public.wapi_messages_dedup_backup_20260514;
CREATE POLICY "Admins only backup access"
  ON public.wapi_messages_dedup_backup_20260514
  FOR ALL
  USING (public.is_admin(auth.uid()));


-- ─────────────────────────────────────────────
-- 2. user_permissions — usuários veem apenas suas próprias permissões
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON public.user_permissions;

CREATE POLICY "Users can view own permissions"
  ON public.user_permissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));


-- ─────────────────────────────────────────────
-- 3. lead_history — isolar por empresa via lead_id → campaign_leads.company_id
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view lead history" ON public.lead_history;
DROP POLICY IF EXISTS "Authenticated users can insert lead history" ON public.lead_history;

CREATE POLICY "Users can view lead history from their companies"
  ON public.lead_history
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.campaign_leads cl
      WHERE cl.id = lead_history.lead_id
        AND cl.company_id = ANY(public.get_user_company_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can insert lead history for their companies"
  ON public.lead_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.campaign_leads cl
      WHERE cl.id = lead_history.lead_id
        AND cl.company_id = ANY(public.get_user_company_ids(auth.uid()))
    )
  );


-- ─────────────────────────────────────────────
-- 4. company_units — remover acesso anônimo de enumeração cross-tenant
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view active units" ON public.company_units;
DROP POLICY IF EXISTS "Public can view active units" ON public.company_units;
-- A política abaixo foi criada em 20260301 e permite que anônimos listem TODAS as unidades ativas
DO $$
BEGIN
  -- Remove qualquer política SELECT TO anon na tabela company_units
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.company_units;', ' ')
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'company_units'
      AND roles @> ARRAY['anon']
      AND cmd = 'SELECT'
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Leitura pública limitada: apenas unidades da empresa cujo slug está no path (para LPs públicas)
-- Usuários autenticados veem apenas unidades de suas empresas
-- Admins veem tudo
DROP POLICY IF EXISTS "Authenticated users view own company units" ON public.company_units;
CREATE POLICY "Authenticated users view own company units"
  ON public.company_units
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR company_id = ANY(public.get_user_company_ids(auth.uid()))
  );

-- Visitantes de landing pages públicas precisam ver as unidades da empresa:
-- permite SELECT anon SOMENTE para empresas com landing page publicada
DROP POLICY IF EXISTS "Anon can view units of published companies" ON public.company_units;
CREATE POLICY "Anon can view units of published companies"
  ON public.company_units
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.company_landing_pages lp
      WHERE lp.company_id = company_units.company_id
        AND lp.is_published = true
    )
  );


-- ─────────────────────────────────────────────
-- 5. STORAGE: expense-receipts — remover leitura pública
--    Recibos são dados financeiros internos, não devem ser públicos
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view expense receipts" ON storage.objects;

CREATE POLICY "Authenticated users can view expense receipts"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'expense-receipts');


-- ─────────────────────────────────────────────
-- 6. STORAGE: event-info-attachments — restringir escrita por empresa
--    O caminho deve seguir o padrão: {company_id}/...
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can upload event info attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for event info attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete event info attachments" ON storage.objects;

-- Leitura: apenas autenticados
CREATE POLICY "Authenticated users can view event info attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'event-info-attachments');

-- Escrita: apenas para pasta da própria empresa ({company_id}/...)
CREATE POLICY "Company members can upload event info attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event-info-attachments'
    AND (storage.foldername(name))[1] = ANY(
      SELECT company_id::text FROM public.user_companies
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Company members can delete event info attachments"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'event-info-attachments'
    AND (storage.foldername(name))[1] = ANY(
      SELECT company_id::text FROM public.user_companies
      WHERE user_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────
-- 7. STORAGE: company-logos — restringir escrita à empresa dona do logo
--    O caminho deve seguir o padrão: {company_id}/...
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete company logos" ON storage.objects;

CREATE POLICY "Company admins can upload logo"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (
      public.is_admin(auth.uid())
      OR (storage.foldername(name))[1] = ANY(
        SELECT uc.company_id::text FROM public.user_companies uc
        WHERE uc.user_id = auth.uid()
          AND uc.role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "Company admins can update logo"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (
      public.is_admin(auth.uid())
      OR (storage.foldername(name))[1] = ANY(
        SELECT uc.company_id::text FROM public.user_companies uc
        WHERE uc.user_id = auth.uid()
          AND uc.role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "Company admins can delete logo"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (
      public.is_admin(auth.uid())
      OR (storage.foldername(name))[1] = ANY(
        SELECT uc.company_id::text FROM public.user_companies uc
        WHERE uc.user_id = auth.uid()
          AND uc.role IN ('owner', 'admin')
      )
    )
  );


-- ─────────────────────────────────────────────
-- 8. STORAGE: landing-pages — restringir escrita à empresa dona da LP
--    Corrige: qualquer autenticado podia modificar imagens de qualquer empresa
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can upload landing page images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update landing page images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete landing page images" ON storage.objects;

CREATE POLICY "Company admins can upload landing page images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'landing-pages'
    AND (
      public.is_admin(auth.uid())
      OR (storage.foldername(name))[1] = ANY(
        SELECT uc.company_id::text FROM public.user_companies uc
        WHERE uc.user_id = auth.uid()
          AND uc.role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "Company admins can update landing page images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'landing-pages'
    AND (
      public.is_admin(auth.uid())
      OR (storage.foldername(name))[1] = ANY(
        SELECT uc.company_id::text FROM public.user_companies uc
        WHERE uc.user_id = auth.uid()
          AND uc.role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "Company admins can delete landing page images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'landing-pages'
    AND (
      public.is_admin(auth.uid())
      OR (storage.foldername(name))[1] = ANY(
        SELECT uc.company_id::text FROM public.user_companies uc
        WHERE uc.user_id = auth.uid()
          AND uc.role IN ('owner', 'admin')
      )
    )
  );


-- ─────────────────────────────────────────────
-- 9. STORAGE: onboarding-uploads — exigir autenticação para upload
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can upload onboarding files" ON storage.objects;

CREATE POLICY "Authenticated users can upload onboarding files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'onboarding-uploads');


-- ─────────────────────────────────────────────
-- 10. REALTIME — garantir que as publicações sensíveis
--     só são acessíveis para canais com filtro válido.
--     As tabelas já têm RLS correta; este bloco garante
--     que tabelas sem company_id não estejam na publicação.
-- ─────────────────────────────────────────────
-- message_templates e permission_definitions não precisam de Realtime
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.message_templates;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.permission_definitions;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.user_permissions;
