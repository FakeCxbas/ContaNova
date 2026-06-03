import { Badge } from "@/components/ui/badge";
import { getInvoiceStatusMeta } from "@/lib/invoice-status";
import { cn } from "@/lib/utils";
import { useInvoiceStatusAppearance } from "@/services/companyAppearance";

type InvoiceStatusBadgeProps = {
  status: string | null | undefined;
  className?: string;
};

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  const meta = getInvoiceStatusMeta(status);
  const { style } = useInvoiceStatusAppearance(status);

  return (
    <Badge className={cn(meta.className, className)} style={style}>
      {meta.label}
    </Badge>
  );
}
