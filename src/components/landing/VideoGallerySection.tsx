import { MapPin, Star } from "lucide-react";
import { motion } from "framer-motion";
import videoTrujillo from "@/assets/video-trujillo.mp4";
import thumbTrujillo from "@/assets/thumb-trujillo.jpg";

export const VideoGallerySection = () => {
  return (
    <section className="bg-gray-950 py-20 md:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">

          {/* Left — copy */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="order-2 md:order-1"
          >
            <span className="block text-sm font-bold tracking-[0.3em] uppercase text-pink-400 mb-4">
              Conheça o espaço
            </span>
            <h2 className="font-['Nunito'] text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.05] mb-6">
              Um espaço feito<br/>para celebrar
            </h2>
            <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-md">
              Cada metro do Castelo foi pensado para as crianças viverem momentos únicos — e os pais descansarem tranquilos.
            </p>

            {/* mini features */}
            <div className="space-y-4">
              {[
                "Estrutura moderna e espaçosa no bairro Trujillo",
                "Espaço amplo com brinquedos e área para crianças",
                "Salgados de fabricação própria — qualidade comprovada",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-pink-500 flex-shrink-0 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <span className="text-white/75 text-base">{item}</span>
                </div>
              ))}
            </div>

            {/* Rating pill */}
            <div className="mt-8 inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2.5 border border-white/10">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-white/70 text-sm font-medium">4,7 · +4.000 famílias</span>
            </div>
          </motion.div>

          {/* Right — video */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="order-1 md:order-2"
          >
            <div className="relative rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]">
              {/* Decorative colored edge */}
              <div className="absolute inset-0 rounded-3xl ring-2 ring-inset ring-pink-500/20 z-10 pointer-events-none" />

              <div className="aspect-[9/16] md:aspect-[4/5]">
                <video
                  src={videoTrujillo}
                  poster={thumbTrujillo}
                  controls
                  className="w-full h-full object-cover"
                  preload="none"
                  playsInline
                  aria-label="Vídeo do Castelo da Diversão"
                >
                  Seu navegador não suporta vídeos.
                </video>
              </div>

              {/* Location tag */}
              <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10">
                <MapPin className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                <span className="text-white/80 text-xs font-medium">Trujillo · Sorocaba</span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
