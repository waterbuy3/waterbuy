import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { MapPin, ChevronDown, Navigation, Bell, Droplets, ShoppingCart, X, Search } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export function Header() {
  const { user, profile }  = useAuth();
  const { totalItems }     = useCart();
  const navigate           = useNavigate();
  const location           = useLocation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [locationLabel, setLocationLabel] = useState("Home");
  const [locationSub,   setLocationSub]   = useState("123 Main St, Block A, Green Valley");
  const [isLocating,    setIsLocating]    = useState(false);
  const [notifCount]                      = useState(3);
  const [query,         setQuery]         = useState("");
  const inputRef                          = useRef<HTMLInputElement>(null);

  // Sync query from URL when on /products
  useEffect(() => {
    if (!location.pathname.startsWith("/products")) {
      setQuery("");
    }
  }, [location.pathname]);

  const displayName = profile?.name || user?.displayName || "";
  const initials    = displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const photoURL    = profile?.photoURL || user?.photoURL || "";

  const handleGetLocation = () => {
    setIsLocating(true);
    navigator.geolocation?.getCurrentPosition(
      () => {
        setLocationLabel("Current Location");
        setLocationSub("High Street, Block B (GPS)");
        setIsLocating(false);
      },
      () => {
        setLocationSub("Location access denied");
        setIsLocating(false);
      },
    );
    // Fallback timeout in case geolocation hangs
    setTimeout(() => setIsLocating(false), 4000);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate({ to: "/products", search: { query: q } });
  };

  const clearSearch = () => {
    setQuery("");
    inputRef.current?.focus();
    if (location.pathname.startsWith("/products")) {
      navigate({ to: "/products", search: {} });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background/96 backdrop-blur-md border-b border-border/40 shadow-sm">
      <div className="mx-auto flex max-w-md flex-col px-4 pt-3 pb-3">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-3">

          {/* Brand + location */}
          <div className="flex items-center gap-2 min-w-0">
            {/* Logo */}
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-water flex items-center justify-center shrink-0 shadow-sm">
              <Droplets className="h-5 w-5 text-white" />
            </div>

            {/* Location selector */}
            <button
              type="button"
              aria-label="Detect my location"
              className="flex flex-col min-w-0 cursor-pointer group text-left"
              onClick={handleGetLocation}
            >
              <div className="flex items-center gap-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                  {isLocating ? "Locating…" : "Deliver to"}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div className="flex items-center gap-1 max-w-[180px]">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" fill="currentColor" fillOpacity={0.25} />
                <span className="text-sm font-extrabold text-foreground truncate leading-tight">
                  {isLocating ? "Finding you…" : locationLabel}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground truncate max-w-[180px] flex items-center gap-0.5 leading-tight">
                {isLocating ? "Requesting GPS…" : locationSub}
                {!isLocating && <Navigation className="h-2.5 w-2.5 text-primary ml-0.5 shrink-0" />}
              </span>
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Cart icon — badge only renders after mount to avoid SSR/localStorage mismatch */}
            <Link
              to="/checkout"
              className="relative"
              aria-label={mounted && totalItems > 0 ? `Cart, ${totalItems} item${totalItems !== 1 ? "s" : ""}` : "Cart"}
            >
              <Button variant="ghost" size="icon" className="rounded-xl bg-muted/50 h-9 w-9" aria-hidden="true" tabIndex={-1}>
                <ShoppingCart className="h-5 w-5 text-foreground" />
              </Button>
              {mounted && totalItems > 0 && (
                <span aria-hidden="true" className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-primary text-white text-[9px] font-extrabold flex items-center justify-center px-0.5 animate-badge-pop">
                  {totalItems > 9 ? "9+" : totalItems}
                </span>
              )}
            </Link>

            {/* Notification bell */}
            <Link to="/profile" className="relative" aria-label={`Notifications${notifCount > 0 ? `, ${notifCount} unread` : ""}`}>
              <Button variant="ghost" size="icon" className="rounded-xl bg-muted/50 h-9 w-9" aria-hidden="true" tabIndex={-1}>
                <Bell className="h-5 w-5 text-foreground" />
              </Button>
              {notifCount > 0 && (
                <span aria-hidden="true" className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-white text-[9px] font-extrabold flex items-center justify-center animate-badge-pop">
                  {notifCount}
                </span>
              )}
            </Link>

            {/* Profile avatar */}
            <Link to="/profile" aria-label="Profile">
              {photoURL ? (
                <img src={photoURL} alt={displayName} width={36} height={36} className="h-9 w-9 rounded-xl object-cover border border-primary/20" />
              ) : (
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-water/20 border border-primary/20 flex items-center justify-center">
                  <span className="text-xs font-extrabold text-primary">{initials}</span>
                </div>
              )}
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            style={{ height: 17, width: 17 }}
          />
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            aria-label="Search products"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch(e as unknown as React.FormEvent)}
            placeholder="Search water, tankers, bundles…"
            className="w-full bg-muted/60 border border-border/50 rounded-2xl py-2.5 pl-10 pr-10 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:bg-background transition-all"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X style={{ height: 16, width: 16 }} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-primary text-[11px] font-extrabold uppercase tracking-wide hover:text-primary/80 transition-colors"
            >
              Go
            </button>
          )}
        </form>
      </div>
    </header>
  );
}
