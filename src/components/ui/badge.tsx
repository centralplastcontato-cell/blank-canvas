import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive/15 text-destructive hover:bg-destructive/25 border-destructive/20",
        outline: "text-foreground",
        // Semantic status variants — vivid colors with tinted borders
        novo: "border-blue-200 bg-blue-50 text-blue-700 shadow-[0_0_0_1px_rgba(59,130,246,0.1)]",
        negociando: "border-orange-200 bg-orange-50 text-orange-700 shadow-[0_0_0_1px_rgba(249,115,22,0.1)]",
        fechado: "border-green-200 bg-green-50 text-green-700 shadow-[0_0_0_1px_rgba(34,197,94,0.1)]",
        perdido: "border-red-200 bg-red-50 text-red-700 shadow-[0_0_0_1px_rgba(239,68,68,0.1)]",
        visita: "border-purple-200 bg-purple-50 text-purple-700 shadow-[0_0_0_1px_rgba(168,85,247,0.1)]",
        pendente: "border-yellow-200 bg-yellow-50 text-yellow-700 shadow-[0_0_0_1px_rgba(234,179,8,0.1)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
