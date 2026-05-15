import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { subscriptionPlans as FALLBACK_PLANS, type SubscriptionPlan } from "@/lib/data";
import { subscribeSubscriptionPlans, setUserActivePlan, placeOrder } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { OrderPlaced } from "@/components/OrderPlaced";
import {
  Check,
  Droplets,
  CalendarDays,
  Zap,
  Shield,
  Star,
  ArrowRight,
  User,
  Phone,
  MapPin,
} from "lucide-react";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/subscriptions")({
  head: () => ({
    meta: [
      { title: "Subscriptions — AquaPure" },
      { name: "description", content: "Subscribe for regular water delivery." },
    ],
  }),
  component: SubscriptionsPage,
});

const planSavings: Record<string, number> = {
  basic: 120,
  alternate: 280,
  weekly: 450,
  monthly_corporate: 1800,
};

const planColors: Record<string, { gradient: string; accent: string; icon: string }> = {
  basic: { gradient: "from-sky-400 to-blue-500", accent: "text-sky-600 bg-sky-50", icon: "💧" },
  alternate: {
    gradient: "from-primary to-water",
    accent: "text-primary bg-primary/10",
    icon: "🔄",
  },
  weekly: {
    gradient: "from-teal-500 to-emerald-500",
    accent: "text-teal-700 bg-teal-50",
    icon: "🏠",
  },
  monthly_corporate: {
    gradient: "from-indigo-500 to-purple-600",
    accent: "text-indigo-700 bg-indigo-50",
    icon: "🏢",
  },
};

const DEFAULT_COLOR = { gradient: "from-primary to-water", accent: "text-primary bg-primary/10", icon: "💧" };

