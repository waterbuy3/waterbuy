import { Link, useLocation } from "@tanstack/react-router";
import { Home, ShoppingBag, CalendarDays, Repeat, User } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useState, useEffect } from "react";

export function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;
  const { totalItems } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const navItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "Shop", path: "/products", icon: ShoppingBag, badge: totalItems },
    { name: "Schedule", path: "/schedule", icon: CalendarDays },
    { name: "Plans", path: "/subscriptions", icon: Repeat },
    { name: "Profile", path: "/profile", icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-background/96 backdrop-blur-md border-t border-border/40 pb-safe z-50 shadow-[0_-4px_24px_-8px_oklch(0.55_0.2_250/12%)]">
      <div className="flex h-[64px] items-center justify-around px-2">
        {navItems.map((item) => {
          // treat /checkout as part of /products (Shop tab)
          const effectivePath = currentPath === "/checkout" ? "/products" : currentPath;
          const isActive =
            effectivePath === item.path ||
            (item.path !== "/" && effectivePath.startsWith(item.path));
          const count = (item as { badge?: number }).badge ?? 0;

          return (
            <Link
              key={item.name}
              to={item.path}
              className="relative flex flex-col items-center justify-center flex-1 h-full group"
            >
              {isActive && (
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-12 h-8 rounded-xl bg-primary/10 pointer-events-none" />
              )}

              <div
                className={`relative flex flex-col items-center justify-center transition-transform duration-200 ${isActive ? "-translate-y-0.5" : ""}`}
              >
                <div className="relative">
                  <item.icon
                    className={`h-[22px] w-[22px] mb-0.5 transition-all duration-200 ${
                      isActive
                        ? "text-primary stroke-[2.5]"
                        : "text-muted-foreground stroke-2 group-hover:text-foreground"
                    }`}
                    fill={isActive ? "oklch(0.55 0.2 250 / 12%)" : "none"}
                  />
                  {mounted && count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 rounded-full bg-primary text-white text-[9px] font-extrabold flex items-center justify-center px-0.5 animate-badge-pop">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[9px] tracking-wide transition-all duration-200 ${
                    isActive ? "font-extrabold text-primary" : "font-medium text-muted-foreground"
                  }`}
                >
                  {item.name}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
