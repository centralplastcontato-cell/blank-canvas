import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Company, UserCompanyWithDetails, UserCompanyRole } from '@/types/company';

interface CompanyContextType {
  // Current selected company
  currentCompany: Company | null;
  currentCompanyId: string | null;
  currentRole: UserCompanyRole | null;
  
  // All companies the user has access to
  userCompanies: UserCompanyWithDetails[];
  
  // Loading state
  isLoading: boolean;
  error: string | null;
  
  // Actions
  switchCompany: (companyId: string) => Promise<void>;
  refreshCompanies: () => Promise<void>;
  
  // Helper functions
  hasCompanyAccess: (companyId: string) => boolean;
  isCompanyAdmin: () => boolean;
  isCompanyOwner: () => boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const STORAGE_KEY = 'selected_company_id';

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [currentRole, setCurrentRole] = useState<UserCompanyRole | null>(null);
  const [userCompanies, setUserCompanies] = useState<UserCompanyWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserCompanies = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserCompanies([]);
        setCurrentCompany(null);
        setCurrentRole(null);
        setIsLoading(false);
        return;
      }

      // Fetch user's companies with company details
      const { data: userCompaniesData, error: ucError } = await supabase
        .from('user_companies')
        .select(`
          id,
          user_id,
          company_id,
          role,
          is_default,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id);

      if (ucError) throw ucError;

      if (!userCompaniesData || userCompaniesData.length === 0) {
        setUserCompanies([]);
        setCurrentCompany(null);
        setCurrentRole(null);
        setIsLoading(false);
        return;
      }

      // Fetch company details for all user companies
      const companyIds = userCompaniesData.map(uc => uc.company_id);
      const { data: companiesData, error: cError } = await supabase
        .from('companies')
        .select('*')
        .in('id', companyIds);

      if (cError) throw cError;

      // Combine user_companies with company details
      const combinedData: UserCompanyWithDetails[] = userCompaniesData.map(uc => ({
        ...uc,
        role: uc.role as UserCompanyRole,
        company: companiesData?.find(c => c.id === uc.company_id) as Company,
      })).filter(uc => uc.company);

      setUserCompanies(combinedData);

      // Determine which company to select
      const storedCompanyId = localStorage.getItem(STORAGE_KEY);
      let selectedCompany: UserCompanyWithDetails | undefined;

      // Priority: stored > default > first
      if (storedCompanyId) {
        selectedCompany = combinedData.find(uc => uc.company_id === storedCompanyId);
      }
      if (!selectedCompany) {
        selectedCompany = combinedData.find(uc => uc.is_default);
      }
      if (!selectedCompany && combinedData.length > 0) {
        selectedCompany = combinedData[0];
      }

      if (selectedCompany) {
        setCurrentCompany(selectedCompany.company);
        setCurrentRole(selectedCompany.role);
        localStorage.setItem(STORAGE_KEY, selectedCompany.company_id);
      }

    } catch (err) {
      console.error('Error fetching companies:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar empresas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchCompany = useCallback(async (companyId: string) => {
    const userCompany = userCompanies.find(uc => uc.company_id === companyId);
    if (!userCompany) {
      throw new Error('Você não tem acesso a esta empresa');
    }

    setCurrentCompany(userCompany.company);
    setCurrentRole(userCompany.role);
    localStorage.setItem(STORAGE_KEY, companyId);
  }, [userCompanies]);

  const hasCompanyAccess = useCallback((companyId: string) => {
    return userCompanies.some(uc => uc.company_id === companyId);
  }, [userCompanies]);

  const isCompanyAdmin = useCallback(() => {
    return currentRole === 'admin' || currentRole === 'owner';
  }, [currentRole]);

  const isCompanyOwner = useCallback(() => {
    return currentRole === 'owner';
  }, [currentRole]);

  // Fetch companies on mount and auth changes
  useEffect(() => {
    fetchUserCompanies();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchUserCompanies();
      } else if (event === 'SIGNED_OUT') {
        setUserCompanies([]);
        setCurrentCompany(null);
        setCurrentRole(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserCompanies]);

  const value: CompanyContextType = {
    currentCompany,
    currentCompanyId: currentCompany?.id ?? null,
    currentRole,
    userCompanies,
    isLoading,
    error,
    switchCompany,
    refreshCompanies: fetchUserCompanies,
    hasCompanyAccess,
    isCompanyAdmin,
    isCompanyOwner,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