function SubscriptionsPage() {
  const { profile } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(FALLBACK_PLANS);
  const [loading, setLoading] = useState(true);

  /* Confirm-subscription sheet */
  const [confirmPlan, setConfirmPlan] = useState<SubscriptionPlan | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* Order-placed state */
  const [placed, setPlaced] = useState(false);
  const [placedDetails, setPlacedDetails] = useState<{ label: string; value: string }[]>([]);

  /* Prefill contact + address from the signed-in profile */
  useEffect(() => {
    const pn = profile?.name ?? "";
    const pp = profile?.phone ?? "";
    if (pn) setName((n) => n || pn);
    if (pp) setPhone((p) => p || pp);
    const def = profile?.addresses?.find((a) => a.isDefault) ?? profile?.addresses?.[0];
    if (def) {
      setAddress((a) => a || [def.line1, def.pincode, def.landmark].filter(Boolean).join(", "));
    }
  }, [profile?.uid, profile?.name, profile?.phone, profile?.addresses]);

  useEffect(() => {
    /* Show fallback data after 2 s if Supabase hasn't responded */
    const fallbackTimer = setTimeout(() => setLoading(false), 2000);
    const unsub = subscribeSubscriptionPlans((docs) => {
      if (docs.length > 0) setPlans(docs as SubscriptionPlan[]);
      setLoading(false);
      clearTimeout(fallbackTimer);
    });
    return () => {
      unsub();
      clearTimeout(fallbackTimer);
    };
  }, []);

  const phoneDigits = phone.replace(/\D/g, "");
  const formValid =
    name.trim().length >= 2 && phoneDigits.length >= 10 && address.trim().length > 5;

  const openConfirm = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan.id);
    setSubmitError(null);
    setConfirmPlan(plan);
  };

  const handleConfirmSubscribe = async () => {
    if (!confirmPlan || !formValid || submitting) return;
    if (!profile?.uid) {
      setSubmitError("Please sign in to subscribe.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const plan = confirmPlan;
    try {
      await setUserActivePlan(profile.uid, {
        planId: plan.id,
        planName: plan.name,
        frequency: plan.deliveryFrequency,
        price: plan.pricePerMonth,
        startDate: new Date().toISOString().slice(0, 10),
      });
      const orderId = await placeOrder({
        userId: profile.uid,
        customer: name.trim(),
        phone: phoneDigits,
        items: `${plan.name} — ${plan.deliveryFrequency}`,
        total: plan.pricePerMonth,
        payment: "pending",
        address: address.trim(),
        litres: 0,
        orderType: "subscription",
      });
      if (!orderId) throw new Error("Subscription could not be placed. Please try again.");
      setPlacedDetails([
        { label: "Plan",       value: plan.name },
        { label: "Frequency",  value: plan.deliveryFrequency },
        { label: "Price",      value: `₹${plan.pricePerMonth}/month` },
        { label: "Deliver to", value: address.trim() },
      ]);
      setConfirmPlan(null);
      setPlaced(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const perks = [
    { icon: Zap, text: "Pause or skip any delivery anytime" },
    { icon: Shield, text: "Cancel anytime — no lock-in" },
    { icon: Star, text: "Priority support for subscribers" },
    { icon: Droplets, text: "Fresh purified water every delivery" },
  ];

  if (placed) {
    return (
      <OrderPlaced
        tab="subscription"
        title="Subscription Active!"
        subtitle="Auto-pilot hydration is on 🚀"
        details={placedDetails}
        note="A vendor will confirm and start your recurring deliveries. Manage or pause your plan anytime from My Orders."
      />
    );
  }

  const inputCls =
    "w-full bg-muted/50 rounded-xl border border-border/50 px-3 py-2.5 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25";

  return (
    <div className="bg-muted/20 min-h-screen pb-28">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-water px-4 pt-6 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg viewBox="0 0 200 120" className="w-full h-full">
            <circle cx="180" cy="20" r="70" fill="white" />
            <circle cx="10" cy="100" r="50" fill="white" />
          </svg>
        </div>
        <div className="relative z-10">
          <span className="inline-block text-[10px] font-extrabold text-white/70 uppercase tracking-widest mb-1">
            Auto-pilot hydration
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
            Choose your plan
          </h1>
          <p className="text-sm text-white/75 mt-1 font-medium">
            Set it once. Stay hydrated forever.
          </p>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="px-4 -mt-4 space-y-4">
        {loading &&
          [1, 2, 3].map((i) => (
            <div key={i} className="h-52 rounded-2xl shimmer" />
          ))}
        {!loading && plans.map((plan) => {
          const color = planColors[plan.id] ?? DEFAULT_COLOR;
          const savings = planSavings[plan.id] || 0;
          const isSelected = selectedPlan === plan.id;

          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative overflow-hidden rounded-2xl bg-background flex flex-col shadow-sm border-2 transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "border-primary shadow-water scale-[1.01]"
                  : plan.popular
                    ? "border-primary/40"
                    : "border-border/60"
              }`}
            >
              {/* Popular ribbon */}
              {plan.popular && (
                <div
                  className={`bg-gradient-to-r ${color.gradient} py-1.5 px-4 flex items-center justify-center gap-1.5`}
                >
                  <Star className="h-3 w-3 fill-white text-white" />
                  <span className="text-[11px] font-extrabold text-white uppercase tracking-wider">
                    Most Popular
                  </span>
                  <Star className="h-3 w-3 fill-white text-white" />
                </div>
              )}

              <div className="p-4">
                {/* Plan header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color.gradient} flex items-center justify-center text-xl shadow-sm`}
                    >
                      {color.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-foreground leading-tight">
                        {plan.name}
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium">
                        {plan.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-foreground">
                      ₹{plan.pricePerMonth}
                    </span>
                    <p className="text-[10px] text-muted-foreground font-bold">/month</p>
                  </div>
                </div>

                {/* Tags row */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full ${color.accent}`}
                  >
                    <CalendarDays className="h-3 w-3" /> {plan.deliveryFrequency}
                  </span>
                  {savings > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full text-success bg-success/10">
                      💰 Save ₹{savings}/mo
                    </span>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs">
                      <div className="mt-0.5 shrink-0 h-4 w-4 rounded-full bg-success/15 flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-success stroke-[3]" />
                      </div>
                      <span className="text-foreground font-medium leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  onClick={(e) => { e.stopPropagation(); openConfirm(plan); }}
                  className={`w-full gap-2 rounded-xl h-11 text-sm font-extrabold transition-all ${
                    plan.popular || isSelected
                      ? `bg-gradient-to-r ${color.gradient} text-white shadow-water border-0`
                      : "border-border/60 bg-muted text-foreground hover:bg-muted/80"
                  }`}
                  variant={plan.popular || isSelected ? "default" : "outline"}
                >
                  {isSelected ? "✓ Selected — Continue" : "Choose Plan"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center animate-badge-pop">
                  <Check className="h-3 w-3 text-white stroke-[3]" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Subscriber Perks */}
      <div className="mx-4 mt-6 mb-4 bg-background rounded-2xl border border-border/40 shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-border/40">
          <h3 className="text-sm font-extrabold text-foreground">All plans include</h3>
        </div>
        <div className="divide-y divide-border/30">
          {perks.map((perk, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <perk.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-semibold text-foreground">{perk.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Confirm Subscription Sheet ── */}
      <Sheet open={confirmPlan !== null} onOpenChange={(o) => { if (!o && !submitting) setConfirmPlan(null); }}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto pb-10">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-primary" /> Confirm Subscription
            </SheetTitle>
          </SheetHeader>

          {confirmPlan && (
            <div className="space-y-4">
              {/* Plan summary */}
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${(planColors[confirmPlan.id] ?? DEFAULT_COLOR).gradient} flex items-center justify-center text-xl shrink-0`}>
                  {(planColors[confirmPlan.id] ?? DEFAULT_COLOR).icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-extrabold text-foreground truncate">{confirmPlan.name}</h3>
                  <p className="text-[11px] text-muted-foreground">{confirmPlan.deliveryFrequency}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-lg font-extrabold text-foreground">₹{confirmPlan.pricePerMonth}</span>
                  <p className="text-[10px] text-muted-foreground font-bold">/month</p>
                </div>
              </div>

              {/* Contact + address form */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                    <User className="h-3.5 w-3.5" /> Full Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                    <Phone className="h-3.5 w-3.5" /> Phone Number
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d+ ]/g, "").slice(0, 14))}
                    placeholder="10-digit mobile number"
                    inputMode="tel"
                    autoComplete="tel"
                    className={inputCls}
                  />
                  {phone.trim().length > 0 && phoneDigits.length < 10 && (
                    <p className="text-[11px] text-destructive font-semibold mt-1">
                      Enter a valid 10-digit mobile number
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Delivery Address
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House / Flat no., Street, Area, Pincode…"
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                </div>
              </div>

              {submitError && (
                <div className="flex items-start gap-2 bg-destructive/8 border border-destructive/20 rounded-xl px-3 py-2.5">
                  <span className="text-destructive text-base shrink-0 leading-none mt-0.5">⚠</span>
                  <p className="text-xs font-semibold text-destructive">{submitError}</p>
                </div>
              )}

              <Button
                onClick={handleConfirmSubscribe}
                disabled={submitting || !formValid}
                className="w-full h-14 rounded-2xl text-base font-extrabold gap-2 bg-gradient-to-r from-primary to-water shadow-water disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Activating…
                  </span>
                ) : (
                  <>Confirm & Subscribe · ₹{confirmPlan.pricePerMonth}/mo</>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Pay via UPI or Cash on Delivery. Cancel anytime — no lock-in.
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
