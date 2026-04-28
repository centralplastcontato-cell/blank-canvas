import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, MapPin, Home, Truck } from "lucide-react";
import type { LPVideo, LPTheme } from "@/types/landing-page";

interface DLPVideoProps {
  video: LPVideo;
  theme: LPTheme;
  companyName: string;
  onActiveUnitChange?: (unitName: string) => void;
}

type UnitKind = "internal" | "external" | "default";

function getUnitKind(name: string): UnitKind {
  const lower = name.toLowerCase();
  if (lower.includes("externa") || lower.includes("externo") || lower.includes("extern")) return "external";
  if (lower.includes("nosso") || lower.includes("interno") || lower.includes("intern") || lower.includes("buffet")) return "internal";
  return "default";
}

function getUnitIcon(name: string) {
  const kind = getUnitKind(name);
  if (kind === "internal") return Home;
  if (kind === "external") return Truck;
  return MapPin;
}

function getUnitColor(name: string, theme: LPTheme): string {
  const kind = getUnitKind(name);
  if (kind === "external") return theme.secondary_color;
  return theme.primary_color;
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

interface VideoItem {
  name: string;
  video_url: string;
  video_type: "youtube" | "upload";
  poster_url?: string;
  location?: string;
}

interface VideoGroup {
  name: string;
  videos: VideoItem[];
}

export function DLPVideo({ video, theme, companyName, onActiveUnitChange }: DLPVideoProps) {
  const [activeGroupIdx, setActiveGroupIdx] = useState(0);

  let items: VideoItem[] = [];

  if (video?.videos && video.videos.length > 0) {
    // Defensive: filter out null/invalid entries (DB may contain nulls in array)
    items = (video.videos as Array<VideoItem | null | undefined>).filter(
      (v): v is VideoItem => !!v && typeof v === "object" && !!v.video_url
    );
  } else if (video?.video_url) {
    items = [
      {
        name: companyName,
        video_url: video.video_url,
        video_type: video.video_type,
        poster_url: (video as any).poster_url,
        location: "Nosso espaço",
      },
    ];
  }

  // Group videos by name (so duplicates with the same name become a single tab with multiple videos)
  const groups: VideoGroup[] = (() => {
    const map = new Map<string, VideoItem[]>();
    for (const it of items) {
      const key = (it.name || companyName).trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries()).map(([name, videos]) => ({ name, videos }));
  })();

  const isMultiple = groups.length >= 2;
  const safeGroupIdx = groups.length === 0 ? 0 : Math.min(activeGroupIdx, groups.length - 1);
  const currentGroupName = groups[safeGroupIdx]?.name;

  useEffect(() => {
    if (isMultiple && currentGroupName && onActiveUnitChange) {
      onActiveUnitChange(currentGroupName);
    }
  }, [isMultiple, currentGroupName, onActiveUnitChange]);

  if (!video?.enabled) return null;
  if (groups.length === 0) return null;

  const currentVideos = groups[safeGroupIdx].videos;

  return (
    <section className="py-20 relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${theme.background_color} 0%, ${theme.primary_color}08 50%, ${theme.background_color} 100%)`,
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full mb-6 shadow-lg"
            style={{ backgroundColor: theme.secondary_color, color: "#fff" }}
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Play className="w-4 h-4" />
            <span className="text-sm font-medium" style={{ fontFamily: theme.font_body }}>
              Conheça nossos espaços
            </span>
          </motion.div>

          <h2
            className="text-3xl md:text-5xl font-bold mb-4"
            style={{ color: theme.text_color, fontFamily: theme.font_heading }}
          >
            {video.title || (isMultiple ? "Nossos Espaços em Vídeo" : "Conheça Nosso Espaço")}
          </h2>
          <p
            className="text-lg max-w-2xl mx-auto"
            style={{ color: theme.text_color + "99", fontFamily: theme.font_body }}
          >
            Descubra os espaços incríveis onde realizamos festas inesquecíveis
          </p>
        </motion.div>

        {isMultiple && (
          <div className="flex justify-center gap-4 mb-10 flex-wrap">
            {groups.map((group, idx) => {
              const Icon = getUnitIcon(group.name);
              const unitColor = getUnitColor(group.name, theme);
              const isActive = safeGroupIdx === idx;
              return (
                <button
                  key={`${group.name}-${idx}`}
                  onClick={() => setActiveGroupIdx(idx)}
                  className="flex flex-col items-center gap-2 px-7 py-4 rounded-2xl font-bold transition-all duration-300 min-w-[150px]"
                  style={{
                    backgroundColor: isActive ? unitColor : "#fff",
                    color: isActive ? "#fff" : unitColor,
                    border: `2px solid ${unitColor}`,
                    transform: isActive ? "scale(1.08)" : "scale(1)",
                    boxShadow: isActive
                      ? `0 10px 30px ${unitColor}50`
                      : `0 2px 8px ${unitColor}15`,
                    fontFamily: theme.font_body,
                  }}
                >
                  <Icon className="w-8 h-8" strokeWidth={2.2} />
                  <span className="text-base leading-tight">{group.name}</span>
                </button>
              );
            })}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={safeGroupIdx}
            className={`grid gap-6 max-w-5xl mx-auto ${
              currentVideos.length >= 2 ? "md:grid-cols-2" : "md:grid-cols-1 max-w-4xl"
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {currentVideos.map((current, vIdx) => {
              const embedUrl =
                current.video_type === "youtube" ? getYouTubeEmbedUrl(current.video_url) : null;
              return (
                <div
                  key={`${current.video_url}-${vIdx}`}
                  className="relative rounded-2xl overflow-hidden shadow-2xl border-2"
                  style={{
                    borderColor: theme.primary_color + "30",
                    backgroundColor: theme.background_color,
                    boxShadow: `0 20px 50px ${theme.primary_color}15`,
                  }}
                >
                  {embedUrl ? (
                    <div className="aspect-video">
                      <iframe
                        src={embedUrl}
                        title={current.name}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <VideoWithPoster item={current} theme={theme} />
                  )}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function VideoWithPoster({ item, theme }: { item: VideoItem; theme: LPTheme }) {
  const [playing, setPlaying] = useState(false);
  const isLogo = item.poster_url?.toLowerCase().endsWith('.png') || item.poster_url?.toLowerCase().endsWith('.svg');

  return (
    <div className="aspect-[9/16] sm:aspect-video relative overflow-hidden bg-black">
      <video
        src={item.video_url}
        poster={item.poster_url}
        controls
        className="w-full h-full object-contain"
        preload="none"
        playsInline
        aria-label={`Vídeo da ${item.name}`}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      >
        Seu navegador não suporta vídeos.
      </video>
      {item.poster_url && !playing && (
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={(e) => {
            const video = (e.currentTarget.previousElementSibling as HTMLVideoElement);
            video?.play();
          }}
        >
          {isLogo ? (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${theme.primary_color}, ${theme.secondary_color})` }}
            >
              <img
                src={item.poster_url}
                alt={item.name}
                className="max-w-[60%] max-h-[60%] object-contain drop-shadow-2xl"
              />
            </div>
          ) : (
            <img
              src={item.poster_url}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <div className="w-0 h-0 border-l-[20px] border-l-white border-y-[12px] border-y-transparent ml-1.5" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
