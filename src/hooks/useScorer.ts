import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BallEventInsert } from "@/integrations/supabase/types";

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const scorerKeys = {
  all: ["ball_events"] as const,
  byMatch: (matchId: string) => ["ball_events", "match", matchId] as const,
  byMatchAndInnings: (matchId: string, innings: 1 | 2) =>
    ["ball_events", "match", matchId, "innings", innings] as const,
};

// ─── Fetch all ball events for a match ────────────────────────────────────────

export function useBallEvents(matchId: string) {
  return useQuery({
    queryKey: scorerKeys.byMatch(matchId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ball_events")
        .select("*")
        .eq("match_id", matchId)
        .order("innings", { ascending: true })
        .order("over_number", { ascending: true })
        .order("ball_number", { ascending: true });

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!matchId,
  });
}

// ─── Fetch ball events for a specific innings ─────────────────────────────────

export function useBallEventsByInnings(matchId: string, innings: 1 | 2) {
  return useQuery({
    queryKey: scorerKeys.byMatchAndInnings(matchId, innings),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ball_events")
        .select("*")
        .eq("match_id", matchId)
        .eq("innings", innings)
        .order("over_number", { ascending: true })
        .order("ball_number", { ascending: true });

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!matchId,
  });
}

// ─── Add a ball event ─────────────────────────────────────────────────────────

export function useAddBallEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BallEventInsert) => {
      const { data, error } = await supabase
        .from("ball_events")
        .insert(payload)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      if (data?.match_id) {
        queryClient.invalidateQueries({
          queryKey: scorerKeys.byMatch(data.match_id),
        });
        queryClient.invalidateQueries({
          queryKey: scorerKeys.byMatchAndInnings(
            data.match_id,
            data.innings as 1 | 2
          ),
        });
      }
    },
  });
}

// ─── Undo last ball event ─────────────────────────────────────────────────────

export function useUndoLastBallEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      matchId,
      innings,
    }: {
      matchId: string;
      innings: 1 | 2;
    }) => {
      const { data: latest, error: fetchError } = await supabase
        .from("ball_events")
        .select("id")
        .eq("match_id", matchId)
        .eq("innings", innings)
        .order("over_number", { ascending: false })
        .order("ball_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw new Error(fetchError.message);
      if (!latest) throw new Error("No ball events to undo.");

      const { error: deleteError } = await supabase
        .from("ball_events")
        .delete()
        .eq("id", latest.id);

      if (deleteError) throw new Error(deleteError.message);
      return { matchId, innings };
    },
    onSuccess: ({ matchId, innings }) => {
      queryClient.invalidateQueries({ queryKey: scorerKeys.byMatch(matchId) });
      queryClient.invalidateQueries({
        queryKey: scorerKeys.byMatchAndInnings(matchId, innings),
      });
    },
  });
}

// ─── Reset all ball events for a match ───────────────────────────────────────

export function useResetMatchEvents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase
        .from("ball_events")
        .delete()
        .eq("match_id", matchId);

      if (error) throw new Error(error.message);
      return matchId;
    },
    onSuccess: (matchId) => {
      queryClient.invalidateQueries({ queryKey: scorerKeys.byMatch(matchId) });
    },
  });
}

// ─── Realtime subscription for live ball events ───────────────────────────────

