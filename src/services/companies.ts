import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { companyService, CompanyUpdate } from "./companyService";
import { useAuth } from "@/hooks/useAuth";

export function useCompanyId() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["company_id", user?.id],
    queryFn: () => companyService.getCompanyId(user!.id),
    enabled: !!user,
  });
}

export function useCompany() {
  const { data: companyId } = useCompanyId();
  return useQuery({
    queryKey: ["company", companyId],
    queryFn: () => companyService.getById(companyId!),
    enabled: !!companyId,
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: companyService.update,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company"] }),
  });
}
