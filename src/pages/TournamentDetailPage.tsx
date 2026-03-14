import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Calendar, Loader2, MapPin, Trophy } from "lucide-react";
import { useMatches, useMatchesRealtime } from "@/hooks/useMatches";
import { useTournament } from "@/hooks/useTournaments";

const badgeStyles = {
  live: "bg-live/15 text-live border-live/30",
  upcoming: "bg-primary/10 text-primary border-primary/30",
  completed: "bg-muted text-muted-foreground border-border",
};

const TournamentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: tournament, isLoading: tournamentLoading, error: tournamentError } =
    useTournament(id!);
  const { data: matches = [], isLoading: matchesLoading, error: matchesError } = useMatches();

  useMatchesRealtime();

  const tournamentMatches = matches
    .filter((match) => match.tournament_id === id)
    .sort((a, b) => {
      const aValue = `${a.date} ${a.time ?? ""}`;
      const bValue = `${b.date} ${b.time ?? ""}`;
      return aValue.localeCompare(bValue);
    });

  const isLoading = tournamentLoading || matchesLoading;
  const error = tournamentError || matchesError;

  if (isLoading) {
    return (
      <div className="container py-16 flex items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Loading tournament...</span>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="container py-16 text-center space-y-3">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <p className="text-muted-foreground">Tournament not found.</p>
        <Link
          to="/"
          className="text-primary hover:underline text-sm inline-block"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to home
      </Link>

      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl gradient-gold shadow-gold">
                <Trophy className="h-7 w-7 text-accent-foreground" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Tournament
                </p>
                <h1 className="font-display text-3xl font-bold text-foreground">
                  {tournament.name}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tournament.teams} Teams · {tournament.matches} Matches
                </p>
              </div>
            </div>
            <span className="inline-flex rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wide">
              {tournament.status}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-foreground">
            Matches
          </h2>
          <span className="inline-flex rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
            {tournamentMatches.length} match{tournamentMatches.length !== 1 ? "es" : ""}
          </span>
        </div>

        {tournamentMatches.length === 0 ? (
          <div className="rounded-xl border border-border gradient-card p-10 text-center shadow-card">
            <p className="font-display font-semibold text-foreground">
              No matches in this tournament yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Matches will appear here once they are scheduled.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tournamentMatches.map((match) => (
              <Link
                key={match.id}
                to={`/match/${match.id}`}
                className="block rounded-2xl border border-border bg-card shadow-card overflow-hidden transition-all hover:border-primary/30 hover:shadow-glow"
              >
                <div className="p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3 flex-1">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${badgeStyles[match.status]}`}
                      >
                        {match.status === "live" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse" />
                        )}
                        {match.status}
                      </span>

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
                        <p className="text-sm font-semibold text-primary">
                          {match.result}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentDetailPage;
