-- Add provider column to wapi_instances (default 'wapi' so existing instances are untouched)
ALTER TABLE public.wapi_instances
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'wapi',
  ADD COLUMN IF NOT EXISTS client_token text;

-- Add a check constraint for valid providers
ALTER TABLE public.wapi_instances
  ADD CONSTRAINT wapi_instances_provider_check CHECK (provider IN ('wapi', 'zapi'));

-- Index for quick provider-based lookups
CREATE INDEX IF NOT EXISTS idx_wapi_instances_provider ON public.wapi_instances (provider);