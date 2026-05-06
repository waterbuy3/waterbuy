import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { subscriptionPlans } from "@/lib/data";
import { Check, ArrowRight, Zap } from "lucide-react";

export const Route = createFileRoute("/subscriptions")({
  head: () => ({
    meta: [
      { title: "Subscriptions — AquaPure Water Delivery" },
      { name: "description", content: "Subscribe for regular water delivery and save. Plans for individuals, families, and businesses." },
    ],
  }),
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-12 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Zap className="h-4 w-4" /> Subscribe & Save up to 30%
        </div>
        <h1 className="text-4xl font-bold text-foreground">Subscription Plans</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Never run out of water. Choose a plan that fits your needs.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {subscriptionPlans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
              plan.popular
                ? "border-primary shadow-water ring-2 ring-primary/20"
                : "hover:shadow-water"
            }`}
          >
            {plan.popular && (
              <div className="gradient-water py-1.5 text-center text-xs font-bold uppercase tracking-wider text-water-foreground">
                Most Popular
              </div>
            )}
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-foreground">${plan.pricePerMonth}</span>
                <span className="text-muted-foreground">/month</span>
                <p className="mt-1 text-sm text-muted-foreground">
                  Delivery: {plan.deliveryFrequency}
                </p>
              </div>

              <ul className="mb-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.popular ? "hero" : "outline"}
                className="w-full gap-2"
                size="lg"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-16 rounded-2xl bg-muted/50 p-8 text-center">
        <h3 className="text-xl font-bold text-foreground">Need a Custom Plan?</h3>
        <p className="mt-2 text-muted-foreground">
          For large apartments, housing societies, or corporate campuses — we create tailored delivery schedules.
        </p>
        <Link to="/schedule">
          <Button variant="water" size="lg" className="mt-4 gap-2">
            Contact for Custom Plan <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
