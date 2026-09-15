import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { companyService, CompanyUpdate } from "./companyService";
import { useAuth } from "@/hooks/useAuth";

export function useCompanyId() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["company_id", user?.id],
    queryFn: () => companyService.getCompanyId(user!.id),
    enabled: !!user,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 60_000,
  });
}

export function useCompany() {
  const { data: companyId } = useCompanyId();
  return useQuery({
    queryKey: ["company", companyId],
    queryFn: () => companyService.getById(companyId!),
    enabled: !!companyId,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: companyService.update,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company"] }),
  });
}
export type { CompanyUpdate };
