import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  MapPin,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useMatches, useMatchesRealtime } from "@/hooks/useMatches";
import { useAuth } from "@/hooks/useAuth";

const statusStyles = {
  live: "bg-live/15 text-live border-live/30",
  upcoming: "bg-primary/10 text-primary border-primary/30",
  completed: "bg-muted text-muted-foreground border-border",
};

const MatchesPage = () => {
  const navigate = useNavigate();
  const { data: matches, isLoading, error, refetch, isFetching } = useMatches();
  const { isAdmin } = useAuth();

  useMatchesRealtime();

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-foreground">
          All Matches
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

      {isLoading && (
        <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading matches…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Failed to load matches</p>
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

      {!isLoading && !error && matches?.length === 0 && (
        <div className="rounded-xl border border-border gradient-card p-16 text-center shadow-card">
          <Calendar className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
          <p className="font-display font-semibold text-foreground">
            No matches found
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Matches will appear here once they are scheduled.
          </p>
        </div>
      )}

      {!isLoading && matches && matches.length > 0 && (
        <div className="grid gap-4">
          {["live", "upcoming", "completed"].flatMap((status) =>
            matches
              .filter((m) => m.status === status)
              .map((match) => (
                <div
                  key={match.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/match/${match.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/match/${match.id}`);
                    }
                  }}
                  className="rounded-xl border border-border gradient-card p-5 transition-all hover:border-primary/30 hover:shadow-glow shadow-card cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${statusStyles[match.status]}`}
                        >
                          {match.status === "live" && (
                            <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse" />
                          )}
                          {match.status}
                        </span>
                        {match.tournament_name && (
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {match.tournament_name}
                          </span>
                        )}
                      </div>

                      <p className="inline-block font-display text-lg font-bold text-foreground">
                        {match.team1}{" "}
                        <span className="text-muted-foreground font-normal">
                          vs
                        </span>{" "}
                        {match.team2}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {match.date} · {match.time?.slice(0, 5)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {match.venue}
                        </span>
                      </div>
                    </div>

                    <div className="text-right space-y-1 min-w-[130px]">
                      {match.team1_score && (
                        <p className="font-display font-bold text-foreground">
                          {match.team1}: {match.team1_score}
                        </p>
                      )}
                      {match.team2_score && (
                        <p className="font-display font-bold text-foreground">
                          {match.team2}: {match.team2_score}
                        </p>
                      )}
                      {match.result && (
                        <p className="text-xs text-primary font-medium">
                          {match.result}
                        </p>
                      )}
                    </div>
                  </div>
                  {match.status === "upcoming" && !isAdmin && (
                    <div className="mt-4 flex justify-end">
                      <Link
                        to={`/match/${match.id}/team-select`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                      >
                        Create Fantasy XI
                      </Link>
                    </div>
                  )}
                </div>
              )),
          )}
        </div>
      )}
    </div>
  );
};

export default MatchesPage;
