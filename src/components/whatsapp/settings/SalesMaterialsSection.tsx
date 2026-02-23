import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyUnits } from "@/hooks/useCompanyUnits";
import { useCompany } from "@/contexts/CompanyContext";
import { insertWithCompany } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { FileText, Image, Video, Plus, Pencil, Trash2, Loader2, Upload, FolderOpen, Images, X } from "lucide-react";

interface SalesMaterial {
  id: string;
  unit: string;
  type: "pdf_package" | "photo" | "video" | "photo_collection";
  name: string;
  guest_count: number | null;
  file_url: string;
  file_path: string | null;
  photo_urls: string[] | null;
  sort_order: number;
  is_active: boolean;
}

interface SalesMaterialsSectionProps {
  userId: string;
  isAdmin: boolean;
}

const GUEST_OPTIONS = [50, 60, 70, 80, 90, 100];
// UNITS loaded dynamically via useCompanyUnits
const MAX_PHOTOS_PER_COLLECTION = 10;
const MAX_COLLECTIONS_PER_UNIT = 5;

export function SalesMaterialsSection({ userId, isAdmin }: SalesMaterialsSectionProps) {
  const { unitNames: UNITS } = useCompanyUnits();
  const { currentRole } = useCompany();
  const canManage = isAdmin || currentRole === 'admin' || currentRole === 'owner';
  const [materials, setMaterials] = useState<SalesMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingMaterial, setEditingMaterial] = useState<SalesMaterial | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>(UNITS[0] || "");
  const [selectedType, setSelectedType] = useState<string>("pdf_package");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    type: "pdf_package" as "pdf_package" | "photo" | "video" | "photo_collection",
    guest_count: null as number | null,
    file_url: "",
    file_path: null as string | null,
    photo_urls: [] as string[],
    is_active: true,
    unit: null as string | null,
  });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const photoGridRef = useRef<HTMLDivElement>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("sales_materials")
      .select("*")
      .order("sort_order", { ascending: true });

    if (data) {
      setMaterials(data as SalesMaterial[]);
    }
    setIsLoading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes: Record<string, string[]> = {
      pdf_package: ["application/pdf"],
      photo: ["image/jpeg", "image/png", "image/webp"],
      video: ["video/mp4", "video/quicktime", "video/webm"],
    };

    if (!allowedTypes[formData.type].includes(file.type)) {
      toast({
        title: "Tipo de arquivo inválido",
        description: `Apenas ${formData.type === "pdf_package" ? "PDFs" : formData.type === "photo" ? "imagens" : "vídeos"} são permitidos.`,
        variant: "destructive",
      });
      return;
    }

    // Max size: 50MB
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo é 50MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${selectedUnit.toLowerCase()}/${formData.type}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("sales-materials")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("sales-materials")
        .getPublicUrl(fileName);

      setFormData({
        ...formData,
        file_url: urlData.publicUrl,
        file_path: fileName,
        name: formData.name || file.name.replace(/\.[^/.]+$/, ""),
      });

      toast({
        title: "Upload concluído",
        description: "Arquivo enviado com sucesso!",
      });
    } catch (error: unknown) {
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Erro ao enviar arquivo.",
        variant: "destructive",
      });
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleMultiFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = MAX_PHOTOS_PER_COLLECTION - formData.photo_urls.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      toast({
        title: "Limite de fotos",
        description: `Apenas ${remainingSlots} foto(s) podem ser adicionadas. Máximo de ${MAX_PHOTOS_PER_COLLECTION} por coleção.`,
        variant: "destructive",
      });
    }

    setIsUploading(true);
    setUploadProgress(0);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        
        // Validate file type
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          continue;
        }

        // Max size: 50MB
        if (file.size > 50 * 1024 * 1024) {
          continue;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${selectedUnit.toLowerCase()}/collections/${Date.now()}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("sales-materials")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("sales-materials")
          .getPublicUrl(fileName);

        uploadedUrls.push(urlData.publicUrl);
        setUploadProgress(Math.round(((i + 1) / filesToUpload.length) * 100));
      }

      if (uploadedUrls.length > 0) {
        setFormData({
          ...formData,
          photo_urls: [...formData.photo_urls, ...uploadedUrls],
        });

        toast({
          title: "Upload concluído",
          description: `${uploadedUrls.length} foto(s) enviada(s) com sucesso!`,
        });
      }
    } catch (error: unknown) {
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Erro ao enviar arquivos.",
        variant: "destructive",
      });
    }

    setIsUploading(false);
    setUploadProgress(0);
    if (multiFileInputRef.current) {
      multiFileInputRef.current.value = "";
    }
  };

  const removePhotoFromCollection = (index: number) => {
    const newUrls = [...formData.photo_urls];
    newUrls.splice(index, 1);
    setFormData({ ...formData, photo_urls: newUrls });
  };

  // Drag and drop handlers for reordering photos
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newUrls = [...formData.photo_urls];
    const [draggedUrl] = newUrls.splice(draggedIndex, 1);
    newUrls.splice(targetIndex, 0, draggedUrl);
    
    setFormData({ ...formData, photo_urls: newUrls });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Touch handlers for mobile reordering
  const getIndexFromTouch = useCallback((touch: React.Touch): number | null => {
    if (!photoGridRef.current) return null;
    
    const gridItems = photoGridRef.current.querySelectorAll('[data-photo-index]');
    for (let i = 0; i < gridItems.length; i++) {
      const item = gridItems[i] as HTMLElement;
      const rect = item.getBoundingClientRect();
      if (
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      ) {
        return parseInt(item.dataset.photoIndex || '-1', 10);
      }
    }
    return null;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    
    // Start long press timer for drag initiation
    longPressTimer.current = setTimeout(() => {
      setDraggedIndex(index);
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 200);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (draggedIndex === null) {
      // Cancel long press if user moves finger before timer
      if (longPressTimer.current && touchStartPos.current) {
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchStartPos.current.x);
        const dy = Math.abs(touch.clientY - touchStartPos.current.y);
        if (dx > 10 || dy > 10) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }
      return;
    }

    e.preventDefault();
    const touch = e.touches[0];
    const targetIndex = getIndexFromTouch(touch);
    
    if (targetIndex !== null && targetIndex !== draggedIndex) {
      setDragOverIndex(targetIndex);
    } else {
      setDragOverIndex(null);
    }
  }, [draggedIndex, getIndexFromTouch]);

  const handleTouchEnd = useCallback(() => {
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newUrls = [...formData.photo_urls];
      const [draggedUrl] = newUrls.splice(draggedIndex, 1);
      newUrls.splice(dragOverIndex, 0, draggedUrl);
      setFormData({ ...formData, photo_urls: newUrls });
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
    touchStartPos.current = null;
  }, [draggedIndex, dragOverIndex, formData]);

  const handleSaveMaterial = async () => {
    if (!formData.name) {
      toast({
        title: "Erro",
        description: "Preencha o nome do material.",
        variant: "destructive",
      });
      return;
    }

    if (formData.type === "photo_collection") {
      if (formData.photo_urls.length === 0) {
        toast({
          title: "Erro",
          description: "Adicione pelo menos uma foto à coleção.",
          variant: "destructive",
        });
        return;
      }
    } else if (!formData.file_url) {
      toast({
        title: "Erro",
        description: "Faça upload do arquivo.",
        variant: "destructive",
      });
      return;
    }

    if (formData.type === "pdf_package" && !formData.guest_count) {
      toast({
        title: "Erro",
        description: "Selecione a quantidade de convidados para o pacote.",
        variant: "destructive",
      });
      return;
    }

    // Check collection limit per unit
    if (formData.type === "photo_collection" && !editingMaterial) {
      const existingCollections = materials.filter(
        m => m.unit === selectedUnit && m.type === "photo_collection"
      );
      if (existingCollections.length >= MAX_COLLECTIONS_PER_UNIT) {
        toast({
          title: "Limite de coleções",
          description: `Máximo de ${MAX_COLLECTIONS_PER_UNIT} coleções por unidade.`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsSaving(true);

    try {
      if (editingMaterial) {
        const { error } = await supabase
          .from("sales_materials")
          .update({
            name: formData.name,
            type: formData.type,
            guest_count: formData.type === "pdf_package" ? formData.guest_count : null,
            file_url: formData.type === "photo_collection" 
              ? (formData.photo_urls[0] || "collection") 
              : formData.file_url,
            file_path: formData.file_path,
            photo_urls: formData.type === "photo_collection" ? formData.photo_urls : [],
            is_active: formData.is_active,
            unit: formData.unit || editingMaterial.unit,
          })
          .eq("id", editingMaterial.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Material atualizado com sucesso!",
        });
      } else {
        const unitMaterials = materials.filter(m => m.unit === selectedUnit && m.type === formData.type);
        const maxOrder = unitMaterials.length > 0 
          ? Math.max(...unitMaterials.map(m => m.sort_order)) + 1 
          : 0;

        const { error } = await insertWithCompany("sales_materials", {
          unit: selectedUnit,
          name: formData.name,
          type: formData.type,
          guest_count: formData.type === "pdf_package" ? formData.guest_count : null,
          file_url: formData.type === "photo_collection" 
            ? (formData.photo_urls[0] || "collection") 
            : formData.file_url,
          file_path: formData.file_path,
          photo_urls: formData.type === "photo_collection" ? formData.photo_urls : [],
          is_active: formData.is_active,
          sort_order: maxOrder,
        }) as { error: any };

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Material adicionado com sucesso!",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchMaterials();
    } catch (error: unknown) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar material.",
        variant: "destructive",
      });
    }

    setIsSaving(false);
  };

  const handleDeleteMaterial = async (material: SalesMaterial) => {
    if (!confirm(`Tem certeza que deseja excluir "${material.name}"?`)) {
      return;
    }

    try {
      // Delete from storage if path exists
      if (material.file_path) {
        await supabase.storage
          .from("sales-materials")
          .remove([material.file_path]);
      }

      const { error } = await supabase
        .from("sales_materials")
        .delete()
        .eq("id", material.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Material excluído com sucesso.",
      });

      fetchMaterials();
    } catch (error: unknown) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao excluir material.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (material: SalesMaterial) => {
    try {
      const { error } = await supabase
        .from("sales_materials")
        .update({ is_active: !material.is_active })
        .eq("id", material.id);

      if (error) throw error;

      setMaterials(materials.map(m => 
        m.id === material.id ? { ...m, is_active: !m.is_active } : m
      ));
    } catch (error: unknown) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar material.",
        variant: "destructive",
      });
    }
  };

  const handleOpenDialog = (material?: SalesMaterial) => {
    if (material) {
      setEditingMaterial(material);
      setSelectedUnit(material.unit);
      setFormData({
        name: material.name,
        type: material.type,
        guest_count: material.guest_count,
        file_url: material.file_url,
        file_path: material.file_path,
        photo_urls: material.photo_urls || [],
        is_active: material.is_active,
        unit: material.unit,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingMaterial(null);
    setFormData({
      name: "",
      type: "pdf_package",
      guest_count: null,
      file_url: "",
      file_path: null,
      photo_urls: [],
      is_active: true,
      unit: null,
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "pdf_package":
        return <FileText className="w-5 h-5 text-red-500" />;
      case "photo":
        return <Image className="w-5 h-5 text-blue-500" />;
      case "photo_collection":
        return <Images className="w-5 h-5 text-green-500" />;
      case "video":
        return <Video className="w-5 h-5 text-purple-500" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "pdf_package":
        return "PDF de Pacote";
      case "photo":
        return "Foto";
      case "photo_collection":
        return "Coleção";
      case "video":
        return "Vídeo";
      default:
        return type;
    }
  };

  const filteredMaterials = materials.filter(
    m => m.unit === selectedUnit && m.type === selectedType
  );

  const collectionsCount = materials.filter(
    m => m.unit === selectedUnit && m.type === "photo_collection"
  ).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <Card>
        <CardHeader className="pb-3 px-3 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FolderOpen className="w-5 h-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <CardTitle className="text-base">Materiais</CardTitle>
                <CardDescription className="text-xs">PDFs, coleções, fotos e vídeos</CardDescription>
              </div>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pt-0">
          {/* Unit selector */}
          <div className="mb-4">
            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map(unit => (
                  <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type tabs */}
          <Tabs value={selectedType} onValueChange={setSelectedType}>
            <TabsList className="grid w-full grid-cols-4 mb-3 h-9">
              <TabsTrigger value="pdf_package" className="text-xs px-1">
                <FileText className="w-3.5 h-3.5 sm:mr-1" />
                <span className="hidden sm:inline">PDFs</span>
              </TabsTrigger>
              <TabsTrigger value="photo_collection" className="text-xs px-1">
                <Images className="w-3.5 h-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Coleções</span>
              </TabsTrigger>
              <TabsTrigger value="photo" className="text-xs px-1">
                <Image className="w-3.5 h-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Fotos</span>
              </TabsTrigger>
              <TabsTrigger value="video" className="text-xs px-1">
                <Video className="w-3.5 h-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Vídeos</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedType} className="mt-0">
              {filteredMaterials.length === 0 ? (
                <div className="text-center py-6 border rounded-lg border-dashed">
                  <div className="bg-muted rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2">
                    {getTypeIcon(selectedType)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {selectedType === "photo_collection" 
                      ? "Nenhuma coleção" 
                      : "Nenhum material"
                    }
                  </p>
                  {canManage && (
                    <Button size="sm" variant="outline" onClick={() => handleOpenDialog()}>
                      <Plus className="w-4 h-4 mr-1" />
                      {selectedType === "photo_collection" ? "Nova Coleção" : "Adicionar"}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredMaterials.map((material) => (
                    <div 
                      key={material.id} 
                      className={`flex items-center gap-2 p-2 border rounded-lg ${!material.is_active ? 'opacity-50' : ''}`}
                    >
                      {getTypeIcon(material.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{material.name}</p>
                        {material.type === "photo_collection" && material.photo_urls && (
                          <p className="text-xs text-muted-foreground">
                            {material.photo_urls.length} foto{material.photo_urls.length !== 1 ? 's' : ''}
                          </p>
                        )}
                        {material.guest_count && (
                          <p className="text-xs text-muted-foreground">
                            {material.guest_count} pessoas
                          </p>
                        )}
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Switch
                            checked={material.is_active}
                            onCheckedChange={() => handleToggleActive(material)}
                            className="scale-75"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenDialog(material)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteMaterial(material)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Summary */}
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              {materials.filter(m => m.unit === selectedUnit && m.type === "pdf_package" && m.is_active).length} PDFs · {" "}
              {materials.filter(m => m.unit === selectedUnit && m.type === "photo_collection" && m.is_active).length} coleções · {" "}
              {materials.filter(m => m.unit === selectedUnit && m.type === "photo" && m.is_active).length} fotos · {" "}
              {materials.filter(m => m.unit === selectedUnit && m.type === "video" && m.is_active).length} vídeos
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para criar/editar material */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial ? "Editar Material" : "Novo Material"}
            </DialogTitle>
            <DialogDescription>
              {editingMaterial 
                ? "Edite as informações do material." 
                : `Adicione um novo material para ${selectedUnit}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Unit selector - always visible for editing */}
            <div className="space-y-2">
              <Label>Unidade *</Label>
              <Select 
                value={editingMaterial ? formData.unit || selectedUnit : selectedUnit} 
                onValueChange={(value) => {
                  if (editingMaterial) {
                    setFormData({ ...formData, unit: value });
                  } else {
                    setSelectedUnit(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map(unit => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!editingMaterial && (
              <div className="space-y-2">
                <Label>Tipo de Material *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: "pdf_package" | "photo" | "video" | "photo_collection") => 
                    setFormData({ ...formData, type: value, guest_count: null, photo_urls: [], file_url: "", file_path: null })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf_package">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-red-500" />
                        PDF de Pacote
                      </div>
                    </SelectItem>
                    <SelectItem value="photo_collection" disabled={collectionsCount >= MAX_COLLECTIONS_PER_UNIT}>
                      <div className="flex items-center gap-2">
                        <Images className="w-4 h-4 text-green-500" />
                        Coleção de Fotos ({collectionsCount}/{MAX_COLLECTIONS_PER_UNIT})
                      </div>
                    </SelectItem>
                    <SelectItem value="photo">
                      <div className="flex items-center gap-2">
                        <Image className="w-4 h-4 text-blue-500" />
                        Foto Avulsa
                      </div>
                    </SelectItem>
                    <SelectItem value="video">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-purple-500" />
                        Vídeo do Salão
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.type === "pdf_package" && (
              <div className="space-y-2">
                <Label>Quantidade de Convidados *</Label>
                <Select 
                  value={formData.guest_count?.toString() || ""} 
                  onValueChange={(value) => setFormData({ ...formData, guest_count: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {GUEST_OPTIONS.map(count => (
                      <SelectItem key={count} value={count.toString()}>
                        {count} pessoas
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">
                {formData.type === "photo_collection" ? "Nome da Coleção *" : "Nome do Material *"}
              </Label>
              <Input
                id="name"
                placeholder={
                  formData.type === "pdf_package" 
                    ? "Ex: Pacote Premium 50 pessoas" 
                    : formData.type === "photo_collection"
                      ? "Ex: Área do Buffet"
                      : formData.type === "photo" 
                        ? "Ex: Salão Principal"
                        : "Ex: Tour Virtual"
                }
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Photo Collection Upload */}
            {formData.type === "photo_collection" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Fotos da Coleção * ({formData.photo_urls.length}/{MAX_PHOTOS_PER_COLLECTION})</Label>
                </div>
                
                {/* Photo thumbnails grid */}
                {formData.photo_urls.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {draggedIndex !== null ? "Solte sobre outra foto" : "Segure e arraste para reordenar"}
                    </p>
                    <div 
                      ref={photoGridRef}
                      className="grid grid-cols-5 gap-2"
                    >
                      {formData.photo_urls.map((url, index) => (
                        <div 
                          key={`photo-${index}`}
                          data-photo-index={index}
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={() => handleDrop(index)}
                          onDragEnd={handleDragEnd}
                          onTouchStart={(e) => handleTouchStart(e, index)}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                          className={`relative aspect-square rounded-lg overflow-hidden border group transition-all touch-none select-none ${
                            draggedIndex === index 
                              ? "opacity-50 scale-95 ring-2 ring-primary" 
                              : "cursor-grab active:cursor-grabbing"
                          } ${
                            dragOverIndex === index && draggedIndex !== index 
                              ? "ring-2 ring-primary ring-offset-2 scale-105" 
                              : ""
                          }`}
                        >
                          <img 
                            src={url} 
                            alt={`Foto ${index + 1}`}
                            className="w-full h-full object-cover pointer-events-none"
                          />
                          <button
                            type="button"
                            onClick={() => removePhotoFromCollection(index)}
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 md:opacity-0 transition-opacity"
                            style={{ opacity: draggedIndex === null ? undefined : 0 }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">
                            {index + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {formData.photo_urls.length < MAX_PHOTOS_PER_COLLECTION && (
                  <div 
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => multiFileInputRef.current?.click()}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">
                          Enviando... {uploadProgress}%
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Clique para adicionar fotos
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG ou WebP (máx. 50MB cada)
                        </p>
                      </>
                    )}
                  </div>
                )}

                <input
                  ref={multiFileInputRef}
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleMultiFileUpload}
                />
              </div>
            )}

            {/* Single file upload for other types */}
            {formData.type !== "photo_collection" && (
              <div className="space-y-2">
                <Label>Arquivo *</Label>
                {formData.file_url ? (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    {getTypeIcon(formData.type)}
                    <span className="flex-1 truncate text-sm">
                      {formData.file_path?.split("/").pop() || "Arquivo selecionado"}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setFormData({ ...formData, file_url: "", file_path: null })}
                    >
                      Trocar
                    </Button>
                  </div>
                ) : (
                  <div 
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
                    ) : (
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    )}
                    <p className="text-sm text-muted-foreground">
                      {isUploading ? "Enviando..." : "Clique para fazer upload"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.type === "pdf_package" && "Apenas PDF (máx. 50MB)"}
                      {formData.type === "photo" && "JPG, PNG ou WebP (máx. 50MB)"}
                      {formData.type === "video" && "MP4, MOV ou WebM (máx. 50MB)"}
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={
                    formData.type === "pdf_package" 
                      ? ".pdf,application/pdf" 
                      : formData.type === "photo" 
                        ? ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        : ".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
                  }
                  onChange={handleFileUpload}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Material ativo</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMaterial} disabled={isSaving || isUploading}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                editingMaterial ? "Salvar" : "Adicionar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
