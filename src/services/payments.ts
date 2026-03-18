import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentService, PaymentInput } from "./paymentService";
import { useCompanyId } from "./companies";
import { activityService } from "./activityService";

export function usePayments(invoiceId?: string) {
  return useQuery({
    queryKey: ["payments", invoiceId],
    queryFn: () => paymentService.getAll(invoiceId),
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
