import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";

export function useActiveRace() {
  return useQuery({
    queryKey: queryKeys.races.active(),
    queryFn: async () => {
      const { data: activeData, error: activeError } = await supabase
        .from("races")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (!activeError && activeData) {
        return { activeRace: activeData, nextRace: null };
      }

      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const startOfTomorrow = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );
      const { data: todayRaces, error: todayError } = await supabase
        .from("races")
        .select("*")
        .gte("date", startOfToday.toISOString())
        .lt("date", startOfTomorrow.toISOString())
        .order("date", { ascending: true })
        .limit(1);

      if (!todayError && todayRaces && todayRaces.length > 0) {
        const raceToActivate = todayRaces[0];
        const { data: finishEvents, error: finishError } = await supabase
          .from("race_events")
          .select("id")
          .eq("race_id", raceToActivate.id)
          .eq("event_type", "finish")
          .limit(1);

        const hasFinishEvent =
          !finishError && !!finishEvents && finishEvents.length > 0;

        if (!hasFinishEvent) {
          await supabase
            .from("races")
            .update({ is_active: false })
            .eq("is_active", true);
          const { error: updateErr } = await supabase
            .from("races")
            .update({ is_active: true })
            .eq("id", raceToActivate.id);
          if (!updateErr) {
            return { activeRace: raceToActivate, nextRace: null };
          }
        }
      }

      const { data: nextRaceData, error: nextRaceError } = await supabase
        .from("races")
        .select("*")
        .gt("date", new Date().toISOString())
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle();

      return {
        activeRace: null,
        nextRace: !nextRaceError ? nextRaceData : null,
      };
    },
  });
}
