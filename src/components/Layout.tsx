import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Trophy,
  Calendar,
  BarChart3,
  Shield,
  Tv,
  Menu,
  X,
  LogIn,
  LogOut,
  User,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const navItems = [
  { to: "/", label: "Home", icon: Trophy },
  { to: "/matches", label: "Matches", icon: Calendar },
  { to: "/leaderboard", label: "Leaderboard", icon: BarChart3 },
  { to: "/admin", label: "Admin", icon: Shield },
];

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading, profile, isAdmin, signOut } = useAuth();
  const configuredAdminEmail = (
    import.meta.env.VITE_ADMIN_EMAIL ?? ""
  ).toLowerCase();
  const isAdminEmail =
    !!configuredAdminEmail &&
    (user?.email ?? "").toLowerCase() === configuredAdminEmail;
  const canAccessAdmin = isAdmin || isAdminEmail;

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    const { error } = await signOut();
    if (error) {
      toast.error("Failed to sign out", { description: error.message });
    } else {
      toast.success("Signed out successfully");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <Tv className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">
              TandavScorer
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems
              .filter((item) => item.to !== "/admin" || canAccessAdmin)
              .map((item) => {
                const isActive =
                  location.pathname === item.to ||
                  (item.to !== "/" && location.pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
          </nav>

          {/* Auth Controls (desktop) */}
          <div className="hidden md:flex items-center gap-2">
            {isLoading ? null : isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full gradient-primary text-primary-foreground text-xs font-bold">
                    {profile?.username?.charAt(0).toUpperCase() ?? (
                      <User className="h-3 w-3" />
                    )}
                  </div>
                  <span className="max-w-[120px] truncate">
                    {profile?.username ?? "Account"}
                  </span>
                </button>

                {userMenuOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-2 z-20 w-52 rounded-xl border border-border bg-background shadow-card overflow-hidden">
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-xs text-muted-foreground">
                          Signed in as
                        </p>
                        <p className="text-sm font-semibold text-foreground truncate mt-0.5">
                          {profile?.username}
                        </p>
                        {profile?.is_admin && (
                          <span className="inline-flex mt-1 items-center rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold uppercase tracking-wide">
                            Admin
                          </span>
                        )}
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 rounded-lg gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-border bg-background p-4 space-y-1">
            {navItems
              .filter((item) => item.to !== "/admin" || canAccessAdmin)
              .map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}

            {/* Auth row in mobile menu */}
            <div className="pt-2 border-t border-border mt-2">
              {isAuthenticated ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-3 px-4 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                      {profile?.username?.charAt(0).toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {profile?.username}
                      </p>
                      {profile?.is_admin && (
                        <p className="text-[10px] text-gold font-semibold uppercase tracking-wide">
                          Admin
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      handleSignOut();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
              )}
            </div>
          </nav>
        )}
      </header>

      <main>{children}</main>
    </div>
  );
};

export default Layout;
