import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";

export function useRaces(order = "asc") {
  return useQuery({
    queryKey: queryKeys.races.list(order),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("races")
        .select("*")
        .order("date", { ascending: order === "asc" });
      if (error) throw error;
      return data;
    },
  });
}
