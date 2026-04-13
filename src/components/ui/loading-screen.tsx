import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  message?: string;
  className?: string;
}

export function LoadingScreen({ message = "Carregando...", className }: LoadingScreenProps) {
  return (
    <div className={cn("min-h-screen bg-background flex flex-col items-center justify-center gap-6", className)}>
      {/* Animated dots loader */}
      <div className="relative flex items-center justify-center">
        {/* Outer pulse ring */}
        <div className="absolute h-16 w-16 rounded-full border-2 border-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
        
        {/* Inner spinning arc */}
        <svg className="h-12 w-12 animate-spin" style={{ animationDuration: "1.2s" }} viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" stroke="hsl(var(--primary) / 0.15)" strokeWidth="3" />
          <path
            d="M44 24c0-11.046-8.954-20-20-20"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>

        {/* Center dot */}
        <div className="absolute h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
      </div>

      {/* Loading text with subtle animation */}
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-sm font-medium text-muted-foreground animate-pulse">{message}</p>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1 w-1 rounded-full bg-primary/40"
              style={{
                animation: "bounce 1.4s ease-in-out infinite",
                animationDelay: `${i * 0.16}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
