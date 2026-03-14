import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { useMatch, useMatchRealtime } from "@/hooks/useMatches";
import { usePlayersByMatch, useTeamRoster } from "@/hooks/usePlayers";
import {
  computeFantasyRankings,
  computeInningsScorecard,
  computeScoreSummary,
  useBallEvents,
  type FantasyRankedPlayer,
  type InningsScorecard,
  type ScorecardBatter,
  type ScorecardBowler,
} from "@/hooks/useScorer";

type MatchTab = "summary" | "scorecard" | "fantasy";

const MatchDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<MatchTab>("summary");

  const {
    data: match,
    isLoading: matchLoading,
    error: matchError,
  } = useMatch(id!);
  const { data: players, isLoading: playersLoading } = usePlayersByMatch(id!);
  const { data: events = [], isLoading: eventsLoading } = useBallEvents(id!);
  const { data: team1Roster = [], isLoading: team1RosterLoading } = useTeamRoster(
    match?.team1 ?? "",
  );
  const { data: team2Roster = [], isLoading: team2RosterLoading } = useTeamRoster(
    match?.team2 ?? "",
  );

  useMatchRealtime(id!);

  const playerById = useMemo(
    () => new Map((players ?? []).map((p) => [p.id, { team: p.team }])),
    [players],
  );
  const playerNameById = useMemo(
    () => new Map((players ?? []).map((p) => [p.id, p.name])),
    [players],
  );
  const fantasyMetaById = useMemo(() => {
    const byId = new Map<string, { name: string; team?: string; role?: string }>();
    for (const p of [...team1Roster, ...team2Roster, ...(players ?? [])]) {
      byId.set(p.id, { name: p.name, team: p.team, role: p.role });
    }

    if (!id) return byId;
    const setupRaw = localStorage.getItem(`scorer:setup:${id}`);
    if (!setupRaw) return byId;

    try {
      const parsed = JSON.parse(setupRaw) as {
        teamXi?: Record<string, string[]>;
      };
      const xiIds = new Set(
        Object.values(parsed.teamXi ?? {})
          .flat()
          .filter(Boolean),
      );
      const xiOnly = new Map<string, { name: string; team?: string; role?: string }>();
      for (const pid of xiIds) {
        const meta = byId.get(pid);
        if (meta) xiOnly.set(pid, meta);
      }
      return xiOnly.size > 0 ? xiOnly : byId;
    } catch {
      return byId;
    }
  }, [id, players, team1Roster, team2Roster]);

  const innings1Events = events.filter((e) => e.innings === 1);
  const innings2Events = events.filter((e) => e.innings === 2);
  const innings3Events = events.filter((e) => e.innings === 3);
  const innings4Events = events.filter((e) => e.innings === 4);

  const innings1Summary = computeScoreSummary(innings1Events);
  const innings2Summary = computeScoreSummary(innings2Events);
  const innings3Summary = computeScoreSummary(innings3Events);
  const innings4Summary = computeScoreSummary(innings4Events);

  const innings1Scorecard = computeInningsScorecard(innings1Events, playerNameById);
  const innings2Scorecard = computeInningsScorecard(innings2Events, playerNameById);
  const innings3Scorecard = computeInningsScorecard(innings3Events, playerNameById);
  const innings4Scorecard = computeInningsScorecard(innings4Events, playerNameById);

  const topBatters = useMemo(() => {
    const all = [...innings1Scorecard.batters, ...innings2Scorecard.batters];
    return all
      .sort((a, b) => b.runs - a.runs || b.balls - a.balls)
      .slice(0, 5);
  }, [innings1Scorecard.batters, innings2Scorecard.batters]);

  const topBowlers = useMemo(() => {
    const all = [...innings1Scorecard.bowlers, ...innings2Scorecard.bowlers];
    return all
      .sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded)
      .slice(0, 5);
  }, [innings1Scorecard.bowlers, innings2Scorecard.bowlers]);

  const fantasyPlayers = useMemo(
    () => computeFantasyRankings(events, fantasyMetaById),
    [events, fantasyMetaById],
  );

  if (
    matchLoading ||
    playersLoading ||
    eventsLoading ||
    team1RosterLoading ||
    team2RosterLoading
  ) {
    return (
      <div className="container py-16 flex items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Loading match...</span>
      </div>
    );
  }

  if (matchError || !match) {
    return (
      <div className="container py-16 text-center space-y-3">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <p className="text-muted-foreground">Match not found.</p>
        <Link
          to="/matches"
          className="text-primary hover:underline text-sm inline-block"
        >
          Back to matches
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <Link
        to="/matches"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to matches
      </Link>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="p-6 space-y-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Match Overview
          </p>

          <div className="grid md:grid-cols-2 gap-4 items-end">
            <div>
              <p className="font-display text-3xl font-bold text-foreground">
                {match.team1}
              </p>
              <p className="font-display text-4xl font-bold text-foreground mt-1">
                {match.team1_score ?? "-"}
              </p>
            </div>
            <div className="md:text-right">
              <p className="font-display text-3xl font-bold text-foreground">
                {match.team2}
              </p>
              <p className="font-display text-4xl font-bold text-foreground mt-1">
                {match.team2_score ?? "-"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>{match.date}</span>
            <span>{match.time?.slice(0, 5)}</span>
            <span>{match.venue}</span>
            <span className="capitalize">Status: {match.status}</span>
          </div>

          {match.result && (
            <p className="text-base font-semibold text-primary">{match.result}</p>
          )}
        </div>

        <div className="border-t border-border bg-secondary/30 px-4">
          <div className="flex flex-wrap gap-1">
            <TabButton
              label="Summary"
              active={activeTab === "summary"}
              onClick={() => setActiveTab("summary")}
            />
            <TabButton
              label="Scorecard"
              active={activeTab === "scorecard"}
              onClick={() => setActiveTab("scorecard")}
            />
            <TabButton
              label="Fantasy Points"
              active={activeTab === "fantasy"}
              onClick={() => setActiveTab("fantasy")}
            />
          </div>
        </div>
      </div>

      {activeTab === "summary" && (
        <SummaryTab
          topBatters={topBatters}
          topBowlers={topBowlers}
          playerById={playerById}
        />
      )}

      {activeTab === "scorecard" && (
        <div className="space-y-6">
          <InningsScorecardSection
            title={`Innings 1 (${innings1Summary.totalRuns}/${innings1Summary.totalWickets})`}
            scorecard={innings1Scorecard}
          />
          <InningsScorecardSection
            title={`Innings 2 (${innings2Summary.totalRuns}/${innings2Summary.totalWickets})`}
            scorecard={innings2Scorecard}
          />
          {innings3Events.length > 0 && (
            <InningsScorecardSection
              title={`Super Over 1 (${innings3Summary.totalRuns}/${innings3Summary.totalWickets})`}
              scorecard={innings3Scorecard}
            />
          )}
          {innings4Events.length > 0 && (
            <InningsScorecardSection
              title={`Super Over 2 (${innings4Summary.totalRuns}/${innings4Summary.totalWickets})`}
              scorecard={innings4Scorecard}
            />
          )}
        </div>
      )}

      {activeTab === "fantasy" && <FantasyPointsTab players={fantasyPlayers} />}
    </div>
  );
};

interface TabButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const TabButton = ({ label, active, onClick }: TabButtonProps) => (
  <button
    onClick={onClick}
    className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
      active
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`}
  >
    {label}
  </button>
);

interface SummaryTabProps {
  topBatters: ScorecardBatter[];
  topBowlers: ScorecardBowler[];
  playerById: Map<string, { team: string }>;
}

const SummaryTab = ({ topBatters, topBowlers, playerById }: SummaryTabProps) => (
  <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
    <div className="border-b border-border px-5 py-3">
      <h2 className="font-display text-2xl font-bold text-foreground">Summary</h2>
    </div>

    <div className="p-5 space-y-6">
      <div>
        <h3 className="font-display font-bold text-foreground text-lg mb-3">Best Batters</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                <th className="py-2.5 px-2 text-left font-medium">Batter</th>
                <th className="py-2.5 px-2 text-right font-medium">R</th>
                <th className="py-2.5 px-2 text-right font-medium">B</th>
                <th className="py-2.5 px-2 text-right font-medium">4s</th>
                <th className="py-2.5 px-2 text-right font-medium">6s</th>
                <th className="py-2.5 px-2 text-right font-medium">SR</th>
              </tr>
            </thead>
            <tbody>
              {topBatters.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 px-2 text-center text-xs text-muted-foreground">
                    No batting performances yet.
                  </td>
                </tr>
              )}
              {topBatters.map((b) => {
                const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : "-";
                const team = b.id ? playerById.get(b.id)?.team : "";
                return (
                  <tr key={b.key} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 px-2 font-medium text-foreground">
                      {b.name} {team ? <span className="text-muted-foreground font-normal">({team})</span> : null}
                    </td>
                    <td className="py-2.5 px-2 text-right font-display font-bold text-foreground">{b.runs}</td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground">{b.balls}</td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground">{b.fours}</td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground">{b.sixes}</td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground">{sr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="font-display font-bold text-foreground text-lg mb-3">Best Bowlers</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                <th className="py-2.5 px-2 text-left font-medium">Bowler</th>
                <th className="py-2.5 px-2 text-right font-medium">O</th>
                <th className="py-2.5 px-2 text-right font-medium">R</th>
                <th className="py-2.5 px-2 text-right font-medium">W</th>
                <th className="py-2.5 px-2 text-right font-medium">Econ</th>
              </tr>
            </thead>
            <tbody>
              {topBowlers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 px-2 text-center text-xs text-muted-foreground">
                    No bowling performances yet.
                  </td>
                </tr>
              )}
              {topBowlers.map((b) => {
                const oversNum = b.balls / 6;
                const econ = oversNum > 0 ? (b.runsConceded / oversNum).toFixed(1) : "-";
                const team = b.id ? playerById.get(b.id)?.team : "";
                return (
                  <tr key={b.key} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 px-2 font-medium text-foreground">
                      {b.name} {team ? <span className="text-muted-foreground font-normal">({team})</span> : null}
                    </td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground">{b.overs}</td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground">{b.runsConceded}</td>
                    <td className="py-2.5 px-2 text-right font-display font-bold text-foreground">{b.wickets}</td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground">{econ}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);

interface FantasyPointsTabProps {
  players: FantasyRankedPlayer[];
}

const FantasyPointsTab = ({ players }: FantasyPointsTabProps) => (
  <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
    <div className="border-b border-border px-5 py-3">
      <h2 className="font-display text-2xl font-bold text-foreground">Fantasy Points</h2>
      <p className="text-xs text-muted-foreground mt-1">
        Points earned by players from this match performance.
      </p>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
            <th className="py-2.5 px-4 text-left font-medium">Rank</th>
            <th className="py-2.5 px-4 text-left font-medium">Player</th>
            <th className="py-2.5 px-4 text-left font-medium">Team</th>
            <th className="py-2.5 px-4 text-left font-medium">Role</th>
            <th className="py-2.5 px-4 text-right font-medium">Points</th>
          </tr>
        </thead>
        <tbody>
          {players.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 px-4 text-center text-sm text-muted-foreground">
                No player points available yet.
              </td>
            </tr>
          )}
          {players.map((p) => (
            <tr key={p.key} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
              <td className="py-3 px-4 font-display font-bold text-foreground">#{p.rank}</td>
              <td className="py-3 px-4 font-medium text-foreground">{p.name}</td>
              <td className="py-3 px-4 text-muted-foreground">{p.team}</td>
              <td className="py-3 px-4 text-muted-foreground">{p.role}</td>
              <td className="py-3 px-4 text-right font-display font-bold text-primary">
                {p.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

interface InningsScorecardSectionProps {
  title: string;
  scorecard: InningsScorecard;
}

const InningsScorecardSection = ({
  title,
  scorecard,
}: InningsScorecardSectionProps) => (
  <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
    <div className="border-b border-border px-5 py-3">
      <h3 className="font-display font-bold text-foreground text-lg">{title}</h3>
    </div>

    <div className="p-5 space-y-6">
      <div>
        <h4 className="font-display font-bold text-foreground mb-2">Batting</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                <th className="py-2.5 px-2 text-left font-medium">Batter</th>
                <th className="py-2.5 px-2 text-right font-medium">R</th>
                <th className="py-2.5 px-2 text-right font-medium">B</th>
                <th className="py-2.5 px-2 text-right font-medium">4s</th>
                <th className="py-2.5 px-2 text-right font-medium">6s</th>
                <th className="py-2.5 px-2 text-right font-medium">SR</th>
                <th className="py-2.5 px-2 text-left font-medium">Dismissal</th>
              </tr>
            </thead>
            <tbody>
              {scorecard.batters.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 px-2 text-center text-xs text-muted-foreground">
                    No batting events found.
                  </td>
                </tr>
              )}
              {scorecard.batters.map((b) => {
                const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : "-";
                return (
                  <tr key={b.key} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 px-2 font-medium text-foreground">{b.name}</td>
                    <td className="py-2.5 px-2 text-right font-display font-bold text-foreground">{b.runs}</td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground">{b.balls}</td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground">{b.fours}</td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground">{b.sixes}</td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground">{sr}</td>
                    <td className="py-2.5 px-2 text-xs text-muted-foreground">
                      {b.isOut ? b.dismissal ?? "out" : "not out"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="font-display font-bold text-foreground mb-2">Bowling</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                <th className="py-2.5 px-2 text-left font-medium">Bowler</th>
                <th className="py-2.5 px-2 text-right font-medium">O</th>
                <th className="py-2.5 px-2 text-right font-medium">R</th>
                <th className="py-2.5 px-2 text-right font-medium">W</th>
                <th className="py-2.5 px-2 text-right font-medium">Econ</th>
              </tr>
            </thead>
            <tbody>
              {scorecard.bowlers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 px-2 text-center text-xs text-muted-foreground">
                    No bowling events found.
                  </td>
                </tr>
              )}
              {scorecard.bowlers.map((b) => {
                const oversNum = b.balls / 6;
                const econ = oversNum > 0 ? (b.runsConceded / oversNum).toFixed(1) : "-";
                return (
                  <tr key={b.key} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 px-2 font-medium text-foreground">{b.name}</td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground">{b.overs}</td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground">{b.runsConceded}</td>
                    <td className="py-2.5 px-2 text-right font-display font-bold text-foreground">{b.wickets}</td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground">{econ}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);

export default MatchDetailPage;
