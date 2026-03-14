import { useEffect, useMemo, useState } from "react";
import { Trophy, Medal, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import {
  useLeaderboard,
  useLeaderboardRealtime,
  type LeaderboardRow,
} from "@/hooks/useLeaderboard";
import { useTournaments } from "@/hooks/useTournaments";

type BoardKey = "runs" | "wickets" | "catches" | "mvp";

const boardConfig: Array<{
  key: BoardKey;
  title: string;
  statLabel: string;
}> = [
  { key: "runs", title: "Most Runs", statLabel: "Runs" },
  { key: "wickets", title: "Most Wickets", statLabel: "Wickets" },
  { key: "catches", title: "Most Catches", statLabel: "Catches" },
  { key: "mvp", title: "MVP", statLabel: "Points" },
];

const LeaderboardPage = () => {
  const { data: tournaments, isLoading: tournamentsLoading } = useTournaments();
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("all");
  const {
    data: leaderboards,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useLeaderboard(selectedTournamentId);

  useLeaderboardRealtime();

  useEffect(() => {
    if (
      selectedTournamentId !== "all" &&
      tournaments &&
      tournaments.length > 0 &&
      !tournaments.some((tournament) => tournament.id === selectedTournamentId)
    ) {
      setSelectedTournamentId("all");
    }
  }, [selectedTournamentId, tournaments]);

  const selectedTournament = useMemo(() => {
    if (selectedTournamentId === "all") return null;
    return tournaments?.find((tournament) => tournament.id === selectedTournamentId) ?? null;
  }, [selectedTournamentId, tournaments]);

  const safeLeaderboards = useMemo(
    () => ({
      runs: Array.isArray(leaderboards?.runs) ? leaderboards.runs : [],
      wickets: Array.isArray(leaderboards?.wickets) ? leaderboards.wickets : [],
      catches: Array.isArray(leaderboards?.catches) ? leaderboards.catches : [],
      mvp: Array.isArray(leaderboards?.mvp) ? leaderboards.mvp : [],
    }),
    [leaderboards],
  );

  const hasAnyEntries = Boolean(
    safeLeaderboards.runs.length ||
      safeLeaderboards.wickets.length ||
      safeLeaderboards.catches.length ||
      safeLeaderboards.mvp.length,
  );

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
            <Trophy className="h-7 w-7 text-gold" />
            Tournament Leaderboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedTournament
              ? `${selectedTournament.name} rankings`
              : "All tournaments combined"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            disabled={tournamentsLoading || !tournaments || tournaments.length === 0}
            className="min-w-[220px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
          >
            <option value="all">All tournaments</option>
            {(tournaments ?? []).map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading leaderboard...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Failed to load leaderboard</p>
            <p className="text-destructive/80 mt-0.5">
              {(error as Error).message}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-semibold hover:bg-destructive/20 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {!isLoading && !error && !hasAnyEntries && (
        <div className="rounded-xl border border-border gradient-card p-16 text-center shadow-card">
          <Trophy className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
          <p className="font-display font-semibold text-foreground">
            No entries yet
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedTournament
              ? `Complete scoring for matches in ${selectedTournament.name} to populate these leaderboards.`
              : "Complete scoring for matches to populate these leaderboards."}
          </p>
        </div>
      )}

      {!isLoading && hasAnyEntries && (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {boardConfig.map((board) => (
            <LeaderboardColumn
              key={board.key}
              title={board.title}
              statLabel={board.statLabel}
              rows={safeLeaderboards[board.key]}
            />
          ))}
        </div>
      )}
    </div>
  );
};

type LeaderboardColumnProps = {
  title: string;
  statLabel: string;
  rows: LeaderboardRow[];
};

const LeaderboardColumn = ({ title, statLabel, rows }: LeaderboardColumnProps) => (
  <div className="rounded-xl border border-border gradient-card shadow-card overflow-hidden">
    <div className="border-b border-border px-4 py-3">
      <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
    </div>
    {rows.length === 0 ? (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
        No data yet
      </div>
    ) : (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
            <th className="py-3 px-4 text-left font-medium">Rank</th>
            <th className="py-3 px-4 text-left font-medium">Player</th>
            <th className="py-3 px-4 text-right font-medium">{statLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 10).map((entry) => (
            <tr
              key={`${title}-${entry.user_id}`}
              className="border-b border-border/50 last:border-0 hover:bg-secondary/30"
            >
              <td className="py-3 px-4">
                {entry.rank <= 3 ? (
                  <Medal
                    className={`h-5 w-5 ${
                      entry.rank === 1
                        ? "text-gold"
                        : entry.rank === 2
                          ? "text-muted-foreground"
                          : "text-amber-600"
                    }`}
                  />
                ) : (
                  <span className="text-muted-foreground">{entry.rank}</span>
                )}
              </td>
              <td className="py-3 px-4 font-medium text-foreground">{entry.name}</td>
              <td className="py-3 px-4 text-right font-display font-bold text-primary">
                {entry.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

export default LeaderboardPage;
