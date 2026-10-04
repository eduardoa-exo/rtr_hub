import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "./queryKeys";

export function useCategories(excludeGeral = false) {
  return useQuery({
    queryKey: queryKeys.categories.list(excludeGeral),
    queryFn: async () => {
      let query = supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });

      if (excludeGeral) {
        query = query.neq("name", "GERAL");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
