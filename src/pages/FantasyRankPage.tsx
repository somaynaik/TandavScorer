import { AlertCircle, Loader2, Medal, RefreshCw, Star } from "lucide-react";
import {
  useFantasyUserRankings,
  useFantasyUserRankingsRealtime,
} from "@/hooks/useFantasyRankings";

const FantasyRankPage = () => {
  const { data, isLoading, error, refetch, isFetching } = useFantasyUserRankings();

  useFantasyUserRankingsRealtime();

  return (
    <div className="container py-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
            <Star className="h-7 w-7 text-primary" />
            Fantasy Rank
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All users ranked by fantasy team points
          </p>
        </div>
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

      {isLoading && (
        <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading fantasy ranks...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Failed to load fantasy ranks</p>
            <p className="text-destructive/80 mt-0.5">
              {(error as Error).message}
            </p>
          </div>
        </div>
      )}

      {!isLoading && !error && (!data || data.length === 0) && (
        <div className="rounded-xl border border-border gradient-card p-16 text-center shadow-card">
          <Star className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
          <p className="font-display font-semibold text-foreground">
            No fantasy teams yet
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Users will appear here once they create fantasy teams.
          </p>
        </div>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="rounded-xl border border-border gradient-card shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                <th className="py-3 px-4 text-left font-medium">Rank</th>
                <th className="py-3 px-4 text-left font-medium">User</th>
                <th className="py-3 px-4 text-right font-medium">Matches</th>
                <th className="py-3 px-4 text-right font-medium">Points</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry) => (
                <tr
                  key={entry.user_id}
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

export default FantasyRankPage;
