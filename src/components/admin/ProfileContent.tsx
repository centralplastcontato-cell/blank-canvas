import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Camera, Save, KeyRound, User as UserIcon } from "lucide-react";
import { z } from "zod";

const nameSchema = z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome muito longo");
const emailSchema = z.string().trim().email("Email inválido").max(255, "Email muito longo");
const passwordSchema = z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(72, "Senha muito longa");

interface ProfileContentProps {
  userId: string;
  userEmail: string;
}

const getInitials = (name: string) => {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

export function ProfileContent({ userId, userEmail }: ProfileContentProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(userEmail);
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [_loaded, setLoaded] = useState(false);

  // Fetch profile data on mount
  useState(() => {
    supabase
      .from("profiles")
      .select("full_name, avatar_url, bio")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setFullName(data.full_name || "");
          setAvatarUrl(data.avatar_url);
          setBio((data as any).bio || "");
        }
        setLoaded(true);
      });
  });

  const handleSaveProfile = async () => {
    try {
      const nameResult = nameSchema.safeParse(fullName);
      if (!nameResult.success) {
        toast({ title: "Erro de validação", description: nameResult.error.errors[0].message, variant: "destructive" });
        return;
      }
      if (email !== userEmail) {
        const emailResult = emailSchema.safeParse(email);
        if (!emailResult.success) {
          toast({ title: "Erro de validação", description: emailResult.error.errors[0].message, variant: "destructive" });
          return;
        }
      }
      setIsSavingProfile(true);
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: nameResult.data, email: email.trim(), bio: bio.trim() || null } as any)
        .eq("user_id", userId);
      if (profileError) throw profileError;
      if (email !== userEmail) {
        const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() });
        if (emailError) throw emailError;
        toast({ title: "Perfil atualizado", description: "Um email de confirmação foi enviado para o novo endereço." });
      } else {
        toast({ title: "Perfil atualizado", description: "Suas informações foram salvas com sucesso." });
      }
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      const passwordResult = passwordSchema.safeParse(newPassword);
      if (!passwordResult.success) {
        toast({ title: "Erro de validação", description: passwordResult.error.errors[0].message, variant: "destructive" });
        return;
      }
      if (newPassword !== confirmPassword) {
        toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
        return;
      }
      setIsSavingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Senha alterada", description: "Sua senha foi atualizada com sucesso." });
    } catch (error: any) {
      toast({ title: "Erro ao alterar senha", description: error.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Por favor, selecione uma imagem.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "A imagem deve ter no máximo 2MB.", variant: "destructive" });
      return;
    }
    try {
      setIsUploadingAvatar(true);
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", userId);
      if (updateError) throw updateError;
      setAvatarUrl(publicUrl);
      toast({ title: "Foto atualizada", description: "Sua foto de perfil foi alterada." });
    } catch (error: any) {
      toast({ title: "Erro ao enviar foto", description: error.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Avatar Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            Foto de Perfil
          </CardTitle>
          <CardDescription>Sua foto será exibida em todo o sistema</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {getInitials(fullName || userEmail || "U")}
              </AvatarFallback>
            </Avatar>
            <Button
              size="icon"
              variant="secondary"
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-lg"
              onClick={handleAvatarClick}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div>
            <p className="font-medium">{fullName || "Seu Nome"}</p>
            <p className="text-sm text-muted-foreground">{userEmail}</p>
            <p className="text-xs text-muted-foreground mt-1">Clique no ícone da câmera para alterar sua foto</p>
          </div>
        </CardContent>
      </Card>

      {/* Profile Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
          <CardDescription>Atualize seu nome e endereço de email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome completo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Conte um pouco sobre você..." className="resize-none" rows={3} maxLength={300} />
              <p className="text-xs text-muted-foreground text-right">{bio.length}/300</p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
              {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
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
          <CardDescription>Defina uma nova senha para sua conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleChangePassword} disabled={isSavingPassword || !newPassword || !confirmPassword} variant="secondary">
              {isSavingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
              Alterar Senha
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
