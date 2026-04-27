import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Sparkles, MapPin, Home, Truck, ImageOff } from "lucide-react";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import type { LPGallery, LPTheme } from "@/types/landing-page";

interface DLPGalleryProps {
  gallery: LPGallery;
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

interface GalleryUnit {
  name: string;
  photos: string[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizePhotos(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (isNonEmptyString(item)) return item;
      if (item && typeof item === "object" && "url" in item && isNonEmptyString((item as { url?: unknown }).url)) {
        return (item as { url: string }).url;
      }
      return null;
    })
    .filter((item): item is string => isNonEmptyString(item));
}

function normalizeUnits(gallery: LPGallery, companyName: string): GalleryUnit[] {
  const unitPhotos = Array.isArray(gallery.units)
    ? gallery.units
        .map((unit) => ({
          name: isNonEmptyString(unit?.name) ? unit.name : companyName,
          photos: normalizePhotos(unit?.photos),
        }))
        .filter((unit) => unit.photos.length > 0)
    : [];

  if (unitPhotos.length > 0) return unitPhotos;

  const flatPhotos = normalizePhotos(gallery.photos);
  if (flatPhotos.length > 0) {
    return [{ name: companyName, photos: flatPhotos }];
  }

  const legacyPhotos = normalizePhotos((gallery as LPGallery & { images?: unknown[] }).images);
  if (legacyPhotos.length > 0) {
    return [{ name: companyName, photos: legacyPhotos }];
  }

  return [];
}

export function DLPGallery({ gallery, theme, companyName, onActiveUnitChange }: DLPGalleryProps) {
  const [activeUnit, setActiveUnit] = useState(0);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const handleImageError = useCallback((src: string) => {
    setFailedImages((prev) => new Set(prev).add(src));
  }, []);

  const units = !gallery?.enabled ? [] : normalizeUnits(gallery, companyName);
  const safeActiveUnit = units.length === 0 ? 0 : Math.min(activeUnit, units.length - 1);
  const currentUnitName = units[safeActiveUnit]?.name;

  useEffect(() => {
    if (currentUnitName && onActiveUnitChange) {
      onActiveUnitChange(currentUnitName);
    }
  }, [currentUnitName, onActiveUnitChange]);

  if (!gallery?.enabled) return null;
  if (units.length === 0) return null;

  const currentUnit = units[safeActiveUnit];
  const visiblePhotos = currentUnit.photos.filter((src) => !failedImages.has(src));
  const hasMultipleUnits = units.length >= 2;

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-10 left-10 w-32 h-32 rounded-full blur-3xl"
          style={{ backgroundColor: theme.primary_color + "15" }}
        />
        <div
          className="absolute bottom-10 right-10 w-40 h-40 rounded-full blur-3xl"
          style={{ backgroundColor: theme.secondary_color + "15" }}
        />
      </div>

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
            style={{ backgroundColor: theme.primary_color, color: "#fff" }}
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium" style={{ fontFamily: theme.font_body }}>
              Conheça nossos espaços
            </span>
            <Sparkles className="w-4 h-4" />
          </motion.div>

          <h2
            className="text-3xl md:text-5xl font-bold mb-4"
            style={{ color: theme.text_color, fontFamily: theme.font_heading }}
          >
            {gallery.title || (hasMultipleUnits ? "Nossas Unidades" : "Nosso Espaço")}
          </h2>
          <p
            className="text-lg max-w-md mx-auto"
            style={{ color: theme.text_color + "99", fontFamily: theme.font_body }}
          >
            Veja os espaços incríveis onde realizamos festas inesquecíveis
          </p>
        </motion.div>

        {hasMultipleUnits && (
          <div className="flex justify-center gap-3 mb-8">
            {units.map((unit, idx) => {
              const Icon = getUnitIcon(unit.name);
              return (
                <button
                  key={`${unit.name}-${idx}`}
                  onClick={() => setActiveUnit(idx)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold transition-all duration-300"
                  style={{
                    backgroundColor:
                      safeActiveUnit === idx ? theme.primary_color : theme.text_color + "10",
                    color:
                      safeActiveUnit === idx ? "#fff" : theme.text_color + "99",
                    transform: safeActiveUnit === idx ? "scale(1.05)" : "scale(1)",
                    boxShadow: safeActiveUnit === idx ? `0 4px 15px ${theme.primary_color}40` : "none",
                    fontFamily: theme.font_body,
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {unit.name}
                </button>
              );
            })}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={safeActiveUnit}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {visiblePhotos.map((src, index) => (
              <motion.div
                key={src}
                className="group relative rounded-xl overflow-hidden shadow-lg hover:shadow-2xl aspect-square cursor-pointer transition-shadow duration-300"
                onClick={() => setSelectedImage(index)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <img
                  src={src}
                  alt={`${currentUnit.name} - Foto ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-[1.15] transition-transform duration-500"
                  loading="lazy"
                  onError={() => handleImageError(src)}
                />
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(to top, ${theme.primary_color}80, transparent 60%)`,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Camera className="w-8 h-8 drop-shadow-lg" style={{ color: "#fff" }} />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {selectedImage !== null && visiblePhotos.length > 0 && (
          <ImageLightbox
            images={visiblePhotos}
            currentIndex={selectedImage}
            onClose={() => setSelectedImage(null)}
            onNavigate={setSelectedImage}
          />
        )}
      </div>
    </section>
  );
}