export function useBallEventsRealtime(matchId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`ball-events-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ball_events",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const incoming = payload.new as {
            innings: 1 | 2;
            [key: string]: unknown;
          };

          // Optimistically append to match-level cache
          queryClient.setQueryData(
            scorerKeys.byMatch(matchId),
            (old: unknown[] | undefined) =>
              old ? [...old, incoming] : [incoming]
          );

          // Also append to innings-level cache
          queryClient.setQueryData(
            scorerKeys.byMatchAndInnings(matchId, incoming.innings),
            (old: unknown[] | undefined) =>
              old ? [...old, incoming] : [incoming]
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "ball_events",
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          // On delete (undo/reset), refetch for consistency
          queryClient.invalidateQueries({
            queryKey: scorerKeys.byMatch(matchId),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, queryClient]);
}

// ─── Score computation (pure, client-side) ────────────────────────────────────

export interface ScoreSummary {
  totalRuns: number;
  totalWickets: number;
  currentOver: number;
  currentBall: number;
  oversDisplay: string;
}

export interface ScorecardBatter {
  key: string;
  id: string | null;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissal: string | null;
}

export interface ScorecardBowler {
  key: string;
  id: string | null;
  name: string;
  balls: number;
  overs: string;
  runsConceded: number;
  wickets: number;
}

export interface InningsScorecard {
  batters: ScorecardBatter[];
  bowlers: ScorecardBowler[];
}

export interface FantasyPlayerMeta {
  name: string;
  team?: string;
  role?: string;
}

export interface FantasyRankedPlayer {
  key: string;
  id: string | null;
  name: string;
  team: string;
  role: string;
  points: number;
  rank: number;
}

type ParsedMeta = {
  cleanDescription: string;
  batterId: string | null;
  bowlerId: string | null;
  batterName: string | null;
  bowlerName: string | null;
};

function parseEventMeta(description: string | null): ParsedMeta {
  const text = description ?? "";
  const actorMatch = text.match(/\[B:([^\]|]+)\|BO:([^\]]+)\]\s*$/);
  const withNoActor = actorMatch ? text.replace(actorMatch[0], "").trim() : text;
  const nameMatch = withNoActor.match(/\((.+) vs (.+)\)\s*$/);
  const cleanDescription = nameMatch
    ? withNoActor.replace(nameMatch[0], "").trim()
    : withNoActor.trim();

  return {
    cleanDescription,
    batterId: actorMatch ? actorMatch[1] : null,
    bowlerId: actorMatch ? actorMatch[2] : null,
    batterName: nameMatch ? nameMatch[1] : null,
    bowlerName: nameMatch ? nameMatch[2] : null,
  };
}

function oversFromBalls(balls: number) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

export function toEventDisplay(description: string | null): string {
  return parseEventMeta(description).cleanDescription || "-";
}

export function computeScoreSummary(
  events: Array<{
    runs: number;
    extras: string | null;
    wicket: string | null;
  }>
): ScoreSummary {
  let totalRuns = 0;
  let totalWickets = 0;
  let legalBalls = 0;

  for (const e of events) {
    const penaltyRun =
      e.extras === "wide" || e.extras === "noball" ? 1 : 0;
    totalRuns += e.runs + penaltyRun;

    if (e.wicket) totalWickets += 1;

    const isLegal =
      !e.extras || e.extras === "bye" || e.extras === "legbye";
    if (isLegal) legalBalls += 1;
  }

  const currentOver = Math.floor(legalBalls / 6);
  const currentBall = legalBalls % 6;
  const oversDisplay = `${currentOver}.${currentBall}`;

  return { totalRuns, totalWickets, currentOver, currentBall, oversDisplay };
}

export function computeInningsScorecard(
  events: Array<{
    runs: number;
    extras: "wide" | "noball" | "bye" | "legbye" | null;
    wicket: "Bowled" | "Caught" | "Run Out" | "LBW" | "Stumped" | null;
    description: string | null;
  }>,
  playerNameById?: Map<string, string>,
): InningsScorecard {
  const batterMap = new Map<string, ScorecardBatter>();
  const bowlerMap = new Map<string, Omit<ScorecardBowler, "overs">>();

  const ensureBatter = (id: string | null, fallbackName: string | null) => {
    const key = id ?? `name:${fallbackName ?? "Unknown Batter"}`;
    if (!batterMap.has(key)) {
      batterMap.set(key, {
        key,
        id,
        name:
          (id ? playerNameById?.get(id) : null) ??
          fallbackName ??
          "Unknown Batter",
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        isOut: false,
        dismissal: null,
      });
    }
    return batterMap.get(key)!;
  };

  const ensureBowler = (id: string | null, fallbackName: string | null) => {
    const key = id ?? `name:${fallbackName ?? "Unknown Bowler"}`;
    if (!bowlerMap.has(key)) {
      bowlerMap.set(key, {
        key,
        id,
        name:
          (id ? playerNameById?.get(id) : null) ??
          fallbackName ??
          "Unknown Bowler",
        balls: 0,
        runsConceded: 0,
        wickets: 0,
      });
    }
    return bowlerMap.get(key)!;
  };

  for (const e of events) {
    const meta = parseEventMeta(e.description);
    const batter = ensureBatter(meta.batterId, meta.batterName);
    const bowler = ensureBowler(meta.bowlerId, meta.bowlerName);

    const legalDelivery =
      !e.extras || e.extras === "bye" || e.extras === "legbye";
    const penaltyRun = e.extras === "wide" || e.extras === "noball" ? 1 : 0;

    if (legalDelivery) {
      batter.balls += 1;
      bowler.balls += 1;
    }

    // Treat byes/legbyes as non-batting runs.
    if (!e.extras) {
      batter.runs += e.runs;
      if (e.runs === 4) batter.fours += 1;
      if (e.runs === 6) batter.sixes += 1;
    }

    // Byes/legbyes are not charged to bowler.
    const bowlerRuns = e.extras === "bye" || e.extras === "legbye" ? penaltyRun : penaltyRun + e.runs;
    bowler.runsConceded += bowlerRuns;

    if (e.wicket) {
      batter.isOut = true;
      batter.dismissal =
        e.wicket === "Run Out" ? "run out" : `${e.wicket.toLowerCase()} b ${bowler.name}`;
      if (e.wicket !== "Run Out") {
        bowler.wickets += 1;
      }
    }
  }

  const batters = Array.from(batterMap.values());
  const bowlers = Array.from(bowlerMap.values()).map((b) => ({
    ...b,
    overs: oversFromBalls(b.balls),
  }));

  return { batters, bowlers };
}

export function computeFantasyRankings(
  events: Array<{
    over_number: number;
    runs: number;
    extras: "wide" | "noball" | "bye" | "legbye" | null;
    wicket: "Bowled" | "Caught" | "Run Out" | "LBW" | "Stumped" | null;
    description: string | null;
  }>,
  playerMetaById?: Map<string, FantasyPlayerMeta>,
): FantasyRankedPlayer[] {
  type BatterStats = {
    id: string | null;
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    dismissed: boolean;
  };
  type BowlerStats = {
    id: string | null;
    name: string;
    balls: number;
    runsConceded: number;
    wickets: number;
    lbwOrBowledWickets: number;
    maidens: number;
  };
  type OverStats = { legalBalls: number; runsInOver: number };

  const batterMap = new Map<string, BatterStats>();
  const bowlerMap = new Map<string, BowlerStats>();
  const bowlerOverMap = new Map<string, Map<number, OverStats>>();

  const ensureBatter = (id: string | null, fallbackName: string | null) => {
    const key = id ?? `name:${fallbackName ?? "Unknown Batter"}`;
    if (!batterMap.has(key)) {
      batterMap.set(key, {
        id,
        name:
          (id ? playerMetaById?.get(id)?.name : null) ??
          fallbackName ??
          "Unknown Batter",
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        dismissed: false,
      });
    }
    return { key, stats: batterMap.get(key)! };
  };

  const ensureBowler = (id: string | null, fallbackName: string | null) => {
    const key = id ?? `name:${fallbackName ?? "Unknown Bowler"}`;
    if (!bowlerMap.has(key)) {
      bowlerMap.set(key, {
        id,
        name:
          (id ? playerMetaById?.get(id)?.name : null) ??
          fallbackName ??
          "Unknown Bowler",
        balls: 0,
        runsConceded: 0,
        wickets: 0,
        lbwOrBowledWickets: 0,
        maidens: 0,
      });
    }
    if (!bowlerOverMap.has(key)) bowlerOverMap.set(key, new Map<number, OverStats>());
    return { key, stats: bowlerMap.get(key)! };
  };

  for (const e of events) {
    const meta = parseEventMeta(e.description);
    const batter = ensureBatter(meta.batterId, meta.batterName);
    const bowler = ensureBowler(meta.bowlerId, meta.bowlerName);

    const legalDelivery =
      !e.extras || e.extras === "bye" || e.extras === "legbye";
    const penaltyRun = e.extras === "wide" || e.extras === "noball" ? 1 : 0;
    const totalRunsThisBall = e.runs + penaltyRun;

    if (legalDelivery) batter.stats.balls += 1;
    if (!e.extras) {
      batter.stats.runs += e.runs;
      if (e.runs === 4) batter.stats.fours += 1;
      if (e.runs === 6) batter.stats.sixes += 1;
    }
    if (e.wicket) batter.stats.dismissed = true;

    const bowlerRuns =
      e.extras === "bye" || e.extras === "legbye" ? penaltyRun : totalRunsThisBall;
    if (legalDelivery) bowler.stats.balls += 1;
    bowler.stats.runsConceded += bowlerRuns;
    // Count all bowler-earned wickets, including caught dismissals.
    if (e.wicket && e.wicket !== "Run Out") {
      bowler.stats.wickets += 1;
      if (e.wicket === "LBW" || e.wicket === "Bowled") {
        bowler.stats.lbwOrBowledWickets += 1;
      }
    }

    const byOver = bowlerOverMap.get(bowler.key)!;
    const overStats = byOver.get(e.over_number) ?? { legalBalls: 0, runsInOver: 0 };
    if (legalDelivery) overStats.legalBalls += 1;
    overStats.runsInOver += totalRunsThisBall;
    byOver.set(e.over_number, overStats);
  }

  for (const [bowlerKey, overs] of bowlerOverMap.entries()) {
    const b = bowlerMap.get(bowlerKey);
    if (!b) continue;
    let maidens = 0;
    for (const overStats of overs.values()) {
      if (overStats.legalBalls === 6 && overStats.runsInOver === 0) maidens += 1;
    }
    b.maidens = maidens;
  }

  const pointMap = new Map<string, number>();
  const upsertPoints = (key: string, value: number) => {
    pointMap.set(key, (pointMap.get(key) ?? 0) + value);
  };

  for (const [key, b] of batterMap.entries()) {
    let points = 0;
    points += b.runs; // +1 run
    points += b.fours; // +1 per four
    points += b.sixes * 2; // +2 per six

    if (b.runs >= 100) points += 16;
    else if (b.runs >= 50) points += 8;
    else if (b.runs >= 25) points += 4;

    if (b.balls >= 10) {
      const sr = (b.runs / b.balls) * 100;
      if (sr >= 190) points += 6;
      else if (sr >= 170) points += 4;
      else if (sr >= 150) points += 2;
      else if (sr < 60) points -= 6;
      else if (sr < 70) points -= 4;
      else if (sr < 80) points -= 2;
    }

    if (b.dismissed && b.runs === 0) points -= 2; // duck
    upsertPoints(key, points);
  }

  for (const [key, b] of bowlerMap.entries()) {
    let points = 0;
    points += b.wickets * 25;
    if (b.wickets >= 4) points += 12;
    else if (b.wickets === 3) points += 8;
    else if (b.wickets === 2) points += 4;
    points += b.lbwOrBowledWickets * 8;
    points += b.maidens * 12;

    const overs = b.balls / 6;
    if (overs >= 2) {
      const econ = b.runsConceded / overs;
      if (econ < 5) points += 6;
      else if (econ < 6) points += 4;
      else if (econ > 16) points -= 6;
      else if (econ >= 15) points -= 4;
      else if (econ >= 14) points -= 2;
    }

    upsertPoints(key, points);
  }

  const identity = new Map<
    string,
    { id: string | null; name: string; team: string; role: string }
  >();

  for (const [key, b] of batterMap.entries()) {
    const meta = b.id ? playerMetaById?.get(b.id) : undefined;
    identity.set(key, {
      id: b.id,
      name: b.name,
      team: meta?.team ?? "-",
      role: meta?.role ?? "-",
    });
  }
  for (const [key, b] of bowlerMap.entries()) {
    if (identity.has(key)) continue;
    const meta = b.id ? playerMetaById?.get(b.id) : undefined;
    identity.set(key, {
      id: b.id,
      name: b.name,
      team: meta?.team ?? "-",
      role: meta?.role ?? "-",
    });
  }

  if (playerMetaById) {
    for (const [id, meta] of playerMetaById.entries()) {
      const key = id;
      if (identity.has(key)) continue;
      identity.set(key, {
        id,
        name: meta.name,
        team: meta.team ?? "-",
        role: meta.role ?? "-",
      });
      if (!pointMap.has(key)) pointMap.set(key, 0);
    }
  }

  const rows = Array.from(identity.entries()).map(([key, info]) => ({
    key,
    id: info.id,
    name: info.name,
    team: info.team,
    role: info.role,
    points: Math.round(pointMap.get(key) ?? 0),
    rank: 0,
  }));

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
