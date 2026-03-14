import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { computeFantasyRankings, type FantasyPlayerMeta } from "@/hooks/useScorer";

export type FantasyUserRankRow = {
  rank: number;
  user_id: string;
  name: string;
  points: number;
  matches_played: number;
};

export const fantasyRankingKeys = {
  all: ["fantasy-user-ranks"] as const,
};

function assignRanks(rows: FantasyUserRankRow[]) {
  rows.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  let currentRank = 0;
  let lastPoints: number | null = null;
  for (let i = 0; i < rows.length; i += 1) {
    if (lastPoints === null || rows[i].points !== lastPoints) {
      currentRank = i + 1;
      lastPoints = rows[i].points;
    }
    rows[i].rank = currentRank;
  }

  return rows;
}

async function buildFantasyUserRankings(): Promise<FantasyUserRankRow[]> {
  const [teamsRes, eventsRes, playersRes, profilesRes] = await Promise.all([
    supabase
      .from("fantasy_teams")
      .select("user_id, match_id, player_ids, captain_id, vice_captain_id"),
    supabase
      .from("ball_events")
      .select("match_id, over_number, runs, extras, wicket, description"),
    supabase.from("players").select("id, name, team, role"),
    supabase.from("profiles").select("id, username"),
  ]);

  if (teamsRes.error) throw new Error(teamsRes.error.message);
  if (eventsRes.error) throw new Error(eventsRes.error.message);
  if (playersRes.error) throw new Error(playersRes.error.message);
  if (profilesRes.error) throw new Error(profilesRes.error.message);

  const fantasyTeams = teamsRes.data ?? [];
  const events = eventsRes.data ?? [];
  const players = playersRes.data ?? [];
  const profiles = profilesRes.data ?? [];

  if (fantasyTeams.length === 0) return [];

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

  const profileNameById = new Map(
    profiles.map((profile) => [profile.id, profile.username || "User"]),
  );

  const eventsByMatch = new Map<string, typeof events>();
  for (const event of events) {
    const list = eventsByMatch.get(event.match_id) ?? [];
    list.push(event);
    eventsByMatch.set(event.match_id, list);
  }

  const perMatchFantasyPoints = new Map<string, Map<string, number>>();
  for (const [matchId, matchEvents] of eventsByMatch.entries()) {
    const rankings = computeFantasyRankings(matchEvents, playerMetaById);
    perMatchFantasyPoints.set(
      matchId,
      new Map(rankings.map((row) => [row.id ?? row.key, row.points])),
    );
  }

  const totals = new Map<
    string,
    { name: string; points: number; matches: Set<string> }
  >();

  for (const team of fantasyTeams) {
    const playerPoints = perMatchFantasyPoints.get(team.match_id) ?? new Map<string, number>();
    let teamPoints = 0;

    for (const playerId of team.player_ids) {
      const basePoints = playerPoints.get(playerId) ?? 0;
      if (playerId === team.captain_id) {
        teamPoints += basePoints * 2;
      } else if (playerId === team.vice_captain_id) {
        teamPoints += basePoints * 1.5;
      } else {
        teamPoints += basePoints;
      }
    }

    const current = totals.get(team.user_id) ?? {
      name: profileNameById.get(team.user_id) ?? "User",
      points: 0,
      matches: new Set<string>(),
    };

    current.points += Math.round(teamPoints);
    current.matches.add(team.match_id);
    totals.set(team.user_id, current);
  }

  return assignRanks(
    Array.from(totals.entries()).map(([userId, data]) => ({
      rank: 0,
      user_id: userId,
      name: data.name,
      points: data.points,
      matches_played: data.matches.size,
    })),
  );
}

export function useFantasyUserRankings() {
  return useQuery({
    queryKey: fantasyRankingKeys.all,
    queryFn: buildFantasyUserRankings,
  });
}

export function useFantasyUserRankingsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("fantasy-user-ranks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fantasy_teams" },
        () => {
          queryClient.invalidateQueries({ queryKey: fantasyRankingKeys.all });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ball_events" },
        () => {
          queryClient.invalidateQueries({ queryKey: fantasyRankingKeys.all });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          queryClient.invalidateQueries({ queryKey: fantasyRankingKeys.all });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
