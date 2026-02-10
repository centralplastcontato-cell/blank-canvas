import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LPTheme } from "@/types/landing-page";

interface ThemeEditorProps {
  data: LPTheme;
  onChange: (data: LPTheme) => void;
}

const FONT_OPTIONS = [
  "Inter", "Poppins", "Montserrat", "Playfair Display", "Raleway",
  "Roboto", "Open Sans", "Lato", "Oswald", "Nunito",
];

export function ThemeEditor({ data, onChange }: ThemeEditorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Cor primária</Label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={data.primary_color}
              onChange={(e) => onChange({ ...data, primary_color: e.target.value })}
              className="h-9 w-12 rounded border border-border cursor-pointer"
            />
            <Input
              value={data.primary_color}
              onChange={(e) => onChange({ ...data, primary_color: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>

        <div>
          <Label>Cor secundária</Label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={data.secondary_color}
              onChange={(e) => onChange({ ...data, secondary_color: e.target.value })}
              className="h-9 w-12 rounded border border-border cursor-pointer"
            />
            <Input
              value={data.secondary_color}
              onChange={(e) => onChange({ ...data, secondary_color: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>

        <div>
          <Label>Cor de fundo</Label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={data.background_color}
              onChange={(e) => onChange({ ...data, background_color: e.target.value })}
              className="h-9 w-12 rounded border border-border cursor-pointer"
            />
            <Input
              value={data.background_color}
              onChange={(e) => onChange({ ...data, background_color: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>

        <div>
          <Label>Cor do texto</Label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={data.text_color}
              onChange={(e) => onChange({ ...data, text_color: e.target.value })}
              className="h-9 w-12 rounded border border-border cursor-pointer"
            />
            <Input
              value={data.text_color}
              onChange={(e) => onChange({ ...data, text_color: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Fonte dos títulos</Label>
          <Select
            value={data.font_heading}
            onValueChange={(v) => onChange({ ...data, font_heading: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (
                <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Fonte do corpo</Label>
          <Select
            value={data.font_body}
            onValueChange={(v) => onChange({ ...data, font_body: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (
                <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Estilo dos botões</Label>
        <Select
          value={data.button_style}
          onValueChange={(v) => onChange({ ...data, button_style: v as LPTheme["button_style"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rounded">Arredondado</SelectItem>
            <SelectItem value="pill">Pílula</SelectItem>
            <SelectItem value="square">Quadrado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Preview swatch */}
      <div className="mt-4 p-4 rounded-lg border border-border" style={{ backgroundColor: data.background_color }}>
        <p className="text-sm font-bold mb-1" style={{ color: data.text_color, fontFamily: data.font_heading }}>
          Preview do Título
        </p>
        <p className="text-xs mb-3" style={{ color: data.text_color, fontFamily: data.font_body, opacity: 0.8 }}>
          Assim ficará o texto do corpo na landing page.
        </p>
        <div className="flex gap-2">
          <span
            className={`px-4 py-1.5 text-xs font-medium text-white ${
              data.button_style === "pill" ? "rounded-full" : data.button_style === "square" ? "rounded-none" : "rounded-lg"
            }`}
            style={{ backgroundColor: data.primary_color }}
          >
            Primário
          </span>
          <span
            className={`px-4 py-1.5 text-xs font-medium text-white ${
              data.button_style === "pill" ? "rounded-full" : data.button_style === "square" ? "rounded-none" : "rounded-lg"
            }`}
            style={{ backgroundColor: data.secondary_color }}
          >
            Secundário
          </span>
        </div>
      </div>
    </div>
  );
}
