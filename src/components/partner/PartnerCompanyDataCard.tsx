import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Store, Camera, ImagePlus, Loader2, Pencil, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export function PartnerCompanyDataCard() {
  const { currentCompany, refreshCompanies } = useCompany();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentCompany) {
      setName(currentCompany.name || "");
      setLogoUrl(currentCompany.logo_url || "");
    }
  }, [currentCompany]);

  const handleImageUpload = async (file: File) => {
    if (!file || !currentCompany) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${currentCompany.id}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(fileName, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("company-logos")
        .getPublicUrl(fileName);

      setLogoUrl(urlData.publicUrl + "?t=" + Date.now());
      toast.success("Logo enviada!");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Erro ao enviar logo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!currentCompany || !name.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({ name: name.trim(), logo_url: logoUrl || null })
        .eq("id", currentCompany.id);

      if (error) throw error;
      await refreshCompanies();
      setIsEditing(false);
      toast.success("Dados atualizados!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar dados");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(currentCompany?.name || "");
    setLogoUrl(currentCompany?.logo_url || "");
    setIsEditing(false);
  };

  const initials = (currentCompany?.name || "P").slice(0, 2).toUpperCase();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Store className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-base">Dados da Empresa</CardTitle>
        </div>
        {!isEditing && (
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <Avatar className="h-20 w-20 border-2 border-border">
            <AvatarImage src={logoUrl} alt={name} />
            <AvatarFallback className="text-lg font-bold">{initials}</AvatarFallback>
          </Avatar>
          {isEditing && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Camera className="h-4 w-4 mr-1" />}
                Câmera
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ImagePlus className="h-4 w-4 mr-1" />}
                Galeria
              </Button>
            </div>
          )}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Name */}
        <div>
          <Label className="text-xs text-muted-foreground">Nome da Empresa</Label>
          {isEditing ? (
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          ) : (
            <p className="text-sm font-medium mt-1">{currentCompany?.name || "—"}</p>
          )}
        </div>

        {/* Slug (read-only) */}
        <div>
          <Label className="text-xs text-muted-foreground">Identificador (slug)</Label>
          <p className="text-sm text-muted-foreground mt-1">{currentCompany?.slug || "—"}</p>
        </div>

        {/* Actions */}
        {isEditing && (
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={isSaving || isUploading || !name.trim()} className="flex-1">
              {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Salvar
            </Button>
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
