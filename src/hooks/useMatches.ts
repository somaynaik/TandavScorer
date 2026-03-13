import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MatchInsert, MatchUpdate } from "@/integrations/supabase/types";

export const matchKeys = {
  all: ["matches"] as const,
  byStatus: (status: string) => ["matches", "status", status] as const,
  detail: (id: string) => ["matches", id] as const,
};

export function useMatches() {
  return useQuery({
    queryKey: matchKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .order("date", { ascending: true })
        .order("time", { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function useMatchesByStatus(status: "upcoming" | "live" | "completed") {
  return useQuery({
    queryKey: matchKeys.byStatus(status),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("status", status)
        .order("date", { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function useMatch(id: string) {
  return useQuery({
    queryKey: matchKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!id,
  });
}

export function useMatchRealtime(id: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`match-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${id}` },
        (payload) => {
          queryClient.setQueryData(matchKeys.detail(id), payload.new);
          queryClient.invalidateQueries({ queryKey: matchKeys.all });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, queryClient]);
}

export function useMatchesRealtime() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("matches-all")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => { queryClient.invalidateQueries({ queryKey: matchKeys.all }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);
}

export function useCreateMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MatchInsert) => {
      const { data, error } = await supabase
        .from("matches")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchKeys.all });
    },
  });
}

export function useUpdateMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: MatchUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("matches")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: matchKeys.all });
      if (data?.id) queryClient.invalidateQueries({ queryKey: matchKeys.detail(data.id) });
    },
  });
}

export function useUpdateMatchScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      team1_score,
      team2_score,
      status,
      result,
    }: {
      id: string;
      team1_score?: string | null;
      team2_score?: string | null;
      status?: "upcoming" | "live" | "completed";
      result?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("matches")
        .update({ team1_score, team2_score, status, result })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: matchKeys.all });
      if (data?.id) queryClient.invalidateQueries({ queryKey: matchKeys.detail(data.id) });
    },
  });
}

export function useDeleteMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("matches").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: matchKeys.all });
      queryClient.removeQueries({ queryKey: matchKeys.detail(id) });
    },
  });
}
