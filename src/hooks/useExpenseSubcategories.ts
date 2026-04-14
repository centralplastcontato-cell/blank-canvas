import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompanyId } from './useCurrentCompanyId';

export function useExpenseSubcategories(category: string) {
  const companyId = useCurrentCompanyId();
  const [subcategories, setSubcategories] = useState<string[]>([]);

  useEffect(() => {
    if (!companyId || !category) {
      setSubcategories([]);
      return;
    }
    const fetch = async () => {
      const { data } = await supabase
        .from('expense_subcategories')
        .select('name')
        .eq('company_id', companyId)
        .eq('category', category)
        .order('name');
      setSubcategories(data?.map(d => d.name) || []);
    };
    fetch();
  }, [companyId, category]);

  const addSubcategory = async (name: string) => {
    if (!companyId || !name.trim()) return;
    const trimmed = name.trim();
    if (subcategories.includes(trimmed)) return;
    
    await supabase
      .from('expense_subcategories')
      .upsert({ company_id: companyId, category, name: trimmed }, { onConflict: 'company_id,category,name' });
    
    setSubcategories(prev => [...prev, trimmed].sort());
  };

  return { subcategories, addSubcategory };
}
