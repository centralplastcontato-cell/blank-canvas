import { useState, useEffect, useRef } from "react";
import { HubLayout } from "@/components/hub/HubLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Loader2,
  Play,
  Eye,
  EyeOff,
  Video,
} from "lucide-react";

interface TrainingLesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  category: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
}

const CATEGORIES = [
  "Geral",
  "WhatsApp",
  "CRM",
  "Agenda",
  "Operações",
  "Configurações",
  "Inteligência",
  "Landing Page",
];

export default function HubTreinamento() {
  const [lessons, setLessons] = useState<TrainingLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<TrainingLesson | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("Geral");
  const [formPublished, setFormPublished] = useState(false);
  const [formVideoUrl, setFormVideoUrl] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const fetchLessons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("training_lessons")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (!error && data) setLessons(data as TrainingLesson[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchLessons();
  }, []);

  const openNewDialog = () => {
    setEditingLesson(null);
    setFormTitle("");
    setFormDescription("");
    setFormCategory("Geral");
    setFormPublished(false);
    setFormVideoUrl("");
    setDialogOpen(true);
  };

  const openEditDialog = (lesson: TrainingLesson) => {
    setEditingLesson(lesson);
    setFormTitle(lesson.title);
    setFormDescription(lesson.description || "");
    setFormCategory(lesson.category || "Geral");
    setFormPublished(lesson.is_published);
    setFormVideoUrl(lesson.video_url);
    setDialogOpen(true);
  };

  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Por favor, selecione um arquivo de vídeo.");
      return;
    }

    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      toast.error("O arquivo é muito grande. Máximo: 500MB.");
      return;
    }

    setUploading(true);
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    const { data, error } = await supabase.storage
      .from("training-videos")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (error) {
      toast.error("Erro ao fazer upload do vídeo.");
      console.error(error);
    } else {
      const { data: urlData } = supabase.storage
        .from("training-videos")
        .getPublicUrl(data.path);
      setFormVideoUrl(urlData.publicUrl);
      toast.success("Vídeo enviado com sucesso!");
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast.error("O título é obrigatório.");
      return;
    }
    if (!formVideoUrl.trim()) {
      toast.error("É necessário fazer upload de um vídeo.");
      return;
    }

    setSaving(true);

    const payload = {
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      video_url: formVideoUrl,
      category: formCategory,
      is_published: formPublished,
    };

    if (editingLesson) {
      const { error } = await supabase
        .from("training_lessons")
        .update(payload)
        .eq("id", editingLesson.id);

      if (error) {
        toast.error("Erro ao atualizar aula.");
        console.error(error);
      } else {
        toast.success("Aula atualizada!");
        setDialogOpen(false);
        fetchLessons();
      }
    } else {
      const nextOrder = lessons.length > 0 ? Math.max(...lessons.map((l) => l.sort_order)) + 1 : 0;
      const { error } = await supabase
        .from("training_lessons")
        .insert({ ...payload, sort_order: nextOrder });

      if (error) {
        toast.error("Erro ao criar aula.");
        console.error(error);
      } else {
        toast.success("Aula criada!");
        setDialogOpen(false);
        fetchLessons();
      }
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from("training_lessons").delete().eq("id", deletingId);
    if (error) {
      toast.error("Erro ao excluir aula.");
    } else {
      toast.success("Aula excluída!");
      fetchLessons();
    }
    setDeleteDialogOpen(false);
    setDeletingId(null);
  };

  const togglePublish = async (lesson: TrainingLesson) => {
    const { error } = await supabase
      .from("training_lessons")
      .update({ is_published: !lesson.is_published })
      .eq("id", lesson.id);

    if (!error) {
      toast.success(lesson.is_published ? "Aula despublicada" : "Aula publicada!");
      fetchLessons();
    }
  };

  const filteredLessons = filterCategory === "all"
    ? lessons
    : lessons.filter((l) => l.category === filterCategory);

  return (
    <HubLayout currentPage="treinamento" header={
      <div className="flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Treinamento</h1>
      </div>
    }>
      {() => (
        <div className="space-y-6">
          {/* Actions bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Aula
            </Button>
          </div>

          {/* Lessons grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLessons.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Nenhuma aula encontrada.</p>
              <Button variant="outline" className="mt-4" onClick={openNewDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira aula
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLessons.map((lesson) => (
                <Card key={lesson.id} className="overflow-hidden group">
                  {/* Video preview area */}
                  <div
                    className="relative aspect-video bg-muted flex items-center justify-center cursor-pointer"
                    onClick={() => setPreviewUrl(lesson.video_url)}
                  >
                    {lesson.thumbnail_url ? (
                      <img src={lesson.thumbnail_url} alt={lesson.title} className="w-full h-full object-cover" />
                    ) : (
                      <Video className="h-12 w-12 text-muted-foreground/40" />
                    )}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-10 w-10 text-white" />
                    </div>
                    {/* Status badge */}
                    <Badge
                      variant={lesson.is_published ? "default" : "secondary"}
                      className="absolute top-2 right-2 text-xs"
                    >
                      {lesson.is_published ? "Publicada" : "Rascunho"}
                    </Badge>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {lesson.category && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {lesson.category}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm line-clamp-2">{lesson.title}</h3>
                      {lesson.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {lesson.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => openEditDialog(lesson)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => togglePublish(lesson)}
                      >
                        {lesson.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeletingId(lesson.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Create/Edit Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingLesson ? "Editar Aula" : "Nova Aula"}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Título / Tópico *</Label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ex: Como configurar o WhatsApp"
                  />
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Descreva o conteúdo da aula..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Categoria</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Vídeo *</Label>
                  {formVideoUrl ? (
                    <div className="space-y-2">
                      <video
                        src={formVideoUrl}
                        controls
                        className="w-full rounded-lg max-h-48 bg-black"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                        Trocar vídeo
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? (
                        <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Clique para fazer upload do vídeo
                          </p>
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            Máximo: 500MB
                          </p>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleUploadVideo}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={formPublished}
                    onCheckedChange={setFormPublished}
                  />
                  <Label className="cursor-pointer">Publicar aula</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingLesson ? "Salvar" : "Criar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete confirmation */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir aula?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. A aula será removida permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Video preview dialog */}
          <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden">
              <video src={previewUrl || ""} controls autoPlay className="w-full" />
            </DialogContent>
          </Dialog>
        </div>
      )}
    </HubLayout>
  );
}
