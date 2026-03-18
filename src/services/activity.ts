import { useQuery } from "@tanstack/react-query";
import { activityService } from "./activityService";

export function useRecentActivity(limit = 20) {
  return useQuery({
    queryKey: ["activity_logs", limit],
    queryFn: () => activityService.getRecent(limit),
  });
}
