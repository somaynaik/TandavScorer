import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  RotateCcw,
  Undo2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  useAddBallEvent,
  useUndoLastBallEvent,
  useResetMatchEvents,
  useBallEvents,
  useBallEventsRealtime,
  computeInningsScorecard,
  computeScoreSummary,
  type InningsScorecard,
} from "@/hooks/useScorer";
import { useUpdateMatchScore, useMatch } from "@/hooks/useMatches";
import { useTeamRoster } from "@/hooks/usePlayers";
import type { Player } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Extras = "wide" | "noball" | "bye" | "legbye";
type Wicket = "Bowled" | "Caught" | "Run Out" | "LBW" | "Stumped";
type Innings = 1 | 2;

type MatchSetup = {
  totalOvers: number;
  firstBattingTeam: string;
  teamXi: Record<string, string[]>;
};

type InningsState = {
  strikerId: string | null;
  nonStrikerId: string | null;
  currentBowlerId: string | null;
  bowlerByOver: Record<number, string>;
  outBatterIds: string[];
};

const EMPTY_INNINGS_STATE: InningsState = {
  strikerId: null,
  nonStrikerId: null,
  currentBowlerId: null,
  bowlerByOver: {},
  outBatterIds: [],
};

const ScorerPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const matchId = searchParams.get("matchId") ?? "";
  const innings = (Number(searchParams.get("innings") ?? "1") || 1) as Innings;

  const { data: match } = useMatch(matchId);
  const { data: events = [], isLoading } = useBallEvents(matchId);
  const addEvent = useAddBallEvent();
  const undoLast = useUndoLastBallEvent();
  const resetEvents = useResetMatchEvents();
  const updateScore = useUpdateMatchScore();

  useBallEventsRealtime(matchId);

  const { data: team1Roster = [] } = useTeamRoster(match?.team1 ?? "");
  const { data: team2Roster = [] } = useTeamRoster(match?.team2 ?? "");

  const allPlayers = useMemo(() => [...team1Roster, ...team2Roster], [team1Roster, team2Roster]);
  const playerMap = useMemo(() => {
    const map = new Map<string, Player>();
    for (const p of allPlayers) map.set(p.id, p);
    return map;
  }, [allPlayers]);

  const setupKey = `scorer:setup:${matchId}`;
  const inningsKey = `scorer:innings:${matchId}:${innings}`;

  const [setup, setSetup] = useState<MatchSetup | null>(null);
  const [inningsState, setInningsState] = useState<InningsState>(EMPTY_INNINGS_STATE);

  const [draftOvers, setDraftOvers] = useState(5);
  const [draftFirstBattingTeam, setDraftFirstBattingTeam] = useState("");
  const [draftTeam1Xi, setDraftTeam1Xi] = useState<string[]>([]);
  const [draftTeam2Xi, setDraftTeam2Xi] = useState<string[]>([]);

  const [pendingRuns, setPendingRuns] = useState<number | null>(null);

  useEffect(() => {
    if (!matchId) return;
    const raw = localStorage.getItem(setupKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as MatchSetup;
      setSetup(parsed);
      setDraftOvers(parsed.totalOvers);
      setDraftFirstBattingTeam(parsed.firstBattingTeam);
      setDraftTeam1Xi(parsed.teamXi[match?.team1 ?? ""] ?? []);
      setDraftTeam2Xi(parsed.teamXi[match?.team2 ?? ""] ?? []);
    } catch {
      setSetup(null);
    }
  }, [matchId, setupKey, match?.team1, match?.team2]);

  useEffect(() => {
    if (!matchId) return;
    const raw = localStorage.getItem(inningsKey);
    if (!raw) {
      setInningsState(EMPTY_INNINGS_STATE);
      return;
    }
    try {
      setInningsState(JSON.parse(raw) as InningsState);
    } catch {
      setInningsState(EMPTY_INNINGS_STATE);
    }
  }, [matchId, innings, inningsKey]);

  useEffect(() => {
    if (!matchId) return;
    localStorage.setItem(inningsKey, JSON.stringify(inningsState));
  }, [inningsKey, inningsState, matchId]);

  useEffect(() => {
    if (!match || setup || draftTeam1Xi.length || draftTeam2Xi.length) return;
    setDraftFirstBattingTeam(match.team1);
    setDraftTeam1Xi(team1Roster.slice(0, 11).map((p) => p.id));
    setDraftTeam2Xi(team2Roster.slice(0, 11).map((p) => p.id));
  }, [match, setup, draftTeam1Xi.length, draftTeam2Xi.length, team1Roster, team2Roster]);

  const firstInningsEvents = events.filter((e) => e.innings === 1);
  const inningsEvents = events.filter((e) => e.innings === innings);

  const firstInningsSummary = computeScoreSummary(firstInningsEvents);
  const summary = computeScoreSummary(inningsEvents);
  const legalBalls = legalBallsCount(inningsEvents);
  const inningsScorecard = computeInningsScorecard(
    inningsEvents,
    new Map(Array.from(playerMap.entries()).map(([id, p]) => [id, p.name])),
  );

  const battingTeam =
    setup && match
      ? innings === 1
        ? setup.firstBattingTeam
        : otherTeam(match.team1, match.team2, setup.firstBattingTeam)
      : "";
  const bowlingTeam =
    setup && match ? otherTeam(match.team1, match.team2, battingTeam) : "";

  const battingXi = setup ? setup.teamXi[battingTeam] ?? [] : [];
  const bowlingXi = setup ? setup.teamXi[bowlingTeam] ?? [] : [];

  const totalOvers = setup?.totalOvers ?? 0;
  const target = innings === 2 ? firstInningsSummary.totalRuns + 1 : null;

  const inningsEndedByOvers = totalOvers > 0 && legalBalls >= totalOvers * 6;
  const inningsEndedByAllOut = summary.totalWickets >= 10;
  const inningsEndedByChase = innings === 2 && target !== null && summary.totalRuns >= target;
  const inningsComplete = Boolean(
    setup && (inningsEndedByOvers || inningsEndedByAllOut || inningsEndedByChase),
  );

  const currentOver = summary.currentOver;
  const currentBowlerId = inningsState.bowlerByOver[currentOver] ?? null;
  const previousOverBowlerId = currentOver > 0 ? inningsState.bowlerByOver[currentOver - 1] : null;

  useEffect(() => {
    if (!setup || !currentBowlerId) return;
    setInningsState((prev) => ({ ...prev, currentBowlerId }));
  }, [setup, currentBowlerId]);

  const striker = inningsState.strikerId ? playerMap.get(inningsState.strikerId) : null;
  const nonStriker = inningsState.nonStrikerId ? playerMap.get(inningsState.nonStrikerId) : null;
  const currentBowler = currentBowlerId ? playerMap.get(currentBowlerId) : null;

  const availableBatters = battingXi.filter((id) => !inningsState.outBatterIds.includes(id));
  const availableNextBatters = battingXi.filter(
    (id) =>
      !inningsState.outBatterIds.includes(id) &&
      id !== inningsState.strikerId &&
      id !== inningsState.nonStrikerId,
  );

  const readyToScore =
    Boolean(setup) &&
    Boolean(striker) &&
    Boolean(nonStriker) &&
    Boolean(currentBowler) &&
    !inningsComplete;

  const updateLiveScore = async (runs: number, wicket?: Wicket, extras?: Extras) => {
    if (!matchId || !match || !setup) return;

    const penalty = extras === "wide" || extras === "noball" ? 1 : 0;
    const newRuns = summary.totalRuns + runs + penalty;
    const newWickets = summary.totalWickets + (wicket ? 1 : 0);
    const newLegalBalls = legalBalls + (isLegalDelivery(extras) ? 1 : 0);
    const overStr = `${Math.floor(newLegalBalls / 6)}.${newLegalBalls % 6}`;
    const scoreStr = `${newRuns}/${newWickets} (${overStr})`;

    const battingIsTeam1 = battingTeam === match.team1;
    await updateScore.mutateAsync({
      id: matchId,
      team1_score: battingIsTeam1 ? scoreStr : match.team1_score,
      team2_score: battingIsTeam1 ? match.team2_score : scoreStr,
      status: "live",
    });
  };

  const record = async (runs: number, extras?: Extras, wicket?: Wicket) => {
    if (!readyToScore || !striker || !currentBowler) {
      toast.error("Select striker, non-striker, and current bowler first.");
      return;
    }

    const legal = isLegalDelivery(extras);
    const totalBallRuns = runs + (extras === "wide" || extras === "noball" ? 1 : 0);

    const desc = wicket
      ? `W-${wicket}`
      : extras
        ? `${extras}${runs > 0 ? `+${runs}` : ""}`
        : `${runs}`;

    try {
      await addEvent.mutateAsync({
        match_id: matchId,
        innings,
        over_number: summary.currentOver,
        ball_number: legal ? summary.currentBall + 1 : summary.currentBall,
        runs,
        extras: extras ?? null,
        wicket: wicket ?? null,
        description: `${desc} (${striker.name} vs ${currentBowler.name}) [B:${striker.id}|BO:${currentBowler.id}]`,
      });

      setInningsState((prev) => {
        let next = { ...prev };

        if (wicket && prev.strikerId) {
          next = {
            ...next,
            outBatterIds: [...next.outBatterIds, prev.strikerId],
            strikerId: null,
          };
          return next;
        }

        if (totalBallRuns % 2 === 1 && next.strikerId && next.nonStrikerId) {
          const tmp = next.strikerId;
          next.strikerId = next.nonStrikerId;
          next.nonStrikerId = tmp;
        }

        if (legal && summary.currentBall + 1 === 6 && next.strikerId && next.nonStrikerId) {
          const tmp = next.strikerId;
          next.strikerId = next.nonStrikerId;
          next.nonStrikerId = tmp;
          next.currentBowlerId = null;
        }

        return next;
      });

      await updateLiveScore(runs, wicket, extras);
    } catch (err) {
      toast.error("Failed to save ball event", {
        description: (err as Error).message,
      });
    }
  };

  const confirmWithRuns = async (extras: Extras) => {
    const r = pendingRuns ?? 0;
    setPendingRuns(null);
    await record(r, extras);
  };

  const handleUndo = async () => {
    if (inningsEvents.length === 0) return;
    try {
      await undoLast.mutateAsync({ matchId, innings });
      toast.info("Last ball undone. Re-check batter and bowler selection.");
    } catch (err) {
      toast.error("Failed to undo", { description: (err as Error).message });
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset all ball events for this match? This cannot be undone.")) return;
    try {
      await resetEvents.mutateAsync(matchId);
      localStorage.removeItem(setupKey);
      localStorage.removeItem(`scorer:innings:${matchId}:1`);
      localStorage.removeItem(`scorer:innings:${matchId}:2`);
      setSetup(null);
      setInningsState(EMPTY_INNINGS_STATE);
      toast.success("Match reset");
    } catch (err) {
      toast.error("Failed to reset", { description: (err as Error).message });
    }
  };

  const saveSetup = () => {
    if (!match) return;
    if (draftTeam1Xi.length !== 11 || draftTeam2Xi.length !== 11) {
      toast.error("Select exactly 11 players for each team.");
      return;
    }
    if (!draftFirstBattingTeam) {
      toast.error("Select the team batting first.");
      return;
    }
    if (draftOvers < 1 || draftOvers > 50) {
      toast.error("Overs should be between 1 and 50.");
      return;
    }

    const value: MatchSetup = {
      totalOvers: draftOvers,
      firstBattingTeam: draftFirstBattingTeam,
      teamXi: {
        [match.team1]: draftTeam1Xi,
        [match.team2]: draftTeam2Xi,
      },
    };

    setSetup(value);
    localStorage.setItem(setupKey, JSON.stringify(value));
    localStorage.setItem(`scorer:innings:${matchId}:1`, JSON.stringify(EMPTY_INNINGS_STATE));
    localStorage.setItem(`scorer:innings:${matchId}:2`, JSON.stringify(EMPTY_INNINGS_STATE));
    setInningsState(EMPTY_INNINGS_STATE);

    toast.success("Scoring setup saved.");
    if (innings !== 1) {
      navigate(`/scorer?matchId=${matchId}&innings=1`, { replace: true });
    }
  };

  const selectNewBatter = (id: string) => {
    setInningsState((prev) => ({ ...prev, strikerId: id }));
  };

  const selectStriker = (id: string | null) => {
    if (!id) {
      setInningsState((prev) => ({ ...prev, strikerId: null }));
      return;
    }
    if (id === inningsState.nonStrikerId) {
      toast.error("Striker and non-striker cannot be the same player.");
      return;
    }
    setInningsState((prev) => ({ ...prev, strikerId: id }));
  };

  const selectNonStriker = (id: string | null) => {
    if (!id) {
      setInningsState((prev) => ({ ...prev, nonStrikerId: null }));
      return;
    }
    if (id === inningsState.strikerId) {
      toast.error("Striker and non-striker cannot be the same player.");
      return;
    }
    setInningsState((prev) => ({ ...prev, nonStrikerId: id }));
  };

  const selectBowler = (id: string) => {
    if (id === previousOverBowlerId) {
      toast.error("Same bowler cannot bowl consecutive overs.");
      return;
    }
    setInningsState((prev) => ({
      ...prev,
      currentBowlerId: id,
      bowlerByOver: { ...prev.bowlerByOver, [currentOver]: id },
    }));
  };

  const autoHandledRef = useRef<string>("");
  useEffect(() => {
    if (!setup || !matchId || !match || !inningsComplete) return;

    const key = `${innings}:${summary.totalRuns}:${summary.totalWickets}:${legalBalls}`;
    if (autoHandledRef.current === key) return;
    autoHandledRef.current = key;

    const finish = async () => {
      const overStr = `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
      const score = `${summary.totalRuns}/${summary.totalWickets} (${overStr})`;
      const battingIsTeam1 = battingTeam === match.team1;

      if (innings === 1) {
        await updateScore.mutateAsync({
          id: matchId,
          team1_score: battingIsTeam1 ? score : match.team1_score,
          team2_score: battingIsTeam1 ? match.team2_score : score,
          status: "live",
        });
        toast.success(`Innings 1 ended. Target: ${summary.totalRuns + 1}`);
        navigate(`/scorer?matchId=${matchId}&innings=2`, { replace: true });
        return;
      }

      let result = "Match tied";
      if (target !== null && summary.totalRuns >= target) {
        result = `${battingTeam} won by ${10 - summary.totalWickets} wickets`;
      } else if (target !== null && summary.totalRuns < target - 1) {
        result = `${bowlingTeam} won by ${target - 1 - summary.totalRuns} runs`;
      }

      await updateScore.mutateAsync({
        id: matchId,
        team1_score: battingIsTeam1 ? score : match.team1_score,
        team2_score: battingIsTeam1 ? match.team2_score : score,
        status: "completed",
        result,
      });
      toast.success(`Match completed: ${result}`);
    };

    void finish();
  }, [
    setup,
    inningsComplete,
    innings,
    summary.totalRuns,
    summary.totalWickets,
    legalBalls,
    battingTeam,
    bowlingTeam,
    match,
    matchId,
    navigate,
    target,
    updateScore,
  ]);

  const isBusy = addEvent.isPending || undoLast.isPending || resetEvents.isPending;

  const toggleXi = (teamName: string, id: string) => {
    const setFn = teamName === match?.team1 ? setDraftTeam1Xi : setDraftTeam2Xi;
    const list = teamName === match?.team1 ? draftTeam1Xi : draftTeam2Xi;

    if (list.includes(id)) {
      setFn(list.filter((x) => x !== id));
      return;
    }
    if (list.length >= 11) {
      toast.error("Only 11 players allowed.");
      return;
    }
    setFn([...list, id]);
  };

  return (
    <div className="container py-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Link
          to={matchId ? `/match/${matchId}` : "/admin"}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {matchId ? "Back to match" : "Back to Admin"}
        </Link>

        {matchId ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-live">
            <Wifi className="h-3.5 w-3.5" /> Live sync on
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <WifiOff className="h-3.5 w-3.5" /> No match linked
          </span>
        )}
      </div>

      <h1 className="font-display text-2xl font-bold text-foreground">Ball-by-Ball Scorer</h1>

      {!matchId && (
        <div className="rounded-xl border border-gold/30 bg-gold/10 p-4 text-sm text-gold">
          No <code>?matchId=</code> in URL.
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading events...
        </div>
      )}

      {match && !setup && (
        <div className="rounded-xl border border-border gradient-card p-5 space-y-4 shadow-card">
          <h2 className="font-display text-xl font-bold">Match Setup</h2>
          <p className="text-sm text-muted-foreground">
            Select 11 players per team, choose first batting side, and overs.
          </p>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Total Overs</label>
              <input
                type="number"
                min={1}
                max={50}
                value={draftOvers}
                onChange={(e) => setDraftOvers(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Batting First</label>
              <select
                value={draftFirstBattingTeam}
                onChange={(e) => setDraftFirstBattingTeam(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Select team</option>
                <option value={match.team1}>{match.team1}</option>
                <option value={match.team2}>{match.team2}</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <XiPicker
              teamName={match.team1}
              roster={team1Roster}
              selected={draftTeam1Xi}
              onToggle={toggleXi}
            />
            <XiPicker
              teamName={match.team2}
              roster={team2Roster}
              selected={draftTeam2Xi}
              onToggle={toggleXi}
            />
          </div>

          <button
            onClick={saveSetup}
            className="rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Save Setup and Start Scoring
          </button>
        </div>
      )}

      {setup && (
        <>
          <div className="rounded-xl border border-border gradient-card p-6 shadow-card text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Innings {innings} - {battingTeam} batting vs {bowlingTeam}
            </p>
            <p className="font-display text-5xl font-bold text-foreground">
              {summary.totalRuns}
              <span className="text-muted-foreground text-3xl">/{summary.totalWickets}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Overs: {summary.oversDisplay} / {setup.totalOvers}.0
            </p>
            {innings === 2 && target !== null && (
              <p className="text-sm font-semibold text-primary">
                Target: {target} | Need {Math.max(target - summary.totalRuns, 0)}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-secondary/25 p-4 text-sm space-y-2">
            <p>
              <strong>Striker:</strong> {striker?.name ?? "Select"}
            </p>
            <p>
              <strong>Non-striker:</strong> {nonStriker?.name ?? "Select"}
            </p>
            <p>
              <strong>Current bowler:</strong> {currentBowler?.name ?? "Select"}
            </p>
          </div>

          {(!inningsState.strikerId || !inningsState.nonStrikerId) && !inningsComplete && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <p className="text-sm font-semibold">Choose opening batters</p>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Striker</label>
                  <select
                    value={inningsState.strikerId ?? ""}
                    onChange={(e) => selectStriker(e.target.value || null)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select striker</option>
                    {availableBatters
                      .filter((id) => id !== inningsState.nonStrikerId)
                      .map((id) => (
                        <option key={id} value={id}>
                          {playerMap.get(id)?.name ?? "Unknown"}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Non-striker</label>
                  <select
                    value={inningsState.nonStrikerId ?? ""}
                    onChange={(e) => selectNonStriker(e.target.value || null)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select non-striker</option>
                    {availableBatters
                      .filter((id) => id !== inningsState.strikerId)
                      .map((id) => (
                        <option key={id} value={id}>
                          {playerMap.get(id)?.name ?? "Unknown"}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {!inningsState.strikerId &&
            !!inningsState.nonStrikerId &&
            availableNextBatters.length > 0 &&
            !inningsComplete && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <p className="text-sm font-semibold">Select next batter</p>
              <div className="flex flex-wrap gap-2">
                {availableNextBatters.map((id) => (
                  <button
                    key={id}
                    onClick={() => selectNewBatter(id)}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium"
                  >
                    {playerMap.get(id)?.name ?? "Unknown"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!currentBowler && !inningsComplete && (
            <div className="rounded-xl border border-gold/30 bg-gold/10 p-4 space-y-3">
              <p className="text-sm font-semibold">
                Select bowler for over {currentOver + 1}
              </p>
              <div className="flex flex-wrap gap-2">
                {bowlingXi.map((id) => (
                  <button
                    key={id}
                    onClick={() => selectBowler(id)}
                    disabled={id === previousOverBowlerId}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                  >
                    {playerMap.get(id)?.name ?? "Unknown"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {pendingRuns !== null && (
            <div className="rounded-xl border border-gold/30 bg-gold/10 p-4 space-y-3">
              <p className="text-sm font-semibold">Extra runs on this ball</p>
              <div className="flex items-center gap-2 flex-wrap">
                {[0, 1, 2, 3, 4].map((r) => (
                  <button
                    key={r}
                    onClick={() => setPendingRuns(r)}
                    className={`h-10 w-10 rounded-xl border font-display text-lg font-bold ${
                      pendingRuns === r
                        ? "gradient-primary border-primary text-primary-foreground"
                        : "border-border bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => confirmWithRuns("wide")}
                  className="rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Confirm Wide
                </button>
                <button
                  onClick={() => confirmWithRuns("noball")}
                  className="rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Confirm No Ball
                </button>
                <button
                  onClick={() => setPendingRuns(null)}
                  className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">Runs</p>
              <div className="grid grid-cols-6 gap-2">
                {[0, 1, 2, 3, 4, 6].map((r) => (
                  <button
                    key={r}
                    onClick={() => record(r)}
                    disabled={isBusy || !readyToScore}
                    className="rounded-xl border border-border bg-secondary py-4 font-display text-xl font-bold disabled:opacity-40"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">Extras</p>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => setPendingRuns(0)}
                  disabled={isBusy || !readyToScore}
                  className="rounded-xl border border-border bg-secondary py-3 text-sm font-semibold disabled:opacity-40"
                >
                  Wide
                </button>
                <button
                  onClick={() => setPendingRuns(0)}
                  disabled={isBusy || !readyToScore}
                  className="rounded-xl border border-border bg-secondary py-3 text-sm font-semibold disabled:opacity-40"
                >
                  No Ball
                </button>
                <button
                  onClick={() => record(0, "bye")}
                  disabled={isBusy || !readyToScore}
                  className="rounded-xl border border-border bg-secondary py-3 text-sm font-semibold disabled:opacity-40"
                >
                  Bye
                </button>
                <button
                  onClick={() => record(0, "legbye")}
                  disabled={isBusy || !readyToScore}
                  className="rounded-xl border border-border bg-secondary py-3 text-sm font-semibold disabled:opacity-40"
                >
                  Leg Bye
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">Wickets</p>
              <div className="grid grid-cols-5 gap-2">
                {(["Bowled", "Caught", "Run Out", "LBW", "Stumped"] as Wicket[]).map((w) => (
                  <button
                    key={w}
                    onClick={() => record(0, undefined, w)}
                    disabled={isBusy || !readyToScore}
                    className="rounded-xl border border-destructive/30 bg-destructive/10 py-3 text-xs font-semibold text-destructive disabled:opacity-40"
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleUndo}
              disabled={isBusy || inningsEvents.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              <Undo2 className="h-4 w-4" /> Undo Last Ball
            </button>

            <button
              onClick={handleReset}
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" /> Reset Match
            </button>
          </div>

          {inningsComplete && (
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm font-semibold text-primary">
              Innings complete. {innings === 1 ? "Switching to chase..." : "Match completed."}
            </div>
          )}

          <ScorecardTables
            title={`Innings ${innings} Scorecard`}
            scorecard={inningsScorecard}
          />
        </>
      )}
    </div>
  );
};

type ScorecardTablesProps = {
  title: string;
  scorecard: InningsScorecard;
};

const ScorecardTables = ({ title, scorecard }: ScorecardTablesProps) => (
  <div className="space-y-4">
    <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>

    <div className="rounded-xl border border-border gradient-card shadow-card overflow-hidden">
      <div className="border-b border-border px-5 py-3">
        <h3 className="font-display font-bold text-foreground text-sm">Batting</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
              <th className="py-2.5 px-4 text-left font-medium">Batter</th>
              <th className="py-2.5 px-4 text-right font-medium">R</th>
              <th className="py-2.5 px-4 text-right font-medium">B</th>
              <th className="py-2.5 px-4 text-right font-medium">4s</th>
              <th className="py-2.5 px-4 text-right font-medium">6s</th>
              <th className="py-2.5 px-4 text-right font-medium">SR</th>
              <th className="py-2.5 px-4 text-left font-medium">Dismissal</th>
            </tr>
          </thead>
          <tbody>
            {scorecard.batters.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 px-4 text-center text-muted-foreground text-xs">
                  No batting events yet.
                </td>
              </tr>
            )}
            {scorecard.batters.map((b) => {
              const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : "-";
              return (
                <tr key={b.key} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 px-4 font-medium text-foreground">{b.name}</td>
                  <td className="py-2.5 px-4 text-right font-display font-bold text-foreground">{b.runs}</td>
                  <td className="py-2.5 px-4 text-right text-muted-foreground">{b.balls}</td>
                  <td className="py-2.5 px-4 text-right text-muted-foreground">{b.fours}</td>
                  <td className="py-2.5 px-4 text-right text-muted-foreground">{b.sixes}</td>
                  <td className="py-2.5 px-4 text-right text-muted-foreground">{sr}</td>
                  <td className="py-2.5 px-4 text-xs text-muted-foreground">
                    {b.isOut ? b.dismissal ?? "out" : "not out"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

    <div className="rounded-xl border border-border gradient-card shadow-card overflow-hidden">
      <div className="border-b border-border px-5 py-3">
        <h3 className="font-display font-bold text-foreground text-sm">Bowling</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
              <th className="py-2.5 px-4 text-left font-medium">Bowler</th>
              <th className="py-2.5 px-4 text-right font-medium">O</th>
              <th className="py-2.5 px-4 text-right font-medium">R</th>
              <th className="py-2.5 px-4 text-right font-medium">W</th>
              <th className="py-2.5 px-4 text-right font-medium">Econ</th>
            </tr>
          </thead>
          <tbody>
            {scorecard.bowlers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 px-4 text-center text-muted-foreground text-xs">
                  No bowling events yet.
                </td>
              </tr>
            )}
            {scorecard.bowlers.map((b) => {
              const oversNum = b.balls / 6;
              const econ = oversNum > 0 ? (b.runsConceded / oversNum).toFixed(1) : "-";
              return (
                <tr key={b.key} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 px-4 font-medium text-foreground">{b.name}</td>
                  <td className="py-2.5 px-4 text-right text-muted-foreground">{b.overs}</td>
                  <td className="py-2.5 px-4 text-right text-muted-foreground">{b.runsConceded}</td>
                  <td className="py-2.5 px-4 text-right font-display font-bold text-foreground">{b.wickets}</td>
                  <td className="py-2.5 px-4 text-right text-muted-foreground">{econ}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

type XiPickerProps = {
  teamName: string;
  roster: Player[];
  selected: string[];
  onToggle: (teamName: string, id: string) => void;
};

const XiPicker = ({ teamName, roster, selected, onToggle }: XiPickerProps) => (
  <div className="rounded-lg border border-border bg-background/60 p-3 space-y-2">
    <p className="text-sm font-semibold">
      {teamName} XI ({selected.length}/11)
    </p>
    <div className="max-h-64 overflow-auto space-y-1">
      {roster.map((p) => {
        const isSelected = selected.includes(p.id);
        return (
          <button
            key={p.id}
            onClick={() => onToggle(teamName, p.id)}
            className={`w-full text-left rounded-md border px-2 py-1.5 text-xs ${
              isSelected
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-background"
            }`}
          >
            {p.name} ({p.role})
          </button>
        );
      })}
      {roster.length === 0 && <p className="text-xs text-muted-foreground">No squad players found.</p>}
    </div>
  </div>
);

function isLegalDelivery(extras?: Extras) {
  return !extras || extras === "bye" || extras === "legbye";
}

function legalBallsCount(events: Array<{ extras: string | null }>): number {
  return events.filter((e) => !e.extras || e.extras === "bye" || e.extras === "legbye").length;
}

function otherTeam(team1: string, team2: string, selected: string) {
  return selected === team1 ? team2 : team1;
}

export default ScorerPage;
