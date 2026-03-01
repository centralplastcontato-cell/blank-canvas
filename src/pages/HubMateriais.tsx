import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HubLayout } from "@/components/hub/HubLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, FileText, Video, Image, Images, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

const CURRENT_DOMAIN = "rsezgnkfhodltrsewlhz";

interface Material {
  id: string;
  name: string;
  type: string;
  unit: string | null;
  file_url: string | null;
  file_path: string | null;
  photo_urls: string[] | null;
  guest_count: number | null;
  sort_order: number;
  is_active: boolean;
  company_id: string;
  company_name?: string;
}

interface CompanyOption {
  id: string;
  name: string;
}

function isUrlBroken(url: string | null): boolean {
  if (!url) return true;
  return !url.includes(CURRENT_DOMAIN);
}

function getTypeIcon(type: string) {
  switch (type) {
    case "pdf": return <FileText className="h-5 w-5" />;
    case "video": return <Video className="h-5 w-5" />;
    case "photo_collection": return <Images className="h-5 w-5" />;
    default: return <Image className="h-5 w-5" />;
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case "pdf": return "PDF";
    case "video": return "Vídeo";
    case "photo_collection": return "Coleção de Fotos";
    case "photo": return "Foto";
    default: return type;
  }
}

export default function HubMateriais() {
  return (
    <HubLayout currentPage="materiais" header={<h1 className="text-lg font-bold">Materiais de Venda</h1>}>
      {({ user }) => <MateriaisContent userId={user.id} />}
    </HubLayout>
  );
}

function MateriaisContent({ userId }: { userId: string }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const fetchMaterials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sales_materials")
      .select("*, companies!inner(name)")
      .order("sort_order");

    if (error) {
      toast.error("Erro ao carregar materiais");
      setLoading(false);
      return;
    }

    const mapped = (data || []).map((m: any) => ({
      ...m,
      company_name: m.companies?.name,
    }));
    setMaterials(mapped);

    // Extract unique companies
    const uniqueCompanies = new Map<string, string>();
    mapped.forEach((m: Material) => {
      if (m.company_id && m.company_name) {
        uniqueCompanies.set(m.company_id, m.company_name);
      }
    });
    setCompanies(
      Array.from(uniqueCompanies.entries()).map(([id, name]) => ({ id, name }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const filteredMaterials = selectedCompany === "all"
    ? materials
    : materials.filter((m) => m.company_id === selectedCompany);

  const handleToggleActive = async (material: Material) => {
    const newActive = !material.is_active;
    const { error } = await supabase
      .from("sales_materials")
      .update({ is_active: newActive })
      .eq("id", material.id);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }

    setMaterials((prev) =>
      prev.map((m) => (m.id === material.id ? { ...m, is_active: newActive } : m))
    );
    toast.success(newActive ? "Material ativado" : "Material desativado");
  };

  const handleFileUpload = async (material: Material, files: FileList) => {
    if (!files.length) return;
    setUploading(material.id);

    try {
      if (material.type === "photo_collection") {
        const urls: string[] = [];
        for (const file of Array.from(files)) {
          const ext = file.name.split(".").pop();
          const path = `${material.company_id}/${material.unit || "geral"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("sales-materials")
            .upload(path, file, { upsert: true });
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage
            .from("sales-materials")
            .getPublicUrl(path);
          urls.push(urlData.publicUrl);
        }
        const { error } = await supabase
          .from("sales_materials")
          .update({ photo_urls: urls, is_active: true })
          .eq("id", material.id);
        if (error) throw error;
        setMaterials((prev) =>
          prev.map((m) =>
            m.id === material.id ? { ...m, photo_urls: urls, is_active: true } : m
          )
        );
      } else {
        const file = files[0];
        const ext = file.name.split(".").pop();
        const path = `${material.company_id}/${material.unit || "geral"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("sales-materials")
          .upload(path, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("sales-materials")
          .getPublicUrl(path);
        const newUrl = urlData.publicUrl;
        const { error } = await supabase
          .from("sales_materials")
          .update({ file_url: newUrl, file_path: path, is_active: true })
          .eq("id", material.id);
        if (error) throw error;
        setMaterials((prev) =>
          prev.map((m) =>
            m.id === material.id ? { ...m, file_url: newUrl, file_path: path, is_active: true } : m
          )
        );
      }
      toast.success("Arquivo enviado com sucesso!");
    } catch (err: any) {
      toast.error("Erro no upload: " + (err.message || "Tente novamente"));
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const brokenCount = filteredMaterials.filter((m) => {
    if (m.type === "photo_collection") {
      return !m.photo_urls?.length || m.photo_urls.some((u) => isUrlBroken(u));
    }
    return isUrlBroken(m.file_url);
  }).length;

  return (
    <div className="space-y-6">
      {/* Filters & Summary */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Todas as empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as empresas</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="whitespace-nowrap">
            {filteredMaterials.length} materiais
          </Badge>
        </div>

        {brokenCount > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {brokenCount} com URL quebrada
          </Badge>
        )}
      </div>

      {/* Material Cards */}
      {filteredMaterials.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Nenhum material encontrado.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredMaterials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              uploading={uploading === material.id}
              onToggleActive={handleToggleActive}
              onUpload={handleFileUpload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MaterialCard({
  material,
  uploading,
  onToggleActive,
  onUpload,
}: {
  material: Material;
  uploading: boolean;
  onToggleActive: (m: Material) => void;
  onUpload: (m: Material, files: FileList) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBroken = material.type === "photo_collection"
    ? !material.photo_urls?.length || material.photo_urls.some((u) => isUrlBroken(u))
    : isUrlBroken(material.file_url);

  const acceptAttr = material.type === "photo_collection"
    ? "*/*,.jpg,.jpeg,.png,.webp"
    : material.type === "pdf"
      ? "*/*,.pdf"
      : material.type === "video"
        ? "*/*,.mp4,.mov,.webm"
        : "*/*";

  return (
    <Card className={`transition-all ${isBroken ? "border-destructive/50 bg-destructive/5" : ""}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {getTypeIcon(material.type)}
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{material.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {material.company_name} {material.unit ? `• ${material.unit}` : ""}
              </p>
            </div>
          </div>
          <Switch
            checked={material.is_active}
            onCheckedChange={() => onToggleActive(material)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">{getTypeLabel(material.type)}</Badge>

          {material.guest_count && (
            <Badge variant="secondary" className="text-xs">{material.guest_count} pessoas</Badge>
          )}

          {isBroken ? (
            <Badge variant="destructive" className="text-xs flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Quebrada
            </Badge>
          ) : (
            <Badge className="text-xs flex items-center gap-1 bg-green-100 text-green-700 border-transparent">
              <CheckCircle2 className="h-3 w-3" /> OK
            </Badge>
          )}
        </div>

        {/* Upload button */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={acceptAttr}
          multiple={material.type === "photo_collection"}
          onChange={(e) => {
            if (e.target.files?.length) onUpload(material, e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          variant={isBroken ? "default" : "outline"}
          size="sm"
          className="w-full"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" /> {isBroken ? "Enviar arquivo" : "Substituir arquivo"}</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
