import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";

const COLD_STALE_MS = 10 * 60 * 1000;

export type LiveSessionClass = "LMP2" | "GT3 PRO" | "BOTH";

export interface ScoreboardLiveSession {
  id: number;
  enabled: boolean;
  championship_class: LiveSessionClass;
  grid_version: number;
  updated_at: string;
}

export interface ScoreboardLiveGridRow {
  id: string;
  class: string;
  car_number: string;
  sort_order: number;
  participates: boolean;
  team_name: string | null;
  country_code: string | null;
  car_logo_url: string | null;
}

/** Shared Realtime channel for session singleton — one per tab. */
let sessionChannel: RealtimeChannel | null = null;
let sessionChannelRefCount = 0;
const sessionVersionListeners = new Set<(session: Partial<ScoreboardLiveSession>) => void>();

function ensureSessionChannel() {
  if (sessionChannel) return;
  sessionChannel = supabase
    .channel("scoreboard-live-session-signal")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "scoreboard_live_session",
        filter: "id=eq.1",
      },
      (payload) => {
        const next = payload.new as Partial<ScoreboardLiveSession> | null;
        if (!next || typeof next !== "object") return;
        for (const listener of sessionVersionListeners) {
          listener(next);
        }
      }
    )
    .subscribe();
}

function acquireSessionChannel(
  listener: (session: Partial<ScoreboardLiveSession>) => void
) {
  sessionVersionListeners.add(listener);
  sessionChannelRefCount += 1;
  ensureSessionChannel();
  return () => {
    sessionVersionListeners.delete(listener);
    sessionChannelRefCount -= 1;
    if (sessionChannelRefCount <= 0 && sessionChannel) {
      void supabase.removeChannel(sessionChannel);
      sessionChannel = null;
      sessionChannelRefCount = 0;
    }
  };
}

/** Cold standings — long staleTime, no Realtime. */
export function useScoreboardStandings(selectedClass: "LMP2" | "GT3 PRO") {
  return useQuery({
    queryKey: queryKeys.standings.byClass(selectedClass),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("championship_standings")
        .select(
          "car_number, team_name, points, rank, class, country_code, car_logo_url"
        )
        .eq("class", selectedClass)
        .order("rank", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: COLD_STALE_MS,
    refetchOnWindowFocus: false,
  });
}

/** Cold points scale — long staleTime, no Realtime. */
export function useRacePointsScale() {
  return useQuery({
    queryKey: queryKeys.racePointsScale.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("race_points_scale")
        .select("class, position, points")
        .order("position", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: COLD_STALE_MS,
    refetchOnWindowFocus: false,
  });
}

export function useScoreboardLiveSession() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.scoreboardLive.session(),
    queryFn: async (): Promise<ScoreboardLiveSession | null> => {
      const { data, error } = await supabase
        .from("scoreboard_live_session")
        .select("id, enabled, championship_class, grid_version, updated_at")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        championship_class: data.championship_class as LiveSessionClass,
        grid_version: Number(
          (data as { grid_version?: number }).grid_version ?? 0
        ),
      };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    return acquireSessionChannel((next) => {
      queryClient.setQueryData<ScoreboardLiveSession | null>(
        queryKeys.scoreboardLive.session(),
        (prev) => {
          if (!prev) {
            return {
              id: 1,
              enabled: Boolean(next.enabled),
              championship_class:
                (next.championship_class as LiveSessionClass) ?? "BOTH",
              grid_version: Number(next.grid_version ?? 0),
              updated_at: String(
                next.updated_at ?? new Date().toISOString()
              ),
            };
          }
          return {
            ...prev,
            ...next,
            championship_class:
              (next.championship_class as LiveSessionClass) ??
              prev.championship_class,
            grid_version: Number(next.grid_version ?? prev.grid_version),
            enabled:
              typeof next.enabled === "boolean" ? next.enabled : prev.enabled,
          };
        }
      );
    });
  }, [queryClient]);

  return query;
}

/**
 * Live grid for one class. Refetches only when session.grid_version changes
 * (debounced). NEVER subscribes to scoreboard_live_grid Realtime.
 */
export function useScoreboardLiveGrid(
  selectedClass: "LMP2" | "GT3 PRO",
  gridVersion: number | undefined,
  canFetch: boolean
) {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAppliedVersion = useRef<number | null>(null);
  const [optimisticSkipVersion, setOptimisticSkipVersion] = useState<
    number | null
  >(null);

  const query = useQuery({
    queryKey: queryKeys.scoreboardLive.grid(selectedClass),
    queryFn: async (): Promise<ScoreboardLiveGridRow[]> => {
      const { data, error } = await supabase
        .from("scoreboard_live_grid")
        .select(
          "id, class, car_number, sort_order, participates, team_name, country_code, car_logo_url"
        )
        .eq("class", selectedClass)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ScoreboardLiveGridRow[];
    },
    enabled: canFetch,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (gridVersion === undefined || !canFetch) return;
    if (lastAppliedVersion.current === null) {
      lastAppliedVersion.current = gridVersion;
      return;
    }
    if (lastAppliedVersion.current === gridVersion) return;
    if (optimisticSkipVersion !== null && gridVersion === optimisticSkipVersion) {
      lastAppliedVersion.current = gridVersion;
      setOptimisticSkipVersion(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastAppliedVersion.current = gridVersion;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.scoreboardLive.grid(selectedClass),
      });
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    gridVersion,
    canFetch,
    selectedClass,
    queryClient,
    optimisticSkipVersion,
  ]);

  return {
    ...query,
    /** Call after local optimistic write that will echo the same grid_version. */
    markOptimisticVersion: (version: number) => {
      setOptimisticSkipVersion(version);
      lastAppliedVersion.current = version;
    },
  };
}
