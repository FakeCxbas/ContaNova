import { cn } from "@/lib/utils";

interface FieldErrorProps {
  error?: string;
  className?: string;
}

export function FieldError({ error, className }: FieldErrorProps) {
  if (!error) return null;
  return (
    <p className={cn("text-xs text-destructive mt-1 animate-in fade-in slide-in-from-top-1", className)}>
      {error}
    </p>
  );
}
