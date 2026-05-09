import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Copy, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  url: string;
}

export function CompanyQRCodeDialog({ open, onOpenChange, companyName, url }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const getCanvas = () =>
    wrapperRef.current?.querySelector("canvas") as HTMLCanvasElement | null;

  const downloadPng = async (): Promise<Blob | null> => {
    const canvas = getCanvas();
    if (!canvas) return null;
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  };

  const handleDownload = async () => {
    const blob = await downloadPng();
    if (!blob) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `qrcode-${companyName.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleShareWhatsApp = async () => {
    const text = `QR Code do site ${companyName}: ${url}`;

    // Try native share with image (mobile)
    try {
      const blob = await downloadPng();
      if (blob && navigator.canShare) {
        const file = new File([blob], `qrcode-${companyName}.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: companyName, text });
          return;
        }
      }
    } catch {
      // fall through to wa.me
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!", description: url });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>QR Code — {companyName}</DialogTitle>
          <DialogDescription>
            Escaneie ou compartilhe para abrir o site do buffet.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div ref={wrapperRef} className="p-4 bg-white rounded-xl border border-border">
            <QRCodeCanvas value={url} size={240} level="H" includeMargin={false} />
          </div>

          <div className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground truncate flex-1">{url}</p>
            <button onClick={handleCopy} className="p-1 hover:bg-muted rounded" title="Copiar">
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => window.open(url, "_blank")} className="p-1 hover:bg-muted rounded" title="Abrir">
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" /> Baixar PNG
            </Button>
            <Button onClick={handleShareWhatsApp} className="gap-2">
              <Share2 className="h-4 w-4" /> WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
