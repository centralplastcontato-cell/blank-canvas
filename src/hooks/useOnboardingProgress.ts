import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Json } from '@/integrations/supabase/types';
import { signupStatus } from '@/lib/selfSetup';

export interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  route?: string;
}

export function useOnboardingProgress() {
  const { currentCompany, currentCompanyId } = useCompany();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentCompanyId) return;

    const checkProgress = async () => {
      setIsLoading(true);

      // Buffet que se cadastrou pelo site (só IA): guia próprio, sem o
      // formulário de onboarding antigo, unidades e fluxo do robô
      const signup = signupStatus(currentCompany?.settings);
      if (signup) {
        const [instRes, lpPub, matRes, teamRes] = await Promise.all([
          supabase.from('wapi_instances').select('id', { count: 'exact', head: true }).eq('company_id', currentCompanyId).eq('status', 'connected'),
          supabase.from('company_landing_pages').select('id', { count: 'exact', head: true }).eq('company_id', currentCompanyId).eq('is_published', true),
          // As fotos do site já viram a coleção sozinhas: conta só o PDF de pacotes
          supabase.from('sales_materials').select('id', { count: 'exact', head: true }).eq('company_id', currentCompanyId).eq('is_active', true).eq('type', 'pdf_package'),
          supabase.from('user_companies').select('id', { count: 'exact', head: true }).eq('company_id', currentCompanyId),
        ]);
        setSteps([
          { id: 'cadastro', label: 'Concluir o cadastro', description: 'IA, datas ocupadas e site', completed: signup !== 'cadastro', route: '/setup' },
          { id: 'whatsapp', label: 'WhatsApp conectado', description: 'A equipe Celebrei conecta o seu número; depois é só ler o QR Code', completed: (instRes.count ?? 0) > 0, route: '/configuracoes?secao=connection' },
          { id: 'ia', label: 'IA atendendo', description: 'Liberada pela Celebrei depois da aprovação', completed: signup === 'aprovado' },
          { id: 'site', label: 'Publicar o site do buffet', description: 'Os botões do site abrem o seu WhatsApp', completed: (lpPub.count ?? 0) > 0, route: '/configuracoes?secao=site' },
          { id: 'materiais', label: 'Enviar o PDF de pacotes e o vídeo', description: 'A IA manda fotos, vídeo e pacotes quando o cliente pede', completed: (matRes.count ?? 0) > 0, route: '/configuracoes?secao=content' },
          { id: 'team', label: 'Convidar a equipe', description: 'Quem vai atender os clientes que a IA passar', completed: (teamRes.count ?? 0) > 1, route: '/configuracoes?tab=usuarios' },
        ]);
        setIsLoading(false);
        return;
      }

      const settings = currentCompany?.settings as Record<string, Json | undefined> | null;
      const salesMaterials = settings?.sales_materials;
      const hasSalesMaterials = !!salesMaterials && typeof salesMaterials === 'object' && !Array.isArray(salesMaterials) && Object.keys(salesMaterials).length > 0;

      const [
        wapiRes,
        unitsRes,
        onboardingRes,
        lpRes,
        flowsRes,
        membersRes,
      ] = await Promise.all([
        supabase.from('wapi_conversations' as any).select('id', { count: 'exact', head: true }).eq('company_id', currentCompanyId).limit(1),
        supabase.from('company_units').select('id', { count: 'exact', head: true }).eq('company_id', currentCompanyId).eq('is_active', true),
        supabase.from('company_onboarding').select('status').eq('company_id', currentCompanyId).neq('status', 'pendente').limit(1),
        supabase.from('company_landing_pages').select('id', { count: 'exact', head: true }).eq('company_id', currentCompanyId).eq('is_published', true),
        supabase.from('conversation_flows').select('id', { count: 'exact', head: true }).eq('company_id', currentCompanyId),
        supabase.from('user_companies').select('id', { count: 'exact', head: true }).eq('company_id', currentCompanyId),
      ]);

      setSteps([
        {
          id: 'whatsapp',
          label: 'Conectar WhatsApp',
          description: 'Vincule seu número de WhatsApp para começar a atender',
          completed: (wapiRes.count ?? 0) > 0,
          route: '/configuracoes',
        },
        {
          id: 'units',
          label: 'Cadastrar unidades',
          description: 'Configure suas unidades de atendimento',
          completed: (unitsRes.count ?? 0) > 1,
          route: '/configuracoes',
        },
        {
          id: 'onboarding',
          label: 'Preencher onboarding',
          description: 'Complete o formulário inicial com dados do buffet',
          completed: (onboardingRes.data?.length ?? 0) > 0,
          route: currentCompany?.slug ? `/onboarding/${currentCompany.slug}` : undefined,
        },
        {
          id: 'landing_page',
          label: 'Personalizar landing page',
          description: 'Publique sua página de captura de leads',
          completed: (lpRes.count ?? 0) > 0,
          route: '/configuracoes',
        },
        {
          id: 'flow',
          label: 'Configurar fluxo de conversa',
          description: 'Crie seu primeiro fluxo de atendimento automatizado',
          completed: (flowsRes.count ?? 0) > 0,
          route: '/configuracoes',
        },
        {
          id: 'sales_materials',
          label: 'Enviar materiais de venda',
          description: 'Adicione fotos, vídeos e PDFs de vendas',
          completed: hasSalesMaterials,
          route: '/configuracoes',
        },
        {
          id: 'team',
          label: 'Convidar equipe',
          description: 'Adicione membros da sua equipe ao painel',
          completed: (membersRes.count ?? 0) > 1,
          route: '/configuracoes?tab=usuarios',
        },
      ]);

      setIsLoading(false);
    };

    checkProgress();
  }, [currentCompanyId, currentCompany?.settings, currentCompany?.slug]);

  const completedCount = steps.filter(s => s.completed).length;
  const totalCount = steps.length;
  const isDismissed = (() => {
    const settings = currentCompany?.settings as Record<string, Json | undefined> | null;
    return settings?.onboarding_checklist_dismissed === true;
  })();

  return { steps, completedCount, totalCount, isLoading, isDismissed };
}
