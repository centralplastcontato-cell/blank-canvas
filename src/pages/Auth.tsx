import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Lock, Mail, ArrowLeft } from "lucide-react";
import { isHubDomain } from "@/hooks/useDomainDetection";
import { z } from "zod";
import logoCastelo from "@/assets/logo-castelo.png";

const emailSchema = z.string().email("Email inválido");
const passwordSchema = z.string().min(6, "Senha deve ter pelo menos 6 caracteres");

export default function Auth() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(!!slug);

  // Redirect to Hub login if on Hub domain
  useEffect(() => {
    if (isHubDomain()) {
      navigate("/hub-login", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (slug) {
      setIsLoadingCompany(true);
      supabase
        .rpc("get_company_branding_by_slug", { _slug: slug })
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setCompanyName(data.name);
            setCompanyLogo(data.logo_url);
          }
          setIsLoadingCompany(false);
        });
    }
  }, [slug]);

  useEffect(() => {
    // If accessing branded login (/auth/:slug), just show the login form
    // Don't sign out — that would kill sessions in other tabs (e.g. Hub)
    if (slug) return;

    // For /auth (no slug), redirect if already logged in
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          navigate("/atendimento");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/atendimento");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      // Sign out current session before signing in as different user
      await supabase.auth.signOut();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // If logging in via branded slug, set the correct company context
      if (slug) {
        const { data: companyId } = await supabase.rpc("get_company_id_by_slug", { _slug: slug });
        if (companyId) {
          localStorage.setItem("selected_company_id", companyId);
        }
      }

      navigate("/atendimento");
    } catch (error: any) {
      let message = "Ocorreu um erro. Tente novamente.";
      
      if (error.message?.includes("Invalid login credentials")) {
        message = "Email ou senha incorretos.";
      } else if (error.message?.includes("User already registered")) {
        message = "Este email já está cadastrado.";
      } else if (error.message?.includes("Email not confirmed")) {
        message = "Por favor, confirme seu email antes de entrar.";
      }

      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const displayLogo = companyLogo || logoCastelo;
  const displayName = companyName || "Castelo da Diversão";

  if (isLoadingCompany) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background - warm colors only */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-festive/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate("/promo")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao site
        </Button>

        {/* Gradient card with festive colors */}
        <div 
          className="rounded-3xl p-8 border border-primary/20 bg-gradient-to-br from-primary/10 via-secondary/20 to-festive/10 backdrop-blur-sm shadow-floating"
        >
          <div className="text-center mb-8">
            <img 
              src={displayLogo} 
              alt={displayName} 
              className="w-32 mx-auto mb-4 object-contain"
            />
            <h1 className="font-display text-2xl font-bold text-foreground">
              Área Administrativa
            </h1>
            <p className="text-muted-foreground mt-2">
              Entre para gerenciar leads
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-white border-secondary/20"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-white border-secondary/20"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-festive hover:bg-festive/90 text-white font-semibold py-5 rounded-xl transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
