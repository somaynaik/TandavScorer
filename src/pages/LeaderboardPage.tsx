import { Trophy, Medal, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useLeaderboard, useLeaderboardRealtime } from "@/hooks/useLeaderboard";

const LeaderboardPage = () => {
  const {
    data: leaderboard,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useLeaderboard();

  useLeaderboardRealtime();

  return (
    <div className="container py-8 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
          <Trophy className="h-7 w-7 text-gold" />
          Tournament Leaderboard
        </h1>
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

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading leaderboard…</span>
        </div>
      )}

      {/* Error */}
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

      {/* Empty state */}
      {!isLoading && !error && (!leaderboard || leaderboard.length === 0) && (
        <div className="rounded-xl border border-border gradient-card p-16 text-center shadow-card">
          <Trophy className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
          <p className="font-display font-semibold text-foreground">
            No entries yet
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Complete scoring for at least one match or create fantasy teams to
            populate the leaderboard.
          </p>
        </div>
      )}

      {/* Top 3 Podium */}
      {!isLoading && leaderboard && leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {[leaderboard[1], leaderboard[0], leaderboard[2]].map((entry, i) => {
            const podiumOrder = [2, 1, 3];
            const rank = podiumOrder[i];
            const isFirst = rank === 1;
            return (
              <div
                key={entry.user_id}
                className={`rounded-xl border p-4 text-center transition-all ${
                  isFirst
                    ? "border-gold/40 bg-gold/5 shadow-gold"
                    : "border-border gradient-card shadow-card"
                } ${isFirst ? "md:-mt-4" : ""}`}
              >
                <div
                  className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                    rank === 1
                      ? "gradient-gold text-accent-foreground"
                      : rank === 2
                        ? "bg-muted-foreground/30 text-foreground"
                        : "bg-gold-dim/30 text-gold"
                  }`}
                >
                  {rank}
                </div>
                <p className="font-display font-bold text-foreground text-sm truncate">
                  {entry.name}
                </p>
                <p className="font-display text-xl font-bold text-primary mt-1">
                  {entry.points}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.matches_played} match
                  {entry.matches_played !== 1 ? "es" : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Table */}
      {!isLoading && leaderboard && leaderboard.length > 0 && (
        <div className="rounded-xl border border-border gradient-card shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                <th className="py-3 px-4 text-left font-medium">Rank</th>
                <th className="py-3 px-4 text-left font-medium">Player</th>
                <th className="py-3 px-4 text-right font-medium">Matches</th>
                <th className="py-3 px-4 text-right font-medium">Points</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr
                  key={entry.user_id}
                  className="border-b border-border/50 last:border-0 hover:bg-secondary/30"
                >
                  <td className="py-3 px-4">
                    {Number(entry.rank) <= 3 ? (
                      <Medal
                        className={`h-5 w-5 ${
                          Number(entry.rank) === 1
                            ? "text-gold"
                            : Number(entry.rank) === 2
                              ? "text-muted-foreground"
                              : "text-amber-600"
                        }`}
                      />
                    ) : (
                      <span className="text-muted-foreground">
                        {entry.rank}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-medium text-foreground">
                    {entry.name}
                  </td>
                  <td className="py-3 px-4 text-right text-muted-foreground">
                    {entry.matches_played}
                  </td>
                  <td className="py-3 px-4 text-right font-display font-bold text-primary">
                    {entry.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;
