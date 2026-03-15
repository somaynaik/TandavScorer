import { Link } from "react-router-dom";
import {
  Trophy,
  Calendar,
  Users,
  ArrowRight,
  Zap,
  Loader2,
  AlertCircle,
  Star,
} from "lucide-react";
import { useMatches, useMatchesRealtime } from "@/hooks/useMatches";
import { useTournaments } from "@/hooks/useTournaments";
import {
  useTopLeaderboard,
  useLeaderboardRealtime,
} from "@/hooks/useLeaderboard";
import { useAuth } from "@/hooks/useAuth";
import type { Match, Tournament } from "@/integrations/supabase/types";

const HomePage = () => {
  const {
    data: matches,
    isLoading: matchesLoading,
    error: matchesError,
  } = useMatches();
  const { data: tournaments, isLoading: tournamentsLoading } = useTournaments();
  const { data: leaderboard, isLoading: leaderboardLoading } =
    useTopLeaderboard(5);
  const { isAdmin, isAuthenticated } = useAuth();

  useMatchesRealtime();
  useLeaderboardRealtime();

  const liveMatches: Match[] = (matches ?? []).filter((m: Match) => m.status === "live");
  const upcomingMatches: Match[] = (matches ?? [])
    .filter((m: Match) => m.status === "upcoming")
    .slice(0, 3);
  const recentTournaments: Tournament[] = (tournaments ?? []).slice(0, 3);
  const isLoading = matchesLoading || tournamentsLoading || leaderboardLoading;

  return (
    <div className="space-y-8 pb-12">
      <section className="relative overflow-hidden py-16 md:py-24">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[rgba(10,14,22,0.8)]" />
        <div className="container relative text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
            <Zap className="h-3.5 w-3.5" />
            Season Live Now
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-foreground">
            TandavScorer
            <br />
            <span className="text-primary">Fantasy Arena</span>
          </h1>
          <p className="mx-auto max-w-lg text-muted-foreground text-lg">
            Pick your XI, earn fantasy points from live matches, and climb the
            leaderboard.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/matches"
              className="inline-flex items-center gap-2 rounded-lg gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
            >
              View Matches <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/leaderboard"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-6 py-3 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              Leaderboard
            </Link>
            <Link
              to={isAuthenticated ? "/matches" : "/login"}
              state={
                isAuthenticated
                  ? undefined
                  : { from: "/matches" }
              }
              className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              Create Fantasy11 <Star className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <div className="container space-y-8">
        {isLoading && (
          <div className="flex items-center justify-center gap-3 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading latest data...</span>
          </div>
        )}

        {matchesError && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>Failed to load match data. Please refresh the page.</span>
          </div>
        )}

        {recentTournaments.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <Trophy className="h-5 w-5 text-gold" />
              Recent Tournaments
            </h2>
            <div className="grid gap-4 lg:grid-cols-3">
              {recentTournaments.map((tournament) => (
                <Link
                  key={tournament.id}
                  to={`/tournament/${tournament.id}`}
                  className="rounded-xl border border-border gradient-card p-6 shadow-card transition-all hover:border-primary/30 hover:shadow-glow"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-gold shadow-gold">
                        <Trophy className="h-6 w-6 text-accent-foreground" />
                      </div>
                      <div>
                        <h2 className="font-display text-xl font-bold text-foreground">
                          {tournament.name}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {tournament.teams} Teams · {tournament.matches} Matches
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center self-start rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wide">
                      {tournament.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {liveMatches.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-live animate-pulse" />
              Live Now
            </h2>
            <div className="grid gap-4">
              {liveMatches.map((match) => (
                <Link
                  key={match.id}
                  to={`/match/${match.id}`}
                  className="rounded-xl border border-live/30 bg-live/5 p-5 transition-colors hover:bg-live/10 shadow-card"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-display font-bold text-foreground text-lg">
                        {match.team1} vs {match.team2}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {match.venue}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      {match.team1_score && (
                        <p className="font-display font-bold text-foreground text-lg">
                          {match.team1_score}
                        </p>
                      )}
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-live">
                        <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse" />
                        LIVE
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!matchesLoading && upcomingMatches.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming Matches
              </h2>
              <Link
                to="/matches"
                className="text-sm text-primary hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {upcomingMatches.map((match) => (
                <div
                  key={match.id}
                  className="rounded-xl border border-border gradient-card p-5 transition-all hover:border-primary/30 hover:shadow-glow shadow-card"
                >
                  <Link to={`/match/${match.id}`}>
                    <p className="font-display font-semibold text-foreground">
                      {match.team1}
                    </p>
                    <p className="text-xs text-muted-foreground my-1">vs</p>
                    <p className="font-display font-semibold text-foreground">
                      {match.team2}
                    </p>
                  </Link>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{match.date}</span>
                    <span>{match.time?.slice(0, 5)}</span>
                  </div>
                  {!isAdmin && (
                    <div className="mt-3">
                      <Link
                        to={`/match/${match.id}/team-select`}
                        className="inline-flex items-center rounded-lg border border-primary/60 bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800"
                      >
                        Create Fantasy XI
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {!leaderboardLoading && leaderboard && leaderboard.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-gold" />
                Top Fantasy Players
              </h2>
              <Link
                to="/leaderboard"
                className="text-sm text-primary hover:underline"
              >
                Full leaderboard
              </Link>
            </div>
            <div className="rounded-xl border border-border gradient-card shadow-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-3 px-4 text-left font-medium">#</th>
                    <th className="py-3 px-4 text-left font-medium">Player</th>
                    <th className="py-3 px-4 text-right font-medium">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => (
                    <tr
                      key={entry.user_id}
                      className="border-b border-border/50 last:border-0 hover:bg-secondary/30"
                    >
                      <td className="py-3 px-4">
                        {i < 3 ? (
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              i === 0
                                ? "gradient-gold text-accent-foreground"
                                : i === 1
                                  ? "bg-muted-foreground/30 text-foreground"
                                  : "bg-gold-dim/30 text-gold"
                            }`}
                          >
                            {entry.rank}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {entry.rank}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        {entry.name}
                      </td>
                      <td className="py-3 px-4 text-right font-display font-bold text-primary">
                        {entry.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!isLoading && !matchesError && matches?.length === 0 && (
          <div className="rounded-xl border border-border gradient-card p-12 text-center shadow-card">
            <Trophy className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
            <p className="font-display font-semibold text-foreground">
              No matches scheduled yet
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Check back soon or visit the Admin panel to add matches.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
