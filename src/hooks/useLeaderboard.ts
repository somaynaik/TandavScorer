import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  computeFantasyRankings,
  parseEventMeta,
  type FantasyPlayerMeta,
} from "@/hooks/useScorer";

export type LeaderboardRow = {
  rank: number;
  name: string;
  points: number;
  matches_played: number;
  user_id: string;
};

export type TournamentLeaderboards = {
  mvp: LeaderboardRow[];
  runs: LeaderboardRow[];
  wickets: LeaderboardRow[];
  catches: LeaderboardRow[];
};

export const leaderboardKeys = {
  all: ["leaderboard"] as const,
  scoped: (tournamentId: string | null) =>
    ["leaderboard", "tournament", tournamentId ?? "all"] as const,
  top: (limit: number) => ["leaderboard", "top", limit] as const,
};

function assignRanks(rows: LeaderboardRow[]) {
  rows.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  let currentRank = 0;
  let lastPoints: number | null = null;
  rows.forEach((row, index) => {
    if (lastPoints === null || row.points !== lastPoints) {
      currentRank = index + 1;
      lastPoints = row.points;
    }
    row.rank = currentRank;
  });

  return rows;
}

function buildRows(
  totals: Map<string, { name: string; points: number; matches: Set<string> }>,
): LeaderboardRow[] {
  return assignRanks(
    Array.from(totals.entries()).map(([playerId, data]) => ({
      rank: 0,
      name: data.name,
      points: data.points,
      matches_played: data.matches.size,
      user_id: `player:${playerId}`,
    })),
  );
}

async function buildTournamentLeaderboards(
  tournamentId?: string | null,
): Promise<TournamentLeaderboards> {
  const [eventsRes, playersRes, matchesRes] = await Promise.all([
    supabase
      .from("ball_events")
      .select("match_id, over_number, runs, extras, wicket, description"),
    supabase.from("players").select("id, name, team, role"),
    supabase.from("matches").select("id, tournament_id"),
  ]);

  if (eventsRes.error) throw new Error(eventsRes.error.message);
  if (playersRes.error) throw new Error(playersRes.error.message);
  if (matchesRes.error) throw new Error(matchesRes.error.message);

  const allowedMatchIds =
    tournamentId && tournamentId !== "all"
      ? new Set(
          (matchesRes.data ?? [])
            .filter((match) => match.tournament_id === tournamentId)
            .map((match) => match.id),
        )
      : null;

  const events = (eventsRes.data ?? []).filter((event) =>
    allowedMatchIds ? allowedMatchIds.has(event.match_id) : true,
  );
  const players = playersRes.data ?? [];

  const playerMetaById = new Map<string, FantasyPlayerMeta>(
    players.map((player) => [
      player.id,
      {
        name: player.name,
        team: player.team,
        role: player.role,
      },
    ]),
  );
  const playerIdByName = new Map<string, string>();
  for (const player of players) {
    if (!playerIdByName.has(player.name)) {
      playerIdByName.set(player.name, player.id);
    }
  }

  const mvpTotals = new Map<string, { name: string; points: number; matches: Set<string> }>();
  const runTotals = new Map<string, { name: string; points: number; matches: Set<string> }>();
  const wicketTotals = new Map<string, { name: string; points: number; matches: Set<string> }>();
  const catchTotals = new Map<string, { name: string; points: number; matches: Set<string> }>();

  const ensureTotal = (
    map: Map<string, { name: string; points: number; matches: Set<string> }>,
    playerId: string,
    name: string,
  ) => {
    const current = map.get(playerId);
    if (current) return current;
    const next = { name, points: 0, matches: new Set<string>() };
    map.set(playerId, next);
    return next;
  };

  const matchIds = Array.from(new Set(events.map((event) => event.match_id)));

  for (const matchId of matchIds) {
    const matchEvents = events.filter((event) => event.match_id === matchId);
    const fantasyRanking = computeFantasyRankings(matchEvents, playerMetaById);

    for (const row of fantasyRanking) {
      const playerId = row.id ?? playerIdByName.get(row.name);
      if (!playerId || row.points === 0) continue;
      const target = ensureTotal(mvpTotals, playerId, row.name);
      target.points += row.points;
      target.matches.add(matchId);
    }

    const runsByPlayer = new Map<string, number>();
    const wicketsByPlayer = new Map<string, number>();
    const catchesByPlayer = new Map<string, number>();

    for (const event of matchEvents) {
      const meta = parseEventMeta(event.description);
      const batterId = meta.batterId ?? (meta.batterName ? playerIdByName.get(meta.batterName) : null);
      const bowlerId = meta.bowlerId ?? (meta.bowlerName ? playerIdByName.get(meta.bowlerName) : null);
      const fielderId = meta.fielderId ?? (meta.fielderName ? playerIdByName.get(meta.fielderName) : null);

      if (batterId && !event.extras) {
        runsByPlayer.set(batterId, (runsByPlayer.get(batterId) ?? 0) + event.runs);
      }

      if (bowlerId && event.wicket && event.wicket !== "Run Out") {
        wicketsByPlayer.set(bowlerId, (wicketsByPlayer.get(bowlerId) ?? 0) + 1);
      }

      if (fielderId && event.wicket === "Caught") {
        catchesByPlayer.set(fielderId, (catchesByPlayer.get(fielderId) ?? 0) + 1);
      }
    }

    for (const [playerId, runs] of runsByPlayer.entries()) {
      const target = ensureTotal(
        runTotals,
        playerId,
        playerMetaById.get(playerId)?.name ?? "Unknown Player",
      );
      target.points += runs;
      target.matches.add(matchId);
    }

    for (const [playerId, wickets] of wicketsByPlayer.entries()) {
      const target = ensureTotal(
        wicketTotals,
        playerId,
        playerMetaById.get(playerId)?.name ?? "Unknown Player",
      );
      target.points += wickets;
      target.matches.add(matchId);
    }

    for (const [playerId, catches] of catchesByPlayer.entries()) {
      const target = ensureTotal(
        catchTotals,
        playerId,
        playerMetaById.get(playerId)?.name ?? "Unknown Player",
      );
      target.points += catches;
      target.matches.add(matchId);
    }
  }

  return {
    mvp: buildRows(mvpTotals),
    runs: buildRows(runTotals),
    wickets: buildRows(wicketTotals),
    catches: buildRows(catchTotals),
  };
}

export function useLeaderboard(tournamentId?: string | null) {
  return useQuery({
    queryKey: leaderboardKeys.scoped(tournamentId ?? null),
    queryFn: () => buildTournamentLeaderboards(tournamentId),
    enabled: tournamentId !== undefined,
  });
}

export function useTopLeaderboard(limit: number = 10) {
  return useQuery({
    queryKey: leaderboardKeys.top(limit),
    queryFn: async () => {
      const all = await buildTournamentLeaderboards();
      return all.mvp.slice(0, limit);
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
        { event: "*", schema: "public", table: "ball_events" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
