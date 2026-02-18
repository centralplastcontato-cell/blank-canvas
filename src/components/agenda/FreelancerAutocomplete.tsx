import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Star } from "lucide-react";

interface FreelancerSuggestion {
  id: string;
  respondent_name: string;
  pix_type: string | null;
  pix_key: string | null;
  avgScore?: number;
}

interface FreelancerAutocompleteProps {
  companyId: string | null;
  value: string;
  onChange: (value: string) => void;
  onSelect: (freelancer: { name: string; pix_type: string; pix_key: string }) => void;
  className?: string;
  placeholder?: string;
}

export function FreelancerAutocomplete({
  companyId,
  value,
  onChange,
  onSelect,
  className,
  placeholder = "Nome",
}: FreelancerAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<FreelancerSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (term: string) => {
    if (!companyId || term.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const { data } = await supabase
      .from("freelancer_responses")
      .select("id, respondent_name, pix_type, pix_key")
      .eq("company_id", companyId)
      .ilike("respondent_name", `%${term.trim()}%`)
      .limit(8);
    const results = (data as FreelancerSuggestion[]) || [];

    // Fetch avg scores for matched names
    if (results.length > 0) {
      const names = results.map(r => r.respondent_name).filter(Boolean);
      const { data: evalData } = await (supabase as any)
        .from("freelancer_evaluations")
        .select("freelancer_name, scores")
        .eq("company_id", companyId)
        .in("freelancer_name", names);
      if (evalData && evalData.length > 0) {
        const scoreMap = new Map<string, number[]>();
        evalData.forEach((e: any) => {
          const geral = e.scores?.geral;
          if (typeof geral === "number" && geral > 0) {
            const arr = scoreMap.get(e.freelancer_name) || [];
            arr.push(geral);
            scoreMap.set(e.freelancer_name, arr);
          }
        });
        results.forEach(r => {
          const scores = scoreMap.get(r.respondent_name || "");
          if (scores && scores.length > 0) {
            r.avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
          }
        });
      }
    }

    setSuggestions(results);
  }, [companyId]);

  const handleChange = (val: string) => {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
    setShowDropdown(true);
  };

  const handleSelect = (f: FreelancerSuggestion) => {
    onSelect({
      name: f.respondent_name || "",
      pix_type: f.pix_type || "",
      pix_key: f.pix_key || "",
    });
    setShowDropdown(false);
    setSuggestions([]);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
      />
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-[9999] top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto" style={{ position: 'fixed', width: wrapperRef.current?.getBoundingClientRect().width, left: wrapperRef.current?.getBoundingClientRect().left, top: (wrapperRef.current?.getBoundingClientRect().bottom ?? 0) + 4 }}>
          {suggestions.map((f) => (
            <button
              key={f.id}
              type="button"
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors border-b border-border last:border-0"
              onClick={() => handleSelect(f)}
            >
              <span className="font-medium">{f.respondent_name}</span>
              {f.avgScore && (
                <span className="inline-flex items-center gap-0.5 ml-1.5 text-xs font-semibold">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {f.avgScore.toFixed(1)}
                </span>
              )}
              {f.pix_key && (
                <span className="text-muted-foreground text-xs ml-2">
                  PIX: {f.pix_type} · {f.pix_key}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
