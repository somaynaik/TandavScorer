import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TournamentInsert, TournamentUpdate } from "@/integrations/supabase/types";

export const tournamentKeys = {
  all: ["tournaments"] as const,
  detail: (id: string) => ["tournaments", id] as const,
};

export function useTournaments() {
  return useQuery({
    queryKey: tournamentKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function useTournament(id: string) {
  return useQuery({
    queryKey: tournamentKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TournamentInsert) => {
      const { data, error } = await supabase
        .from("tournaments")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
    },
  });
}

export function useUpdateTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: TournamentUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("tournaments")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
      if (data?.id) queryClient.invalidateQueries({ queryKey: tournamentKeys.detail(data.id) });
    },
  });
}

export function useDeleteTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tournaments").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
      queryClient.removeQueries({ queryKey: tournamentKeys.detail(id) });
    },
  });
}
