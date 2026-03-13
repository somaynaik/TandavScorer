import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FantasyTeamInsert, FantasyTeamUpdate } from "@/integrations/supabase/types";

export const fantasyTeamKeys = {
  all: ["fantasy_teams"] as const,
  byUser: (userId: string) => ["fantasy_teams", "user", userId] as const,
  byMatch: (matchId: string) => ["fantasy_teams", "match", matchId] as const,
  detail: (id: string) => ["fantasy_teams", id] as const,
};

// ─── My teams (current auth user) ────────────────────────────────────────────

export function useMyFantasyTeams() {
  return useQuery({
    queryKey: ["fantasy_teams", "mine"],
    queryFn: async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("fantasy_teams")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data;
    },
  });
}

// ─── My team for a specific match ─────────────────────────────────────────────

export function useMyFantasyTeamForMatch(matchId: string) {
  return useQuery({
    queryKey: ["fantasy_teams", "mine", "match", matchId],
    queryFn: async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) return null;

      const { data, error } = await supabase
        .from("fantasy_teams")
        .select("*")
        .eq("user_id", user.id)
        .eq("match_id", matchId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!matchId,
  });
}

// ─── All teams for a match (admin) ───────────────────────────────────────────

export function useFantasyTeamsByMatch(matchId: string) {
  return useQuery({
    queryKey: fantasyTeamKeys.byMatch(matchId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fantasy_teams")
        .select("*")
        .eq("match_id", matchId)
        .order("total_points", { ascending: false });

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!matchId,
  });
}

// ─── All teams for a user ─────────────────────────────────────────────────────

export function useFantasyTeamsByUser(userId: string) {
  return useQuery({
    queryKey: fantasyTeamKeys.byUser(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fantasy_teams")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!userId,
  });
}

// ─── Upsert (create or update) a fantasy team ────────────────────────────────

export function useUpsertFantasyTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      match_id,
      player_ids,
      captain_id,
      vice_captain_id,
    }: {
      match_id: string;
      player_ids: string[];
      captain_id: string;
      vice_captain_id: string;
    }) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user)
        throw new Error("You must be signed in to save a fantasy team.");

      // Check for an existing team for this user + match
      const { data: existing } = await supabase
        .from("fantasy_teams")
        .select("id")
        .eq("user_id", user.id)
        .eq("match_id", match_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("fantasy_teams")
          .update({ player_ids, captain_id, vice_captain_id })
          .eq("id", existing.id)
          .eq("user_id", user.id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return { data, action: "updated" as const };
      } else {
        const { data, error } = await supabase
          .from("fantasy_teams")
          .insert({ user_id: user.id, match_id, player_ids, captain_id, vice_captain_id })
          .select()
          .single();
        if (error) throw new Error(error.message);
        return { data, action: "created" as const };
      }
    },
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.all });
      queryClient.invalidateQueries({ queryKey: ["fantasy_teams", "mine"] });
      if (data?.match_id) {
        queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.byMatch(data.match_id) });
        queryClient.invalidateQueries({ queryKey: ["fantasy_teams", "mine", "match", data.match_id] });
      }
      if (data?.user_id) {
        queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.byUser(data.user_id) });
      }
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

// ─── Save a new fantasy team (explicit insert) ────────────────────────────────

export function useSaveFantasyTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Omit<FantasyTeamInsert, "user_id">) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user)
        throw new Error("You must be signed in to save a fantasy team.");

      const { data, error } = await supabase
        .from("fantasy_teams")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.all });
      queryClient.invalidateQueries({ queryKey: ["fantasy_teams", "mine"] });
      if (data?.match_id) {
        queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.byMatch(data.match_id) });
        queryClient.invalidateQueries({ queryKey: ["fantasy_teams", "mine", "match", data.match_id] });
      }
      if (data?.user_id) {
        queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.byUser(data.user_id) });
      }
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

// ─── Update a fantasy team ────────────────────────────────────────────────────

export function useUpdateFantasyTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: FantasyTeamUpdate & { id: string }) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user)
        throw new Error("You must be signed in to update a fantasy team.");

      const { data, error } = await supabase
        .from("fantasy_teams")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.all });
      queryClient.invalidateQueries({ queryKey: ["fantasy_teams", "mine"] });
      if (data?.id)
        queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.detail(data.id) });
      if (data?.match_id) {
        queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.byMatch(data.match_id) });
        queryClient.invalidateQueries({ queryKey: ["fantasy_teams", "mine", "match", data.match_id] });
      }
      if (data?.user_id)
        queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.byUser(data.user_id) });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

// ─── Delete a fantasy team ────────────────────────────────────────────────────

export function useDeleteFantasyTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user)
        throw new Error("You must be signed in to delete a fantasy team.");

      const { error } = await supabase
        .from("fantasy_teams")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: fantasyTeamKeys.all });
      queryClient.invalidateQueries({ queryKey: ["fantasy_teams", "mine"] });
      queryClient.removeQueries({ queryKey: fantasyTeamKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}
