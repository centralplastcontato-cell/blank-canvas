import { useState } from "react";
import { Instagram, Sparkles, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageLightbox } from "@/components/ui/image-lightbox";

const manchesterPhotos = [
  "https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/manchester/collections/1770337337388_0.jpeg",
  "https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/manchester/collections/1770337338233_1.jpeg",
  "https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/manchester/collections/1770337338780_2.jpeg",
  "https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/manchester/collections/1770337339504_3.jpeg",
  "https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/manchester/collections/1770337340211_4.jpeg",
  "https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/manchester/collections/1770337340867_5.jpeg",
  "https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/manchester/collections/1770337341426_6.jpeg",
  "https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/manchester/collections/1770337342104_7.jpeg",
  "https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/manchester/collections/1770337342975_8.jpeg",
  "https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/manchester/collections/1770337343554_9.jpeg",
];

const trujilloPhotos = [
  "https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/trujillo/collections/1770337873541_0.jpeg",
  "https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/trujillo/collections/1770337874866_1.jpeg",
  "https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/trujillo/collections/1770337875484_2.jpeg",
  "https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/trujillo/collections/1770337876098_3.jpeg",
  "https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/trujillo/collections/1770337876811_4.jpeg",
  "https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/trujillo/collections/1770337877432_5.jpeg",
  "https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/trujillo/collections/1770337878592_6.jpeg",
  "https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/trujillo/collections/1770337879265_7.jpeg",
  "https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/trujillo/collections/1770337880085_8.jpeg",
  "https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/trujillo/collections/1770337880807_9.jpeg",
];

const units = [
  { name: "Manchester", photos: manchesterPhotos },
  { name: "Trujillo", photos: trujilloPhotos },
];

export const InstagramSection = () => {
  const [activeUnit, setActiveUnit] = useState(0);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  return (
    <section className="py-20 relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl" />
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
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-full mb-6 shadow-lg"
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Conheça nossos espaços</span>
            <Sparkles className="w-4 h-4" />
          </motion.div>

          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Nossas <span className="gradient-text">Unidades</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Veja os espaços incríveis onde realizamos festas inesquecíveis
          </p>
        </motion.div>

        {/* Unit Tabs */}
        <div className="flex justify-center gap-3 mb-8">
          {units.map((unit, idx) => (
            <button
              key={unit.name}
              onClick={() => setActiveUnit(idx)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold transition-all duration-300 ${
                activeUnit === idx
                  ? "bg-primary text-primary-foreground shadow-lg scale-105"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <MapPin className="w-4 h-4" />
              {unit.name}
            </button>
          ))}
        </div>

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
                className="group relative rounded-xl overflow-hidden shadow-lg aspect-square cursor-pointer"
                onClick={() => setSelectedImage(index)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <img
                  src={src}
                  alt={`${units[activeUnit].name} - Foto ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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

        {/* Instagram CTA */}
        <motion.div
          className="text-center mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <motion.a
            href="https://instagram.com/castelodadiversao"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-shadow"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <Instagram className="w-5 h-5" />
            Siga-nos no Instagram
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};
