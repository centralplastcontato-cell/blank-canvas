import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  tone?: "light" | "dark";
  className?: string;
}

export function SectionHeading({ eyebrow, title, description, tone = "light", className }: SectionHeadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn("mx-auto max-w-3xl text-center", className)}
    >
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]",
          tone === "dark" ? "bg-white/10 text-white/80" : "bg-[#F0457A]/10 text-[#D23468]",
        )}
      >
        {eyebrow}
      </span>
      <h2
        className={cn(
          "mt-5 text-balance font-grotesque text-[2.15rem] font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl",
          tone === "dark" ? "text-white" : "text-[#0F1222]",
        )}
      >
        {title}
      </h2>
      {description && (
        <p className={cn("mt-5 text-lg leading-relaxed sm:text-xl", tone === "dark" ? "text-white/60" : "text-slate-600")}>
          {description}
        </p>
      )}
    </motion.div>
  );
}
