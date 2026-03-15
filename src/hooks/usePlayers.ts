import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PlayerInsert, PlayerUpdate } from "@/integrations/supabase/types";

export const playerKeys = {
  all: ["players"] as const,
  byMatch: (matchId: string) => ["players", "match", matchId] as const,
  byTeam: (team: string) => ["players", "team", team] as const,
  roster: (team: string) => ["players", "roster", team] as const,
  detail: (id: string) => ["players", id] as const,
};

export function usePlayers() {
  return useQuery({
    queryKey: playerKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .order("fantasy_points", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function usePlayersByMatch(matchId: string) {
  return useQuery({
    queryKey: playerKeys.byMatch(matchId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("match_id", matchId)
        .order("fantasy_points", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!matchId,
  });
}

export function usePlayersByTeam(team: string) {
  return useQuery({
    queryKey: playerKeys.byTeam(team),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("team", team)
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!team,
  });
}

// ─── Team Roster – players with no match assigned (permanent squad) ───────────

export function useTeamRoster(team: string) {
  return useQuery({
    queryKey: playerKeys.roster(team),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("team", team)
        .is("match_id", null)
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!team,
  });
}

export function usePlayer(id: string) {
  return useQuery({
    queryKey: playerKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PlayerInsert) => {
      const { data, error } = await supabase
        .from("players")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: playerKeys.all });
      if (data?.match_id)
        queryClient.invalidateQueries({
          queryKey: playerKeys.byMatch(data.match_id),
        });
      if (data?.team) {
        queryClient.invalidateQueries({
          queryKey: playerKeys.byTeam(data.team),
        });
        queryClient.invalidateQueries({
          queryKey: playerKeys.roster(data.team),
        });
      }
    },
  });
}

export function useBulkCreatePlayers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PlayerInsert[]) => {
      const { data, error } = await supabase
        .from("players")
        .insert(payload)
        .select();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playerKeys.all });
    },
  });
}

export function useUpdatePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: PlayerUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("players")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: playerKeys.all });
      if (data?.id)
        queryClient.invalidateQueries({ queryKey: playerKeys.detail(data.id) });
      if (data?.match_id)
        queryClient.invalidateQueries({
          queryKey: playerKeys.byMatch(data.match_id),
        });
      if (data?.team)
        queryClient.invalidateQueries({
          queryKey: playerKeys.byTeam(data.team),
        });
    },
  });
}

export function useUpdatePlayerStats() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      batting_runs,
      balls_faced,
      fours,
      sixes,
      wickets,
      overs_bowled,
      runs_conceded,
      catches,
      fantasy_points,
    }: {
      id: string;
      batting_runs?: number | null;
      balls_faced?: number | null;
      fours?: number | null;
      sixes?: number | null;
      wickets?: number | null;
      overs_bowled?: number | null;
      runs_conceded?: number | null;
      catches?: number | null;
      fantasy_points?: number;
    }) => {
      const { data, error } = await supabase
        .from("players")
        .update({
          batting_runs,
          balls_faced,
          fours,
          sixes,
          wickets,
          overs_bowled,
          runs_conceded,
          catches,
          fantasy_points,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: playerKeys.all });
      if (data?.id)
        queryClient.invalidateQueries({ queryKey: playerKeys.detail(data.id) });
      if (data?.match_id)
        queryClient.invalidateQueries({
          queryKey: playerKeys.byMatch(data.match_id),
        });
    },
  });
}

export function useDeletePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("players").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: (_id, variables) => {
      // variables is the player id string — invalidate broadly since we
      // don't have the team name available here without a separate lookup
      queryClient.invalidateQueries({ queryKey: playerKeys.all });
      // Also blast the roster cache for all teams so counts update instantly
      queryClient.invalidateQueries({ queryKey: ["players", "roster"] });
      queryClient.invalidateQueries({ queryKey: ["players", "team"] });
      queryClient.removeQueries({ queryKey: playerKeys.detail(id) });
    },
  });
}
