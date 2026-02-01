export const PLAN_LIMITS = {
  free: {
    playlists: 1,
    songs: 5,
    monitoringIntervalHours: 24, // once per day
  },
  basic: {
    playlists: 5,
    songs: 50,
    monitoringIntervalHours: 6, // 4x per day
  },
  pro: {
    playlists: -1, // unlimited
    songs: -1, // unlimited
    monitoringIntervalHours: 1, // 24x per day
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

export function getPlaylistLimit(plan: PlanType): number {
  return PLAN_LIMITS[plan]?.playlists ?? PLAN_LIMITS.free.playlists;
}

export function getSongLimit(plan: PlanType): number {
  return PLAN_LIMITS[plan]?.songs ?? PLAN_LIMITS.free.songs;
}

export function hasReachedPlaylistLimit(
  plan: PlanType,
  currentCount: number
): boolean {
  const limit = getPlaylistLimit(plan);
  // -1 means unlimited
  return limit !== -1 && currentCount >= limit;
}

export function hasReachedSongLimit(
  plan: PlanType,
  currentCount: number
): boolean {
  const limit = getSongLimit(plan);
  // -1 means unlimited
  return limit !== -1 && currentCount >= limit;
}

export function getMonitoringIntervalHours(plan: PlanType): number {
  return PLAN_LIMITS[plan]?.monitoringIntervalHours ?? PLAN_LIMITS.free.monitoringIntervalHours;
}
