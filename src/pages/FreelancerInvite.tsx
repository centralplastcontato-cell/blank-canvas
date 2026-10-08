import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Link curto que a Bia manda para quem quer trabalhar (/trabalhe/k7m2qx):
// abre o formulário de candidatura já com nome, WhatsApp e funções.
export default function FreelancerInvite() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any).rpc("get_freelancer_invite", { _code: code || "" });
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : null;
      if (error || !row) { setNotFound(true); return; }
      const params = new URLSearchParams();
      if (row.name) params.set("nome", row.name);
      if (row.phone) params.set("tel", row.phone);
      if (row.roles) params.set("vagas", row.roles);
      params.set("via", row.source === "bia" ? "bia" : "link");
      const path = row.company_slug && row.template_slug
        ? `/freelancer/${row.company_slug}/${row.template_slug}`
        : `/freelancer/${row.template_id}`;
      navigate(`${path}?${params.toString()}`, { replace: true });
    })();
    return () => { cancelled = true; };
  }, [code, navigate]);

  if (notFound) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-foreground">Link não encontrado</h1>
          <p className="text-muted-foreground text-sm">Confira o link ou peça um novo pelo WhatsApp.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
