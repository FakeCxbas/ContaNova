import { useQuery } from "@tanstack/react-query";
import { activityService, type EntityType } from "./activityService";

export function useRecentActivity(limit = 20) {
  return useQuery({
    queryKey: ["activity_logs", limit],
    queryFn: () => activityService.getRecent(limit),
  });
}

export function useEntityActivity(entityType: EntityType, entityId: string | undefined, limit = 30) {
  return useQuery({
    queryKey: ["activity_logs", entityType, entityId, limit],
    queryFn: () => activityService.getByEntity(entityType, entityId!, limit),
    enabled: !!entityId,
  });
}
