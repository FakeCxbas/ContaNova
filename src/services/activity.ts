import { useQuery } from "@tanstack/react-query";
import { activityService, type EntityType } from "./activityService";
import { useCompanyId } from "./companies";

export function useRecentActivity(limit = 20) {
  const { data: companyId } = useCompanyId();

  return useQuery({
    queryKey: ["activity_logs", companyId, limit],
    queryFn: () => activityService.getRecent(companyId!, limit),
    enabled: !!companyId,
  });
}

export function useEntityActivity(entityType: EntityType, entityId: string | undefined, limit = 30) {
  const { data: companyId } = useCompanyId();

  return useQuery({
    queryKey: ["activity_logs", companyId, entityType, entityId, limit],
    queryFn: () => activityService.getByEntity(companyId!, entityType, entityId!, limit),
    enabled: !!companyId && !!entityId,
  });
}
