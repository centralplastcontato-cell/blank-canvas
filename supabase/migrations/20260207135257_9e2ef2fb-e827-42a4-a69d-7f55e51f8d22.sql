-- Create table for user filter preferences
CREATE TABLE public.user_filter_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  filter_order TEXT[] NOT NULL DEFAULT ARRAY['all', 'unread', 'closed', 'fechados', 'oe', 'visitas', 'freelancer', 'equipe', 'favorites', 'grupos'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_filter_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own filter preferences"
ON public.user_filter_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own filter preferences"
ON public.user_filter_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own filter preferences"
ON public.user_filter_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_filter_preferences_updated_at
BEFORE UPDATE ON public.user_filter_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();