-- Drop the old table with unit separation
DROP TABLE IF EXISTS public.sales_material_captions;

-- Create new simplified table (no unit column, just caption types)
CREATE TABLE public.sales_material_captions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    caption_type text NOT NULL UNIQUE CHECK (caption_type IN ('video', 'video_promo', 'photo_collection')),
    caption_text text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_material_captions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view active captions"
ON public.sales_material_captions
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Admins can manage captions"
ON public.sales_material_captions
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users with config permission can manage captions"
ON public.sales_material_captions
FOR ALL
USING (auth.uid() IS NOT NULL AND (is_admin(auth.uid()) OR has_permission(auth.uid(), 'config.whatsapp.messages')))
WITH CHECK (auth.uid() IS NOT NULL AND (is_admin(auth.uid()) OR has_permission(auth.uid(), 'config.whatsapp.messages')));

-- Trigger for updated_at
CREATE TRIGGER update_sales_material_captions_updated_at
BEFORE UPDATE ON public.sales_material_captions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default captions with {unidade} variable
INSERT INTO public.sales_material_captions (caption_type, caption_text) VALUES
('video', '🎬 Veja como é incrível o nosso espaço! ✨ Unidade {unidade} te espera para uma festa inesquecível! 🎉'),
('video_promo', '🎭🎉 PROMOÇÃO ESPECIAL DE CARNAVAL! 🎊✨ Aproveite condições imperdíveis para garantir a festa dos sonhos do seu filho! Entre em contato agora e confira! 🏰💜'),
('photo_collection', '✨ Espaço incrível para festas inesquecíveis! Venha conhecer a unidade {unidade} e encante-se com a estrutura completa para a diversão da criançada! 🎉🏰');