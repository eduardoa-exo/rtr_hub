import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";

export function useStandings(selectedClass) {
  return useQuery({
    queryKey: queryKeys.standings.byClass(selectedClass),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("championship_standings")
        .select("*")
        .eq("class", selectedClass)
        .order("rank", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}
