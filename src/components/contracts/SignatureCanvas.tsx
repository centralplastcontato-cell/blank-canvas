import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Pen } from "lucide-react";

interface Props {
  onSignatureChange: (dataUrl: string | null) => void;
  width?: number;
  height?: number;
}

export function SignatureCanvas({ onSignatureChange, width = 400, height = 180 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [penColor, setPenColor] = useState("#1a1a1a");

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = penColor;
    }
    return ctx;
  }, [penColor]);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasContent(true);
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && hasContent) {
      onSignatureChange(canvas.toDataURL("image/png"));
    }
  };

  // Update signature on content change
  useEffect(() => {
    if (hasContent) {
      const canvas = canvasRef.current;
      if (canvas) onSignatureChange(canvas.toDataURL("image/png"));
    }
  }, [hasContent]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasContent(false);
    onSignatureChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="border-2 border-dashed border-border/60 rounded-lg bg-white relative overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          width={width * 2}
          height={height * 2}
          style={{ width: "100%", height: `${height}px` }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-muted-foreground/40 text-sm">Desenhe sua assinatura aqui</p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clearCanvas} className="gap-1.5 text-xs">
          <Eraser className="h-3.5 w-3.5" /> Limpar
        </Button>
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={() => setPenColor("#1a1a1a")}
            className={`w-6 h-6 rounded-full border-2 bg-black ${penColor === "#1a1a1a" ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
          />
          <button
            type="button"
            onClick={() => setPenColor("#1e40af")}
            className={`w-6 h-6 rounded-full border-2 bg-blue-800 ${penColor === "#1e40af" ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
          />
        </div>
      </div>
    </div>
  );
}
