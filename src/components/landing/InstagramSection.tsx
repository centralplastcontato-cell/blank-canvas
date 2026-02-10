import { Instagram, Sparkles, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import thumbTrujillo from "@/assets/thumb-trujillo.jpg";
import thumbManchester from "@/assets/thumb-manchester.jpg";

const onboardingPhotos = [
  "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/a0000000-0000-0000-0000-000000000001/photos/1770664109270.jpg",
  "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/a0000000-0000-0000-0000-000000000001/photos/1770664113909.jpg",
];

const galleryItems = [
  { src: thumbTrujillo, label: "Unidade Trujillo", location: "Trujillo" },
  { src: thumbManchester, label: "Unidade Manchester", location: "Manchester" },
  { src: onboardingPhotos[0], label: "Nosso Espaço", location: "Castelo" },
  { src: onboardingPhotos[1], label: "Diversão Garantida", location: "Castelo" },
];

export const InstagramSection = () => {
  return (
    <section className="py-20 relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-12"
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {galleryItems.map((item, index) => (
            <motion.div
              key={index}
              className="group relative rounded-2xl overflow-hidden shadow-xl aspect-square"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <img
                src={item.src}
                alt={item.label}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <p className="text-white font-semibold text-sm">{item.label}</p>
                <div className="flex items-center gap-1 text-white/80 text-xs">
                  <MapPin className="w-3 h-3" />
                  <span>{item.location}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

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