import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeFantasyRankings } from "@/hooks/useScorer";

type LeaderboardRow = {
  rank: number;
  name: string;
  points: number;
  matches_played: number;
  user_id: string;
};

export const leaderboardKeys = {
  all: ["leaderboard"] as const,
  top: (limit: number) => ["leaderboard", "top", limit] as const,
};

function assignRanks(rows: LeaderboardRow[]) {
  rows.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });
  return rows;
}

async function buildPlayerPerformanceLeaderboard(): Promise<LeaderboardRow[]> {
  const [eventsRes, playersRes] = await Promise.all([
    supabase
      .from("ball_events")
      .select("match_id, over_number, runs, extras, wicket, description"),
    supabase.from("players").select("id, name, team, role"),
  ]);

  if (eventsRes.error) throw new Error(eventsRes.error.message);
  if (playersRes.error) throw new Error(playersRes.error.message);

  const events = eventsRes.data ?? [];
  const players = playersRes.data ?? [];
  if (events.length === 0) return [];

  const playerMetaById = new Map(
    players.map((p) => [p.id, { name: p.name, team: p.team, role: p.role }]),
  );
  const playerIdByName = new Map<string, string>();
  for (const p of players) {
    if (!playerIdByName.has(p.name)) playerIdByName.set(p.name, p.id);
  }

  const byPlayer = new Map<string, { name: string; points: number; matches: number }>();
  const matchIds = Array.from(new Set(events.map((e) => e.match_id)));

  for (const matchId of matchIds) {
    const matchEvents = events.filter((e) => e.match_id === matchId);
    const ranking = computeFantasyRankings(matchEvents, playerMetaById);

    for (const r of ranking) {
      const playerId = r.id ?? playerIdByName.get(r.name);
      if (!playerId || r.points === 0) continue;
      const prev = byPlayer.get(playerId) ?? { name: r.name, points: 0, matches: 0 };
      byPlayer.set(playerId, {
        name: prev.name,
        points: prev.points + r.points,
        matches: prev.matches + 1,
      });
    }
  }

  const rows = Array.from(byPlayer.entries()).map(([playerId, data]) => ({
    rank: 0,
    name: data.name,
    points: data.points,
    matches_played: data.matches,
    user_id: `player:${playerId}`,
  }));

  return assignRanks(rows);
}

async function buildLeaderboard(): Promise<LeaderboardRow[]> {
  return buildPlayerPerformanceLeaderboard();
}

export function useLeaderboard() {
  return useQuery({
    queryKey: leaderboardKeys.all,
    queryFn: buildLeaderboard,
  });
}

export function useTopLeaderboard(limit: number = 10) {
  return useQuery({
    queryKey: leaderboardKeys.top(limit),
    queryFn: async () => {
      const all = await buildLeaderboard();
      return all.slice(0, limit);
    },
  });
}

export function useLeaderboardRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("leaderboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fantasy_teams" },
        () => {
          queryClient.invalidateQueries({ queryKey: leaderboardKeys.all });
          queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ball_events" },
        () => {
          queryClient.invalidateQueries({ queryKey: leaderboardKeys.all });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
