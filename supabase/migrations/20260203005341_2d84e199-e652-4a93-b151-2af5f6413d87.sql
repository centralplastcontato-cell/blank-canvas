-- Tabela para armazenar as instâncias W-API de cada usuário
CREATE TABLE public.wapi_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  instance_id TEXT NOT NULL,
  instance_token TEXT NOT NULL,
  status TEXT DEFAULT 'disconnected',
  phone_number TEXT,
  connected_at TIMESTAMP WITH TIME ZONE,
  messages_count INTEGER DEFAULT 0,
  credits_available INTEGER DEFAULT 0,
  addon_valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabela para armazenar conversas
CREATE TABLE public.wapi_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public.wapi_instances(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.campaign_leads(id) ON DELETE SET NULL,
  remote_jid TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(instance_id, remote_jid)
);

-- Tabela para armazenar mensagens
CREATE TABLE public.wapi_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.wapi_conversations(id) ON DELETE CASCADE,
  message_id TEXT,
  from_me BOOLEAN NOT NULL DEFAULT false,
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  status TEXT DEFAULT 'pending',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wapi_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wapi_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wapi_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for wapi_instances
CREATE POLICY "Users can view own instance"
ON public.wapi_instances
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own instance"
ON public.wapi_instances
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own instance"
ON public.wapi_instances
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own instance"
ON public.wapi_instances
FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for wapi_conversations (baseado na instância do usuário)
CREATE POLICY "Users can view own conversations"
ON public.wapi_conversations
FOR SELECT
USING (
  instance_id IN (
    SELECT id FROM public.wapi_instances WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own conversations"
ON public.wapi_conversations
FOR INSERT
WITH CHECK (
  instance_id IN (
    SELECT id FROM public.wapi_instances WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own conversations"
ON public.wapi_conversations
FOR UPDATE
USING (
  instance_id IN (
    SELECT id FROM public.wapi_instances WHERE user_id = auth.uid()
  )
);

-- RLS policies for wapi_messages (baseado na conversa do usuário)
CREATE POLICY "Users can view own messages"
ON public.wapi_messages
FOR SELECT
USING (
  conversation_id IN (
    SELECT c.id FROM public.wapi_conversations c
    JOIN public.wapi_instances i ON i.id = c.instance_id
    WHERE i.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own messages"
ON public.wapi_messages
FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT c.id FROM public.wapi_conversations c
    JOIN public.wapi_instances i ON i.id = c.instance_id
    WHERE i.user_id = auth.uid()
  )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.wapi_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wapi_conversations;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_wapi_instances_updated_at
BEFORE UPDATE ON public.wapi_instances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wapi_conversations_updated_at
BEFORE UPDATE ON public.wapi_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();