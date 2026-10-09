import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";

export function useTrophies() {
  return useQuery({
    queryKey: queryKeys.trophies.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trophies")
        .select("*")
        .order("order_index", { ascending: true })
        .order("date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}
