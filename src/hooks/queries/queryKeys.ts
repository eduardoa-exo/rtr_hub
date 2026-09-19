export const queryKeys = {
  races: {
    all: ["races"] as const,
    list: (order?: string) => ["races", "list", order] as const,
    active: () => ["races", "active"] as const,
  },
  drivers: {
    all: ["drivers"] as const,
    list: () => ["drivers", "list"] as const,
  },
  categories: {
    all: ["categories"] as const,
    list: (excludeGeral?: boolean) => ["categories", "list", excludeGeral] as const,
  },
  eventTypes: {
    all: ["eventTypes"] as const,
    list: () => ["eventTypes", "list"] as const,
  },
  standings: {
    all: ["standings"] as const,
    byClass: (cls: string) => ["standings", cls] as const,
  },
  racePointsScale: {
    all: ["racePointsScale"] as const,
  },
  scoreboardLive: {
    session: () => ["scoreboardLive", "session"] as const,
    grid: (cls: string) => ["scoreboardLive", "grid", cls] as const,
  },
  achievements: {
    all: ["achievements"] as const,
  },
  images: {
    landing: () => ["images", "landing"] as const,
  },
};
