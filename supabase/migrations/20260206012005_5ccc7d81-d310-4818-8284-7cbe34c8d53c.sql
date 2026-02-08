-- Create table for customizable sales material captions
CREATE TABLE public.sales_material_captions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    unit text NOT NULL CHECK (unit IN ('Manchester', 'Trujillo')),
    caption_type text NOT NULL CHECK (caption_type IN ('video', 'video_promo', 'photo_collection')),
    caption_text text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (unit, caption_type)
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

-- Insert default captions for Manchester
INSERT INTO public.sales_material_captions (unit, caption_type, caption_text) VALUES
('Manchester', 'video', '🎬 Veja como é incrível o nosso espaço! ✨ Unidade Manchester te espera para uma festa inesquecível! 🎉'),
('Manchester', 'video_promo', '🎭🎉 PROMOÇÃO ESPECIAL DE CARNAVAL! 🎊✨ Aproveite condições imperdíveis para garantir a festa dos sonhos do seu filho! Entre em contato agora e confira! 🏰💜'),
('Manchester', 'photo_collection', '✨ Espaço incrível para festas inesquecíveis! Venha conhecer nossa unidade Manchester e encante-se com a estrutura completa para a diversão da criançada! 🎉🏰');

-- Insert default captions for Trujillo
INSERT INTO public.sales_material_captions (unit, caption_type, caption_text) VALUES
('Trujillo', 'video', '🎬 Dá só uma olhada no nosso espaço! ✨ Unidade Trujillo pronta para fazer a festa perfeita! 🎉'),
('Trujillo', 'video_promo', '🎭🎉 PROMOÇÃO ESPECIAL DE CARNAVAL! 🎊✨ Aproveite condições imperdíveis para garantir a festa dos sonhos do seu filho! Entre em contato agora e confira! 🏰💜'),
('Trujillo', 'photo_collection', '✨ Um mundo de diversão espera por você! Conheça nossa unidade Trujillo e surpreenda-se com tudo que preparamos para a festa perfeita! 🎉🏰');