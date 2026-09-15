import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { paymentService, PaymentInput } from "./paymentService";
import { useCompanyId } from "./companies";
import { activityService } from "./activityService";

export function usePayments(invoiceId?: string) {
  const { data: companyId } = useCompanyId();

  return useQuery({
    queryKey: ["payments", companyId, invoiceId],
    queryFn: () => paymentService.getAll(companyId!, invoiceId),
    enabled: !!companyId,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  const { data: companyId } = useCompanyId();
  return useMutation({
    mutationFn: (payment: PaymentInput) => paymentService.create(payment, companyId!),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["activity_logs"] });
      if (companyId) {
        activityService.log({
          companyId,
          action: "registrar_pago",
          entityType: "pago",
          entityId: data.id,
          description: `Registró pago de $${Number(data.amount).toFixed(2)}`,
        });
      }
    },
  });
}
