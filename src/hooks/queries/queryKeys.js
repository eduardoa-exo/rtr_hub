export const queryKeys = {
  races: {
    all: ["races"],
    list: (order) => ["races", "list", order],
    active: () => ["races", "active"],
  },
  drivers: {
    all: ["drivers"],
    list: () => ["drivers", "list"],
  },
  categories: {
    all: ["categories"],
    list: (excludeGeral) => ["categories", "list", excludeGeral],
  },
  eventTypes: {
    all: ["eventTypes"],
    list: () => ["eventTypes", "list"],
  },
  standings: {
    all: ["standings"],
    byClass: (cls) => ["standings", cls],
  },
  racePointsScale: {
    all: ["racePointsScale"],
  },
  scoreboardLive: {
    session: () => ["scoreboardLive", "session"],
    grid: (cls) => ["scoreboardLive", "grid", cls],
  },
  achievements: {
    all: ["achievements"],
  },
  images: {
    landing: () => ["images", "landing"],
  },
};
