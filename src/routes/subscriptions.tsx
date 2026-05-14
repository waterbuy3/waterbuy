import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { subscriptionPlans as FALLBACK_PLANS, type SubscriptionPlan } from "@/lib/data";
import { subscribeSubscriptionPlans, setUserActivePlan } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  Check,
  ChevronRight,
  Droplets,
  CalendarDays,
  Zap,
  Shield,
  Star,
  ArrowRight,
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

function SubscriptionsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(FALLBACK_PLANS);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (profile?.uid) {
      setSubscribing(true);
      await setUserActivePlan(profile.uid, {
        planId: plan.id,
        planName: plan.name,
        frequency: plan.deliveryFrequency,
        price: plan.pricePerMonth,
        startDate: new Date().toISOString().slice(0, 10),
      }).catch(() => {});
      setSubscribing(false);
    }
    navigate({ to: "/schedule" });
  };

  useEffect(() => {
    /* Show fallback data after 2 s if Firestore hasn't responded */
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

  const perks = [
    { icon: Zap, text: "Pause or skip any delivery anytime" },
    { icon: Shield, text: "Cancel anytime — no lock-in" },
    { icon: Star, text: "Priority support for subscribers" },
    { icon: Droplets, text: "Fresh purified water every delivery" },
  ];

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
          const color = planColors[plan.id];
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
                  disabled={subscribing}
                  onClick={() => handleSubscribe(plan)}
                  className={`w-full gap-2 rounded-xl h-11 text-sm font-extrabold transition-all ${
                    plan.popular || isSelected
                      ? `bg-gradient-to-r ${color.gradient} text-white shadow-water border-0`
                      : "border-border/60 bg-muted text-foreground hover:bg-muted/80"
                  }`}
                  variant={plan.popular || isSelected ? "default" : "outline"}
                >
                  {isSelected ? "✓ Selected — Schedule Now" : "Choose Plan"}{" "}
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
    </div>
  );
}
