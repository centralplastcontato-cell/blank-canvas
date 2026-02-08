import { Instagram, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export const InstagramSection = () => {
  return (
    <section className="py-20 relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />
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
            <span className="text-sm font-medium">Acompanhe nossas novidades</span>
            <Sparkles className="w-4 h-4" />
          </motion.div>

          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div
              className="p-3 bg-primary rounded-xl shadow-lg"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Instagram className="w-8 h-8 text-primary-foreground" />
            </motion.div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground">
              Siga-nos no Instagram
            </h2>
          </div>

          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Veja momentos incríveis das nossas festas em{" "}
            <motion.a
              href="https://instagram.com/castelodadiversao"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-primary hover:text-primary/80 transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              @castelodadiversao
            </motion.a>
          </p>
        </motion.div>

        <motion.div 
          className="max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <div className="relative">
            {/* Decorative border */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-secondary to-accent rounded-2xl blur opacity-30" />
            
            <div className="relative bg-card rounded-xl overflow-hidden shadow-2xl border border-border/50">
              {/* Header overlay to cover Elfsight branding */}
              <div className="absolute top-0 left-0 right-0 z-10 bg-background h-14 flex items-center justify-center gap-2 border-b border-border/30">
                <Instagram className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">@castelodadiversao</span>
              </div>
              
              <iframe
                src="https://16022b612da14f75bbc525aa62325a1f.elf.site"
                title="Feed do Instagram"
                className="w-full border-0"
                style={{ minHeight: "650px", marginTop: "0" }}
                loading="lazy"
              />
            </div>
          </div>
        </motion.div>

        {/* Call to action */}
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
            Seguir no Instagram
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};
