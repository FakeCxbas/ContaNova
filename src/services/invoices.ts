import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoiceService, InvoiceInput } from "./invoiceService";
import { useCompanyId } from "./companies";
import { activityService } from "./activityService";
import type { TablesUpdate } from "@/integrations/supabase/types";

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: () => invoiceService.getAll(),
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ["invoices", id],
    queryFn: () => invoiceService.getById(id!),
    enabled: !!id,
  });
}

export function useInvoiceItems(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ["invoice_items", invoiceId],
    queryFn: () => invoiceService.getItems(invoiceId!),
    enabled: !!invoiceId,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  const { data: companyId } = useCompanyId();
  return useMutation({
    mutationFn: (invoice: InvoiceInput) => invoiceService.create(invoice, companyId!),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["activity_logs"] });
      if (companyId) {
        activityService.log({
          companyId,
          action: "crear_factura",
          entityType: "factura",
          entityId: data.id,
          description: `Creó factura ${data.number} para ${data.client_name}`,
        });
      }
    },
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  const { data: companyId } = useCompanyId();
  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & TablesUpdate<"invoices">) =>
      invoiceService.update(id, updates),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["activity_logs"] });
      if (companyId) {
        activityService.log({
          companyId,
          action: "editar_factura",
          entityType: "factura",
          entityId: variables.id,
          description: `Actualizo factura${variables.status ? ` - estado: ${variables.status}` : ""}${variables.delivery_status ? ` - entrega: ${variables.delivery_status}` : ""}`,
        });
      }
    },
  });
}

