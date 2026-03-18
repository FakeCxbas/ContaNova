import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productService, ProductInput } from "./productService";
import { useCompanyId } from "./companies";
import { activityService } from "./activityService";

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => productService.getAll(),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  const { data: companyId } = useCompanyId();
  return useMutation({
    mutationFn: (product: ProductInput) => productService.create(product, companyId!),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["activity_logs"] });
      if (companyId) {
        activityService.log({
          companyId,
          action: "crear_producto",
          entityType: "producto",
          entityId: data.id,
          description: `Creó producto ${data.name}`,
        });
      }
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  const { data: companyId } = useCompanyId();
  return useMutation({
    mutationFn: productService.update,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["activity_logs"] });
      if (companyId) {
        activityService.log({
          companyId,
          action: "editar_producto",
          entityType: "producto",
          entityId: variables.id,
        });
      }
    },
  });
}
