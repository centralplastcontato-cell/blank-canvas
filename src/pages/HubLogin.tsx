import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Lock, Mail } from "lucide-react";
import { LoadingScreen } from "@/components/ui/loading-screen";
import CelebreiLogo from "@/components/hub-landing/CelebreiLogo";
import { z } from "zod";
import { hasAnyCompany, hasHubAccess } from "@/lib/hubAccess";

const emailSchema = z.string().email("Email inválido");
const passwordSchema = z.string().min(6, "Senha deve ter pelo menos 6 caracteres");

export default function HubLogin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const checkHubAccess = hasHubAccess;

  // Hubcelebrei.com.br também é a porta de entrada dos buffets: quem não é da
  // Celebrei mas faz parte de um buffet vai para a plataforma de atendimento
  const goToPlatform = async (userId: string): Promise<boolean> => {
    if (!(await hasAnyCompany(userId))) return false;
    navigate("/atendimento");
    return true;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (session?.user) {
        const hasAccess = await checkHubAccess(session.user.id);
        if (hasAccess) {
          navigate("/hub");
        } else if (await goToPlatform(session.user.id)) {
          return;
        }
      }
      setIsCheckingAccess(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const hasAccess = await checkHubAccess(session.user.id);
        if (hasAccess) {
          navigate("/hub");
          return;
        }
        if (await goToPlatform(session.user.id)) return;
      }
      setIsCheckingAccess(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Erro de validação", description: error.errors[0].message, variant: "destructive" });
        return;
      }
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const hasAccess = await checkHubAccess(data.user.id);
      if (!hasAccess && (await goToPlatform(data.user.id))) return;
      if (!hasAccess) {
        await supabase.auth.signOut({ scope: "local" });
        toast({
          title: "Acesso negado",
          description: "Sua conta não tem permissão para acessar o Hub.",
          variant: "destructive",
        });
        return;
      }

      navigate("/hub");
    } catch (error: any) {
      let message = "Ocorreu um erro. Tente novamente.";
      if (error.message?.includes("Invalid login credentials")) {
        message = "Email ou senha incorretos.";
      }
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAccess) {
    return <LoadingScreen message="Verificando acesso..." />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="rounded-3xl p-8 border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 backdrop-blur-sm shadow-lg">
          <div className="text-center mb-8">
            <a href="/" className="mx-auto mb-6 inline-flex" aria-label="Celebrei, página inicial">
              <CelebreiLogo className="text-2xl" markClassName="h-10 w-10" />
            </a>
            <h1 className="font-display text-2xl font-bold text-foreground">Entrar na sua conta</h1>
            <p className="text-muted-foreground mt-2">Use o e-mail e a senha do seu cadastro</p>
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
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <a href="/redefinir-senha" className="text-xs text-muted-foreground hover:text-foreground hover:underline">Esqueci minha senha</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-5 rounded-xl font-semibold transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Ainda não tem conta? <a href="/comecar" className="font-semibold text-primary hover:underline">Criar conta grátis</a>
          </p>
        </div>
      </div>
    </div>
  );
}
