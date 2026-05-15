import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/BottomNav";
import { OfflineBanner } from "@/components/OfflineBanner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { useEffect, Component, type ReactNode } from "react";
import { Droplets } from "lucide-react";

// ─── Error Boundary ───────────────────────────────────────────────────────────
class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-background">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <Droplets className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-extrabold text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">{this.state.error.message}</p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.href = "/"; }}
            className="mt-2 px-6 py-3 bg-primary text-white rounded-2xl font-extrabold text-sm"
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import appCss from "../styles.css?url";

const PUBLIC_ROUTES = ["/login"];

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient-water">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover",
      },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "AquaPure" },
      { name: "theme-color", content: "#1a6fd4" },
      { title: "AquaPure — Premium Water Delivery" },
      {
        name: "description",
        content: "Order water bottles, cans, tankers & bundles. Schedule, subscribe & save.",
      },
      { property: "og:title", content: "AquaPure — Premium Water Delivery" },
      { name: "twitter:title", content: "AquaPure — Premium Water Delivery" },
      {
        property: "og:description",
        content: "Order water bottles, cans, tankers & bundles. Schedule, subscribe & save.",
      },
      {
        name: "twitter:description",
        content: "Order water bottles, cans, tankers & bundles. Schedule, subscribe & save.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon-180x180.png" },
      { rel: "icon", href: "/icons/favicon.ico", sizes: "48x48" },
      { rel: "icon", href: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// ─── Loading splash ────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary/10 to-background gap-4">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-water flex items-center justify-center shadow-water-lg animate-float">
        <Droplets className="h-10 w-10 text-white" />
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Auth guard (runs only client-side) ───────────────────────────────────────
function AppShell() {
  const { user, loading, isFirebaseReady, isFirebaseConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isPublic = PUBLIC_ROUTES.includes(location.pathname);

  useEffect(() => {
    // No Firebase credentials → demo mode, never redirect to login
    if (!isFirebaseConfigured) return;
    // Wait for Firebase to resolve auth state before redirecting
    if (!isFirebaseReady || loading) return;

    if (!user && !isPublic) navigate({ to: "/login" });
    if (user && isPublic) navigate({ to: "/" });
  }, [user, loading, isFirebaseReady, isFirebaseConfigured, isPublic, navigate]);

  // Show splash only while Firebase is actively resolving
  if (isFirebaseConfigured && loading) return <LoadingScreen />;

  // Login page — no app shell
  if (isPublic) return <Outlet />;

  // Full app shell (demo mode OR authenticated)
  return (
    <>
      <OfflineBanner />
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-background shadow-2xl relative overflow-hidden">
        <Header />
        <main className="flex-1 pb-24">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </>
  );
}

function RootComponent() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <AppShell />
        </CartProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
