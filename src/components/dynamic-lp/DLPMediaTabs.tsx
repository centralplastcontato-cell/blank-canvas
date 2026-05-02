import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Camera, Play } from "lucide-react";
import { DLPGallery } from "./DLPGallery";
import { DLPVideo } from "./DLPVideo";
import type { LPGallery, LPVideo, LPTheme } from "@/types/landing-page";

interface DLPMediaTabsProps {
  gallery: LPGallery;
  video: LPVideo;
  theme: LPTheme;
  companyName: string;
  companySlug?: string | null;
  onActiveUnitChange?: (unitName: string) => void;
}

export function DLPMediaTabs({
  gallery,
  video,
  theme,
  companyName,
  companySlug,
  onActiveUnitChange,
}: DLPMediaTabsProps) {
  const galleryEnabled = gallery?.enabled !== false;
  const videoEnabled = video?.enabled !== false;
  const [tab, setTab] = useState<"foto" | "video">(galleryEnabled ? "foto" : "video");

  if (!galleryEnabled && !videoEnabled) return null;

  const onlyOne = !(galleryEnabled && videoEnabled);

  return (
    <section className="pt-20 pb-4 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full mb-6 shadow-lg"
            style={{ backgroundColor: theme.primary_color, color: "#fff" }}
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium" style={{ fontFamily: theme.font_body }}>
              Conheça nosso espaço
            </span>
            <Sparkles className="w-4 h-4" />
          </motion.div>

          <h2
            className="text-3xl md:text-5xl font-bold mb-4"
            style={{ color: theme.text_color, fontFamily: theme.font_heading }}
          >
            Conheça nosso espaço
          </h2>
          <p
            className="text-lg max-w-2xl mx-auto"
            style={{ color: theme.text_color + "99", fontFamily: theme.font_body }}
          >
            Veja em fotos e vídeos os espaços incríveis onde realizamos festas inesquecíveis
          </p>
        </motion.div>

        {!onlyOne && (
          <div
            className="flex justify-center gap-2 mb-2 mx-auto w-fit p-1.5 rounded-2xl"
            style={{ backgroundColor: theme.primary_color + "10" }}
          >
            <button
              onClick={() => setTab("foto")}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300"
              style={{
                backgroundColor: tab === "foto" ? theme.primary_color : "transparent",
                color: tab === "foto" ? "#fff" : theme.primary_color,
                fontFamily: theme.font_body,
              }}
            >
              <Camera className="w-5 h-5" />
              Fotos
            </button>
            <button
              onClick={() => setTab("video")}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300"
              style={{
                backgroundColor: tab === "video" ? theme.secondary_color : "transparent",
                color: tab === "video" ? "#fff" : theme.secondary_color,
                fontFamily: theme.font_body,
              }}
            >
              <Play className="w-5 h-5" />
              Vídeo
            </button>
          </div>
        )}
      </div>

      {(onlyOne ? galleryEnabled : tab === "foto") && (
        <DLPGallery
          gallery={gallery}
          theme={theme}
          companyName={companyName}
          onActiveUnitChange={onActiveUnitChange}
          hideHeader
        />
      )}
      {(onlyOne ? videoEnabled : tab === "video") && (
        <DLPVideo
          video={video}
          theme={theme}
          companyName={companyName}
          companySlug={companySlug}
          onActiveUnitChange={onActiveUnitChange}
          hideHeader
        />
      )}
    </section>
  );
}
