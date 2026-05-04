import { motion } from "framer-motion";
import { castleBenefits } from "@/config/campaignConfig";
import { Star, PartyPopper, Heart, UtensilsCrossed, Users, Sparkles, Gamepad2 } from "lucide-react";

const iconMap: Record<string, React.ComponentType<any>> = {
  "🎠": Gamepad2,
  "🎉": PartyPopper,
  "🍟": UtensilsCrossed,
  "👨‍👩‍👧‍👦": Users,
  "✨": Sparkles,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const colorClasses = [
  "from-blue-500 to-blue-600",
  "from-green-500 to-green-600",
  "from-orange-500 to-orange-600",
  "from-purple-500 to-purple-600",
  "from-pink-500 to-pink-600",
];

export function BenefitsSection() {
  return (
    <section className="py-24 sm:py-32 bg-card">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl md:text-7xl font-display font-bold text-foreground mb-6">
            Uma festa inesquecível para <span className="gradient-text">seu filho</span>
          </h2>
          <p className="text-2xl md:text-3xl text-muted-foreground max-w-4xl mx-auto">
            Conheça tudo que o Castelo da Diversão oferece para tornar esse dia único
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10 max-w-7xl mx-auto"
        >
          {castleBenefits.map((benefit, index) => {
            const IconComponent = iconMap[benefit.icon] || Sparkles;
            return (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover={{ y: -8, scale: 1.02 }}
                className="relative card-festive p-10 sm:p-12 text-center group cursor-default overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[index % colorClasses.length]} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className={`relative mx-auto w-28 h-28 rounded-2xl bg-gradient-to-br ${colorClasses[index % colorClasses.length]} flex items-center justify-center mb-8 shadow-lg group-hover:shadow-xl transition-shadow duration-300`}
                >
                  <IconComponent className="w-14 h-14 text-white" strokeWidth={1.5} />
                </motion.div>
                
                <h3 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4 group-hover:text-primary transition-colors">
                  {benefit.title}
                </h3>
                <p className="text-lg sm:text-xl text-muted-foreground relative z-10 leading-relaxed">
                  {benefit.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
}
