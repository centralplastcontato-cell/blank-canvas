import { motion } from "framer-motion";
import { Play, MapPin } from "lucide-react";
import type { LPVideo, LPTheme } from "@/types/landing-page";

interface DLPVideoProps {
  video: LPVideo;
  theme: LPTheme;
  companyName: string;
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
  } catch {
    // ignore
  }
  return null;
}

export function DLPVideo({ video, theme, companyName }: DLPVideoProps) {
  if (!video.enabled || !video.video_url) return null;

  const embedUrl =
    video.video_type === "youtube" ? getYouTubeEmbedUrl(video.video_url) : null;

  return (
    <section
      className="py-16 md:py-24"
      style={{
        background: `linear-gradient(to bottom, ${theme.background_color}, ${theme.primary_color}11)`,
      }}
    >
      <div className="max-w-5xl mx-auto px-4">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full mb-6 shadow-lg"
            style={{
              backgroundColor: theme.secondary_color,
              color: theme.text_color,
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Play className="w-4 h-4" />
            <span className="text-sm font-medium" style={{ fontFamily: theme.font_body }}>
              Conheça nosso espaço
            </span>
          </motion.div>

          <h2
            className="text-3xl md:text-5xl font-bold mb-4"
            style={{ color: theme.text_color, fontFamily: theme.font_heading }}
          >
            {video.title}
          </h2>
          <p
            className="text-lg max-w-2xl mx-auto opacity-70"
            style={{ color: theme.text_color, fontFamily: theme.font_body }}
          >
            Descubra os espaços incríveis onde realizamos festas inesquecíveis
          </p>
        </motion.div>

        <motion.div
          className="group"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl border-2"
            style={{ borderColor: theme.primary_color + "22" }}
          >
            {embedUrl ? (
              <div className="aspect-video">
                <iframe
                  src={embedUrl}
                  title={video.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="aspect-[9/16] md:aspect-video relative">
                <video
                  src={video.video_url}
                  controls
                  className="w-full h-full object-cover"
                  preload="none"
                  playsInline
                  aria-label={`Vídeo de ${companyName}`}
                >
                  Seu navegador não suporta vídeos.
                </video>
              </div>
            )}

            {/* Unit Info Bar */}
            <div
              className="p-5"
              style={{
                background: `linear-gradient(to top, ${theme.background_color}, ${theme.background_color}cc)`,
              }}
            >
              <div className="flex items-center justify-between">
                <h3
                  className="text-xl font-bold"
                  style={{ color: theme.text_color, fontFamily: theme.font_heading }}
                >
                  {companyName}
                </h3>
                <div className="flex items-center gap-1 text-sm opacity-70">
                  <MapPin className="w-4 h-4" style={{ color: theme.primary_color }} />
                  <span style={{ color: theme.text_color, fontFamily: theme.font_body }}>
                    Nosso espaço
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
