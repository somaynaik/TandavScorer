import { useState } from "react";
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

type MatchPartition = "upcoming" | "results";

const MatchesPage = () => {
  const navigate = useNavigate();
  const { data: matches, isLoading, error, refetch, isFetching } = useMatches();
  const { isAdmin } = useAuth();
  const [activePartition, setActivePartition] = useState<MatchPartition>("upcoming");

  const upcomingMatches =
    matches?.filter((match) => match.status === "upcoming" || match.status === "live") ?? [];
  const resultMatches = matches?.filter((match) => match.status === "completed") ?? [];
  const activeMatches = activePartition === "upcoming" ? upcomingMatches : resultMatches;

  useMatchesRealtime();

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Matches
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upcoming fixtures and completed results
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
          <span className="text-sm">Loading matches...</span>
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
        <div className="space-y-8">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="grid grid-cols-2 bg-black/40">
              {[
                {
                  id: "upcoming" as MatchPartition,
                  label: "Upcoming",
                  count: upcomingMatches.length,
                },
                {
                  id: "results" as MatchPartition,
                  label: "Results",
                  count: resultMatches.length,
                },
              ].map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActivePartition(section.id)}
                  className={`flex items-center justify-center gap-2 px-4 py-4 text-base font-semibold transition-colors ${
                    activePartition === section.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{section.label}</span>
                  <span className="text-sm opacity-80">({section.count})</span>
                </button>
              ))}
            </div>
          </div>

          {activeMatches.length > 0 ? (
            <div className="space-y-4">
              {activeMatches.map((match) => (
                <MatchListCard
                  key={match.id}
                  match={match}
                  isAdmin={isAdmin}
                  navigate={navigate}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border gradient-card p-10 text-center shadow-card">
              <p className="font-display font-semibold text-foreground">
                No {activePartition} matches
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {activePartition === "upcoming"
                  ? "Scheduled fixtures and live games will appear here."
                  : "Completed matches will appear here after scoring is finished."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface MatchListCardProps {
  match: NonNullable<ReturnType<typeof useMatches>["data"]>[number];
  isAdmin: boolean;
  navigate: ReturnType<typeof useNavigate>;
}

const MatchListCard = ({ match, isAdmin, navigate }: MatchListCardProps) => (
  <div
    role="button"
    tabIndex={0}
    onClick={() => navigate(`/match/${match.id}`)}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        navigate(`/match/${match.id}`);
      }
    }}
    className="rounded-2xl border border-border bg-card shadow-card overflow-hidden transition-all hover:border-primary/30 hover:shadow-glow cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
  >
    <div className="p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {match.tournament_name && (
              <p className="text-base font-semibold text-primary">
                {match.tournament_name}
              </p>
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${statusStyles[match.status]}`}
            >
              {match.status === "live" && (
                <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse" />
              )}
              {match.status === "completed" ? "result" : match.status}
            </span>
          </div>

          <div className="space-y-1">
            <p className="font-display text-3xl font-bold text-foreground">
              {match.team1}
            </p>
            <p className="font-display text-3xl font-bold text-foreground/90">
              {match.team2}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {match.date}
              {match.time ? ` · ${match.time.slice(0, 5)}` : ""}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {match.venue}
            </span>
          </div>
        </div>

        <div className="min-w-[180px] text-left lg:text-right space-y-2">
          {match.team1_score && (
            <p className="font-display text-2xl font-bold text-foreground">
              {match.team1}: {match.team1_score}
            </p>
          )}
          {match.team2_score && (
            <p className="font-display text-2xl font-bold text-foreground">
              {match.team2}: {match.team2_score}
            </p>
          )}
          {match.result && (
            <p className="text-sm font-semibold text-primary">{match.result}</p>
          )}
        </div>
      </div>

      {match.status === "upcoming" && !isAdmin && (
        <div className="mt-5 border-t border-border pt-4 flex justify-end">
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
  </div>
);

export default MatchesPage;
