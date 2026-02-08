import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Mariana Silva",
    event: "Festa Infantil - 7 anos",
    rating: 5,
    text: "A festa do meu filho foi simplesmente mágica! A equipe cuidou de cada detalhe e as crianças se divertiram muito. Super recomendo!",
    avatar: "MS",
  },
  {
    id: 2,
    name: "Carlos Eduardo",
    event: "Festa de 15 anos",
    rating: 5,
    text: "Minha filha ficou encantada! O espaço é lindo, a decoração impecável e o atendimento excepcional. Memórias para a vida toda.",
    avatar: "CE",
  },
  {
    id: 3,
    name: "Ana Paula",
    event: "Festa Infantil - 5 anos",
    rating: 5,
    text: "Já fizemos 3 festas no Castelo e todas foram perfeitas. Preço justo, equipe atenciosa e muita diversão garantida!",
    avatar: "AP",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export function TestimonialsSection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            O que nossos clientes dizem 💬
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Milhares de famílias já celebraram momentos especiais conosco. Veja o que elas têm a dizer!
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {testimonials.map((testimonial) => (
            <motion.div
              key={testimonial.id}
              variants={cardVariants}
              className="group relative bg-card rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-border"
            >
              {/* Quote icon */}
              <div className="absolute -top-3 -left-3 w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-md">
                <Quote className="w-5 h-5 text-primary-foreground" />
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-4 pt-2">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Text */}
              <p className="text-foreground/80 mb-6 leading-relaxed">
                "{testimonial.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.event}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 flex flex-wrap justify-center gap-6 md:gap-12"
        >
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-display font-bold text-primary">+500</p>
            <p className="text-sm text-muted-foreground">Festas realizadas</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-display font-bold text-primary">4.9</p>
            <p className="text-sm text-muted-foreground">Avaliação média</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-display font-bold text-primary">98%</p>
            <p className="text-sm text-muted-foreground">Clientes satisfeitos</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
