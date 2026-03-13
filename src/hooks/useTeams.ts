import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  tournament_id: string | null;
  created_at: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const teamKeys = {
  all: ["teams"] as const,
  byTournament: (tournamentId: string) =>
    ["teams", "tournament", tournamentId] as const,
};

// ─── Fetch all teams ──────────────────────────────────────────────────────────

export function useTeams() {
  return useQuery({
    queryKey: teamKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw new Error(error.message);
      return data as Team[];
    },
  });
}

// ─── Fetch teams for a specific tournament ────────────────────────────────────

export function useTeamsByTournament(tournamentId: string | null) {
  return useQuery({
    queryKey: tournamentId ? teamKeys.byTournament(tournamentId) : teamKeys.all,
    queryFn: async () => {
      let query = supabase.from("teams").select("*").order("name", { ascending: true });

      if (tournamentId) {
        query = query.eq("tournament_id", tournamentId);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as Team[];
    },
  });
}

// ─── Create a team ────────────────────────────────────────────────────────────

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      tournament_id,
    }: {
      name: string;
      tournament_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("teams")
        .insert({ name: name.trim(), tournament_id: tournament_id ?? null })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Team;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
      if (data?.tournament_id) {
        queryClient.invalidateQueries({
          queryKey: teamKeys.byTournament(data.tournament_id),
        });
      }
    },
  });
}

// ─── Delete a team ────────────────────────────────────────────────────────────

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("teams").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
    },
  });
}
