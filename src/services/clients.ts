import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientService, ClientInput } from "./clientService";
import { useCompanyId } from "./companies";
import { activityService } from "./activityService";

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: () => clientService.getAll(),
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: () => clientService.getById(id!),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  const { data: companyId } = useCompanyId();
  return useMutation({
    mutationFn: (client: ClientInput) => clientService.create(client, companyId!),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["activity_logs"] });
      if (companyId) {
        activityService.log({
          companyId,
          action: "crear_cliente",
          entityType: "cliente",
          entityId: data.id,
          description: `Creó cliente ${data.name}`,
        });
      }
    },
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  const { data: companyId } = useCompanyId();
  return useMutation({
    mutationFn: clientService.update,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["activity_logs"] });
      if (companyId) {
        activityService.log({
          companyId,
          action: "editar_cliente",
          entityType: "cliente",
          entityId: variables.id,
        });
      }
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  const { data: companyId } = useCompanyId();
  return useMutation({
    mutationFn: clientService.remove,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["activity_logs"] });
      if (companyId) {
        activityService.log({
          companyId,
          action: "eliminar_cliente",
          entityType: "cliente",
          entityId: id,
        });
      }
    },
  });
}
