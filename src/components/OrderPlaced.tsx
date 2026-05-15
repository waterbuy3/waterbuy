import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type OrderTab = "cart" | "subscription" | "schedule";

interface OrderPlacedProps {
  /** Heading — e.g. "Order Placed!" */
  title?: string;
  /** Sub-heading line under the title. */
  subtitle?: string;
  /** Which My-Orders tab to land on when redirecting. */
  tab: OrderTab;
  /** Summary rows shown in the receipt card. */
  details: { label: string; value: string }[];
  /** Optional reassurance line under the receipt. */
  note?: string;
  /** Seconds before auto-redirecting to My Orders (0 disables). */
  redirectAfter?: number;
}

/**
 * Shared post-order confirmation screen. Shows a receipt summary and routes
 * the customer straight to My Orders (profile › orders sheet, correct tab).
 */
export function OrderPlaced({
  title = "Order Placed!",
  subtitle = "Your water is on its way 💧",
  tab,
  details,
  note,
  redirectAfter = 5,
}: OrderPlacedProps) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(redirectAfter);

  const goToOrders = () =>
    navigate({ to: "/profile", search: { sheet: "orders", tab } });

  useEffect(() => {
    if (redirectAfter <= 0) return;
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(tick);
          navigate({ to: "/profile", search: { sheet: "orders", tab } });
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-5 px-6 text-center animate-slide-up-fade">
      {/* Success mark */}
      <div className="relative">
        <span className="absolute inset-0 rounded-full bg-success/20 animate-ping" />
        <div className="relative w-24 h-24 rounded-full bg-success/15 flex items-center justify-center">
          <CheckCircle2 className="h-14 w-14 text-success" strokeWidth={1.5} />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-extrabold text-foreground">{title}</h2>
        <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
      </div>

      {/* Receipt */}
      {details.length > 0 && (
        <div className="bg-background border border-border/50 rounded-2xl p-4 w-full max-w-xs text-left shadow-sm">
          {details.map((d, i) => (
            <div
              key={d.label}
              className={`flex justify-between gap-3 py-1.5 text-sm ${i ? "border-t border-border/30" : ""}`}
            >
              <span className="text-muted-foreground shrink-0">{d.label}</span>
              <span className="font-bold text-foreground text-right break-words">{d.value}</span>
            </div>
          ))}
        </div>
      )}

      {note && <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">{note}</p>}

      {/* Actions */}
      <div className="w-full max-w-xs space-y-2 pt-1">
        <Button
          onClick={goToOrders}
          className="w-full h-12 rounded-2xl font-extrabold gap-2 bg-gradient-to-r from-primary to-water shadow-water"
        >
          <Package className="h-4 w-4" /> View My Orders
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/" })}
          className="w-full h-11 rounded-2xl font-bold gap-2"
        >
          Back to Home <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {redirectAfter > 0 && countdown > 0 && (
        <p className="text-[11px] text-muted-foreground/70">
          Taking you to your orders in {countdown}s…
        </p>
      )}
    </div>
  );
}
