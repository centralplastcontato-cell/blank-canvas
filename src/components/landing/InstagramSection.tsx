import { useState } from "react";
import { Instagram } from "lucide-react";
import { motion } from "framer-motion";
import { ImageLightbox } from "@/components/ui/image-lightbox";

const COMPANY_STORAGE = "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/sales-materials/a0000000-0000-0000-0000-000000000001";

const photos = [
  `${COMPANY_STORAGE}/Trujillo/1772397433865-ks2d8aotn8.jpeg`,
  `${COMPANY_STORAGE}/Trujillo/1772397434726-7istdpq1jfo.jpeg`,
  `${COMPANY_STORAGE}/Trujillo/1772397435228-t98o450962.jpeg`,
  `${COMPANY_STORAGE}/Trujillo/1772397436004-o3kwqcwjud.jpeg`,
  `${COMPANY_STORAGE}/Trujillo/1772397436722-g0tuzr72n4.jpeg`,
  `${COMPANY_STORAGE}/Trujillo/1772397437514-qfhwloe10s.jpeg`,
  `${COMPANY_STORAGE}/Trujillo/1772397438554-i1048mkjnaf.jpeg`,
  `${COMPANY_STORAGE}/Trujillo/1772397439754-663ozv8ocie.jpeg`,
  `${COMPANY_STORAGE}/Trujillo/1772397440533-70eyl884dx3.jpeg`,
  `${COMPANY_STORAGE}/Trujillo/1772397441314-cvadllwqf7v.jpeg`,
];

export const InstagramSection = () => {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  return (
    <section className="py-20 md:py-28 bg-pink-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header — left-aligned, with Instagram handle on right */}
        <motion.div
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <span className="block text-sm font-bold tracking-[0.3em] uppercase text-pink-500 mb-3">
              Galeria de momentos
            </span>
            <h2 className="font-['Nunito'] text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
              Memórias que ficam<br className="hidden md:block" /> para sempre
            </h2>
          </div>
          <a
            href="https://instagram.com/castelodadiversao"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-pink-500 transition-colors group flex-shrink-0"
          >
            <Instagram className="w-4 h-4 group-hover:text-pink-500 transition-colors" />
            @castelodadiversao
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </a>
        </motion.div>

        {/* Photo grid — first photo is featured (col-span-2) */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 grid-flow-dense"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {photos.map((src, index) => (
            <motion.div
              key={src}
              className={`group relative rounded-2xl overflow-hidden cursor-pointer
                ${index === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"}
              `}
              onClick={() => setSelectedImage(index)}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.04 }}
              whileHover={{ scale: 1.02 }}
            >
              <img
                src={src}
                alt={`Castelo da Diversão - Foto ${index + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            </motion.div>
          ))}
        </motion.div>

        {selectedImage !== null && (
          <ImageLightbox
            images={photos}
            currentIndex={selectedImage}
            onClose={() => setSelectedImage(null)}
            onNavigate={setSelectedImage}
          />
        )}

      </div>
    </section>
  );
};
