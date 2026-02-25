import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Sparkles, MapPin } from "lucide-react";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import type { LPGallery, LPTheme } from "@/types/landing-page";

interface DLPGalleryProps {
  gallery: LPGallery;
  theme: LPTheme;
  companyName: string;
}

interface GalleryUnit {
  name: string;
  photos: string[];
}

export function DLPGallery({ gallery, theme, companyName }: DLPGalleryProps) {
  const [activeUnit, setActiveUnit] = useState(0);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  if (!gallery.enabled) return null;

  // Build units: new format (units[]) or legacy (flat photos[])
  let units: GalleryUnit[] = [];

  if (gallery.units && gallery.units.length > 0) {
    units = gallery.units;
  } else if (gallery.photos.length > 0) {
    units = [{ name: companyName, photos: gallery.photos }];
  }

  if (units.length === 0) return null;

  const hasMultipleUnits = units.length >= 2;

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background blurs */}
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

        {/* Unit Tabs */}
        {hasMultipleUnits && (
          <div className="flex justify-center gap-3 mb-8">
            {units.map((unit, idx) => (
              <button
                key={unit.name}
                onClick={() => setActiveUnit(idx)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold transition-all duration-300"
                style={{
                  backgroundColor:
                    activeUnit === idx ? theme.primary_color : theme.text_color + "10",
                  color:
                    activeUnit === idx ? "#fff" : theme.text_color + "99",
                  transform: activeUnit === idx ? "scale(1.05)" : "scale(1)",
                  boxShadow: activeUnit === idx ? `0 4px 15px ${theme.primary_color}40` : "none",
                  fontFamily: theme.font_body,
                }}
              >
                <MapPin className="w-4 h-4" />
                {unit.name}
              </button>
            ))}
          </div>
        )}

        {/* Photo Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeUnit}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {units[activeUnit].photos.map((src, index) => (
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
                  alt={`${units[activeUnit].name} - Foto ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-[1.15] transition-transform duration-500"
                  loading="lazy"
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

        {selectedImage !== null && (
          <ImageLightbox
            images={units[activeUnit].photos}
            currentIndex={selectedImage}
            onClose={() => setSelectedImage(null)}
            onNavigate={setSelectedImage}
          />
        )}
      </div>
    </section>
  );
}
