import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import MatchesPage from "./pages/MatchesPage";
import MatchDetailPage from "./pages/MatchDetailPage";
import TournamentDetailPage from "./pages/TournamentDetailPage";
import TeamSelectPage from "./pages/TeamSelectPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import FantasyRankPage from "./pages/FantasyRankPage";
import AdminPage from "./pages/AdminPage";
import ScorerPage from "./pages/ScorerPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Login page has its own full-screen layout */}
          <Route path="/login" element={<LoginPage />} />

          {/* All other pages use the shared Layout */}
          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/matches" element={<MatchesPage />} />
                  <Route path="/tournament/:id" element={<TournamentDetailPage />} />
                  <Route path="/match/:id" element={<MatchDetailPage />} />
                  <Route
                    path="/match/:id/team-select"
                    element={<TeamSelectPage />}
                  />
                  <Route path="/leaderboard" element={<LeaderboardPage />} />
                  <Route
                    path="/fantasy-rank"
                    element={<FantasyRankPage />}
                  />

                  {/* Protected: must be signed in */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute requireAdmin>
                        <AdminPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/scorer"
                    element={
                      <ProtectedRoute>
                        <ScorerPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
