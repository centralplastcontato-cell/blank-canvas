import * as React from "react";
import { Badge, BadgeProps } from "./badge";
import { cn } from "@/lib/utils";

interface AnimatedBadgeProps extends BadgeProps {
  value: number | string;
}

export function AnimatedBadge({ value, className, ...props }: AnimatedBadgeProps) {
  const [isAnimating, setIsAnimating] = React.useState(false);
  const prevValueRef = React.useRef(value);

  React.useEffect(() => {
    if (prevValueRef.current !== value) {
      setIsAnimating(true);
      prevValueRef.current = value;
      
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <Badge
      className={cn(
        "transition-all duration-200",
        isAnimating && "animate-badge-pulse",
        className
      )}
      {...props}
    >
      {value}
    </Badge>
  );
}
