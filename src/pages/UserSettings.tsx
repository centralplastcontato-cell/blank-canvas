import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { toast } from "@/hooks/use-toast";
import { Loader2, Camera, Menu, Save, KeyRound, User as UserIcon } from "lucide-react";
import logoCastelo from "@/assets/logo-castelo.png";
import { z } from "zod";

const nameSchema = z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome muito longo");
const emailSchema = z.string().trim().email("Email inválido").max(255, "Email muito longo");
const passwordSchema = z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(72, "Senha muito longa");

export default function UserSettings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Profile state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  
  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  const { role, isLoading: isLoadingRole, canManageUsers, isAdmin } = useUserRole(user?.id);
  const { hasPermission } = usePermissions(user?.id);
  const canAccessB2B = isAdmin || hasPermission('b2b.view');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [isLoading, user, navigate]);

  // Fetch profile data
  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      
      supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setFullName(data.full_name || "");
            setAvatarUrl(data.avatar_url);
          }
        });
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Você saiu da sua conta.",
    });
    navigate("/auth");
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleSaveProfile = async () => {
    try {
      // Validate name
      const nameResult = nameSchema.safeParse(fullName);
      if (!nameResult.success) {
        toast({
          title: "Erro de validação",
          description: nameResult.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      // Validate email if changed
      if (email !== user?.email) {
        const emailResult = emailSchema.safeParse(email);
        if (!emailResult.success) {
          toast({
            title: "Erro de validação",
            description: emailResult.error.errors[0].message,
            variant: "destructive",
          });
          return;
        }
      }

      setIsSavingProfile(true);

      // Update profile name
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: nameResult.data, email: email.trim() })
        .eq("user_id", user?.id);

      if (profileError) throw profileError;

      // Update email in auth if changed
      if (email !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email.trim(),
        });
        
        if (emailError) throw emailError;
        
        toast({
          title: "Perfil atualizado",
          description: "Um email de confirmação foi enviado para o novo endereço.",
        });
      } else {
        toast({
          title: "Perfil atualizado",
          description: "Suas informações foram salvas com sucesso.",
        });
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      // Validate password
      const passwordResult = passwordSchema.safeParse(newPassword);
      if (!passwordResult.success) {
        toast({
          title: "Erro de validação",
          description: passwordResult.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        toast({
          title: "Erro",
          description: "As senhas não coincidem.",
          variant: "destructive",
        });
        return;
      }

      setIsSavingPassword(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setNewPassword("");
      setConfirmPassword("");
      
      toast({
        title: "Senha alterada",
        description: "Sua senha foi atualizada com sucesso.",
      });
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 2MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploadingAvatar(true);

      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      
      toast({
        title: "Foto atualizada",
        description: "Sua foto de perfil foi alterada.",
      });
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Erro ao enviar foto",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (isLoading || isLoadingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !role) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Mobile layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Mobile Header */}
        <header className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 p-0">
                    <SheetHeader className="p-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <img src={logoCastelo} alt="Castelo da Diversão" className="h-10 w-auto" />
                        <div>
                          <SheetTitle className="text-left text-base">Castelo da Diversão</SheetTitle>
                          <p className="text-xs text-muted-foreground">{fullName || user.email}</p>
                        </div>
                      </div>
                    </SheetHeader>
                    
                    <nav className="flex flex-col p-2">
                      <Button variant="ghost" className="justify-start h-11 px-3" onClick={() => { navigate("/atendimento"); setIsMobileMenuOpen(false); }}>
                        Central de Atendimento
                      </Button>
                      
                      {canManageUsers && (
                        <Button variant="ghost" className="justify-start h-11 px-3" onClick={() => { navigate("/users"); setIsMobileMenuOpen(false); }}>
                          Gerenciar Usuários
                        </Button>
                      )}
                      
                      <Button variant="secondary" className="justify-start h-11 px-3" onClick={() => setIsMobileMenuOpen(false)}>
                        Configurações
                      </Button>
                      
                      <Separator className="my-2" />
                      
                      <Button variant="ghost" className="justify-start h-11 px-3 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}>
                        Sair da Conta
                      </Button>
                    </nav>
                  </SheetContent>
                </Sheet>

                <div className="flex items-center gap-2 min-w-0">
                  <img src={logoCastelo} alt="Castelo da Diversão" className="h-8 w-auto shrink-0" />
                  <h1 className="font-display font-bold text-foreground text-sm truncate">Configurações</h1>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 space-y-4">
          {/* Avatar Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserIcon className="w-5 h-5" />
                Foto de Perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {getInitials(fullName || user.email || "U")}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-lg"
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <p className="text-sm text-muted-foreground">Clique no ícone para alterar</p>
            </CardContent>
          </Card>

          {/* Profile Info Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Informações Pessoais</CardTitle>
              <CardDescription>Atualize seu nome e email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome"
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="text-base"
                />
              </div>
              <Button 
                onClick={handleSaveProfile} 
                disabled={isSavingProfile}
                className="w-full"
              >
                {isSavingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>

          {/* Password Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                Alterar Senha
              </CardTitle>
              <CardDescription>Defina uma nova senha para sua conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="text-base"
                />
              </div>
              <Button 
                onClick={handleChangePassword} 
                disabled={isSavingPassword || !newPassword || !confirmPassword}
                variant="secondary"
                className="w-full"
              >
                {isSavingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <KeyRound className="h-4 w-4 mr-2" />
                )}
                Alterar Senha
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Desktop layout
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar 
          canManageUsers={canManageUsers}
          canAccessB2B={canAccessB2B}
          currentUserName={fullName || user.email || ""} 
          onRefresh={handleRefresh} 
          onLogout={handleLogout} 
        />
        
        <SidebarInset className="flex-1 flex flex-col">
          {/* Desktop Header */}
          <header className="bg-card border-b border-border sticky top-0 z-10">
            <div className="px-4 py-3 flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="font-display font-bold text-foreground text-lg">Configurações</h1>
                <p className="text-sm text-muted-foreground">Gerencie suas informações pessoais</p>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6">
            <div className="max-w-2xl space-y-6">
              {/* Avatar Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5" />
                    Foto de Perfil
                  </CardTitle>
                  <CardDescription>
                    Sua foto será exibida em todo o sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {getInitials(fullName || user.email || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-lg"
                      onClick={handleAvatarClick}
                      disabled={isUploadingAvatar}
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                  <div>
                    <p className="font-medium">{fullName || "Seu Nome"}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique no ícone da câmera para alterar sua foto
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Profile Info Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações Pessoais</CardTitle>
                  <CardDescription>
                    Atualize seu nome e endereço de email
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Nome Completo</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Seu nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveProfile} 
                      disabled={isSavingProfile}
                    >
                      {isSavingProfile ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Salvar Alterações
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Password Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5" />
                    Alterar Senha
                  </CardTitle>
                  <CardDescription>
                    Defina uma nova senha para sua conta
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nova Senha</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleChangePassword} 
                      disabled={isSavingPassword || !newPassword || !confirmPassword}
                      variant="secondary"
                    >
                      {isSavingPassword ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <KeyRound className="h-4 w-4 mr-2" />
                      )}
                      Alterar Senha
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}