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
    { name: "Home",     path: "/",             icon: Home        },
    { name: "Shop",     path: "/products",     icon: ShoppingBag, badge: totalItems },
    { name: "Schedule", path: "/schedule",     icon: CalendarDays },
    { name: "Plans",    path: "/subscriptions",icon: Repeat      },
    { name: "Profile",  path: "/profile",      icon: User        },
  ];

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 pb-safe">
      <div className="mx-3 mb-3 bg-background/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-[0_8px_40px_-8px_oklch(0.15_0.03_240/30%),0_2px_12px_-2px_oklch(0.15_0.03_240/12%)]">
        <div className="flex h-[60px] items-center justify-around px-1">
          {navItems.map((item) => {
            const effectivePath = currentPath === "/checkout" ? "/products" : currentPath;
            const isActive =
              effectivePath === item.path ||
              (item.path !== "/" && effectivePath.startsWith(item.path));
            const count = (item as { badge?: number }).badge ?? 0;

            return (
              <Link
                key={item.name}
                to={item.path}
                className="relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 group"
              >
                <div className="relative flex flex-col items-center gap-[3px]">
                  <div className="relative">
                    {isActive && (
                      <span className="absolute inset-0 -m-1.5 rounded-xl bg-primary/10 block" />
                    )}
                    <item.icon
                      className={`relative h-[21px] w-[21px] transition-all duration-200 ${
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground/70"
                      }`}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      fill={isActive ? "oklch(0.55 0.2 250 / 10%)" : "none"}
                    />
                    {mounted && count > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 rounded-full bg-primary text-white text-[9px] font-extrabold flex items-center justify-center px-0.5 animate-badge-pop">
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[9.5px] tracking-wide leading-none transition-all duration-200 ${
                      isActive
                        ? "font-bold text-primary"
                        : "font-medium text-muted-foreground"
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
    </div>
  );
}
