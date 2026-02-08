import { Play, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import videoTrujillo from "@/assets/video-trujillo.mp4";
import videoManchester from "@/assets/video-manchester.mov";
import thumbTrujillo from "@/assets/thumb-trujillo.jpg";
import thumbManchester from "@/assets/thumb-manchester.jpg";

const units = [
  {
    name: "Unidade Trujillo",
    video: videoTrujillo,
    poster: thumbTrujillo,
    location: "Trujillo",
  },
  {
    name: "Unidade Manchester",
    video: videoManchester,
    poster: thumbManchester,
    location: "Manchester",
  },
];

export const VideoGallerySection = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <motion.div
            className="inline-flex items-center gap-2 bg-festive text-festive-foreground px-6 py-2 rounded-full mb-6 shadow-lg"
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Play className="w-4 h-4" />
            <span className="text-sm font-medium">Conheça nossos espaços</span>
          </motion.div>

          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Nossas <span className="gradient-text">Unidades</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Descubra os espaços incríveis onde realizamos festas inesquecíveis para crianças de todas as idades
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {units.map((unit, index) => (
            <motion.div
              key={unit.name}
              className="group"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
            >
              <div className="relative rounded-2xl overflow-hidden shadow-xl border-2 border-primary/10 bg-card">
                {/* Video Player */}
                <div className="aspect-[9/16] md:aspect-video relative">
                  <video
                    src={unit.video}
                    poster={unit.poster}
                    controls
                    className="w-full h-full object-cover"
                    preload="none"
                    playsInline
                    aria-label={`Vídeo da ${unit.name}`}
                  >
                    Seu navegador não suporta vídeos.
                  </video>
                </div>

                {/* Unit Info */}
                <div className="p-5 bg-gradient-to-t from-card to-card/80">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-foreground">
                      {unit.name}
                    </h3>
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>{unit.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
