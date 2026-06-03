import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  compact?: boolean;
};

export function BrandMark({ className, compact = false }: BrandMarkProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_20%_20%,hsl(197_100%_72%/.42),transparent_32%),linear-gradient(145deg,hsl(222_83%_52%),hsl(236_72%_58%)_58%,hsl(210_90%_54%))] text-white shadow-lg shadow-primary/20",
        compact ? "h-10 w-10" : "h-12 w-12",
        className,
      )}
    >
      <svg
        viewBox="0 0 64 64"
        className={cn(compact ? "h-6 w-6" : "h-7 w-7")}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M46.8 18.8C43.7 15.8 39.4 14 34.8 14C25.5 14 18 21.5 18 30.8C18 40.1 25.5 47.6 34.8 47.6C39.4 47.6 43.6 45.8 46.8 42.8"
          stroke="currentColor"
          strokeWidth="5.5"
          strokeLinecap="round"
          opacity="0.92"
        />
        <path
          d="M27 43V20.5H32.7L41.2 33.1V20.5H47V43H41.3L32.8 30.3V43H27Z"
          fill="currentColor"
        />
        <path
          d="M35.6 18.5L32.8 28.6H37.9L30.8 45.5L33.4 34.7H28.7L35.6 18.5Z"
          fill="#FBBF24"
        />
      </svg>
      <div className="pointer-events-none absolute inset-[1px] rounded-[15px] border border-white/20" />
      <div className="pointer-events-none absolute inset-x-2 bottom-1.5 h-px bg-white/20" />
    </div>
  );
}

type BrandLogoProps = {
  className?: string;
  caption?: string;
};

export function BrandLogo({ className, caption }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark />
      <div className="min-w-0">
        <div className="text-lg font-black tracking-tight text-foreground">
          Conta<span className="text-primary">Nova</span>
        </div>
        {caption && <div className="text-xs text-muted-foreground">{caption}</div>}
      </div>
    </div>
  );
}
