import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Lock, Mail, BarChart3 } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Email inválido");
const passwordSchema = z.string().min(6, "Senha deve ter pelo menos 6 caracteres");

export default function HubLogin() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const checkHubAccess = async (userId: string): Promise<boolean> => {
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userId });
    if (isAdmin === true) return true;

    const { data: uc } = await supabase
      .from("user_companies")
      .select("company_id, role")
      .eq("user_id", userId)
      .in("role", ["owner", "admin"]);

    if (uc && uc.length > 0) {
      const { data: parents } = await supabase
        .from("companies")
        .select("id")
        .in("id", uc.map((u) => u.company_id))
        .is("parent_id", null);

      if (parents && parents.length > 0) {
        const { data: children } = await supabase
          .from("companies")
          .select("id")
          .in("parent_id", parents.map((p) => p.id))
          .limit(1);

        if (children && children.length > 0) return true;
      }
    }
    return false;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (session?.user) {
        const hasAccess = await checkHubAccess(session.user.id);
        if (hasAccess) {
          navigate("/hub");
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
      if (!hasAccess) {
        await supabase.auth.signOut();
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Hub Celebrei</h1>
            <p className="text-muted-foreground mt-2">Acesso ao painel de gestão</p>
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
              <Label htmlFor="password">Senha</Label>
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
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar no Hub"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
