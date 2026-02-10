import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LPVideo } from "@/types/landing-page";

interface VideoEditorProps {
  data: LPVideo;
  onChange: (data: LPVideo) => void;
}

export function VideoEditor({ data, onChange }: VideoEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Seção ativa</Label>
        <Switch
          checked={data.enabled}
          onCheckedChange={(enabled) => onChange({ ...data, enabled })}
        />
      </div>

      <div>
        <Label>Título da seção</Label>
        <Input
          value={data.title}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          placeholder="Ex: Conheça nosso espaço"
        />
      </div>

      <div>
        <Label>Tipo de vídeo</Label>
        <Select
          value={data.video_type}
          onValueChange={(v) => onChange({ ...data, video_type: v as "youtube" | "upload" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="upload">Link direto (MP4)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>{data.video_type === "youtube" ? "URL do YouTube" : "URL do vídeo (MP4)"}</Label>
        <Input
          value={data.video_url || ""}
          onChange={(e) => onChange({ ...data, video_url: e.target.value || null })}
          placeholder={data.video_type === "youtube" ? "https://youtube.com/watch?v=..." : "https://...video.mp4"}
        />
      </div>
    </div>
  );
}
