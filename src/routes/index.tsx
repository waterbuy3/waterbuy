import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { categories, products } from "@/lib/data";
import heroImage from "@/assets/hero-water.jpg";
import { ArrowRight, Droplets, Clock, Shield, Truck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const featuredProducts = products.filter((p) => p.popular);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden gradient-water-hero">
        <div className="absolute inset-0 opacity-20">
          <img src={heroImage} alt="" className="h-full w-full object-cover" width={1920} height={1080} />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:py-28 lg:py-36">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-water/20 px-4 py-1.5 text-sm font-medium text-water-foreground">
              <Droplets className="h-4 w-4" /> #1 Water Delivery Platform
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-water-foreground sm:text-5xl lg:text-6xl">
              Pure Water,{" "}
              <span className="text-water-light">Delivered Fresh</span>
            </h1>
            <p className="mt-4 text-lg text-water-foreground/80 sm:text-xl">
              From 200ml bottles to 10,000L tankers. For weddings, corporates, events, apartments — we deliver everywhere.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products">
                <Button variant="hero" size="lg" className="gap-2 text-base">
                  Browse Products <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/subscriptions">
                <Button variant="water-outline" size="lg" className="border-water-foreground/30 text-water-foreground hover:bg-water-foreground/10 text-base">
                  Subscribe & Save
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 sm:grid-cols-4">
          {[
            { icon: Droplets, label: "Products", value: "50+" },
            { icon: Truck, label: "Deliveries", value: "1M+" },
            { icon: Clock, label: "Delivery Time", value: "2 Hrs" },
            { icon: Shield, label: "Quality Certified", value: "ISO" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1 text-center">
              <stat.icon className="h-6 w-6 text-primary" />
              <span className="text-2xl font-bold text-foreground">{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-foreground">Water for Every Need</h2>
          <p className="mt-2 text-muted-foreground">Choose your category and find the perfect water solution</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Link key={cat.id} to="/products" search={{ category: cat.id }}>
              <Card className="group cursor-pointer transition-all duration-300 hover:shadow-water hover:-translate-y-1">
                <CardContent className="flex items-center gap-4 p-5">
                  <span className="text-4xl">{cat.icon}</span>
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{cat.name}</h3>
                    <p className="text-sm text-muted-foreground">{cat.description}</p>
                  </div>
                  <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-muted/50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-foreground">Popular Products</h2>
            <p className="mt-2 text-muted-foreground">Most ordered items by our customers</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <Card key={product.id} className="group overflow-hidden transition-all duration-300 hover:shadow-water hover:-translate-y-1">
                <div className="gradient-water-card p-8 text-center">
                  <Droplets className="mx-auto h-16 w-16 text-primary/60 transition-transform group-hover:scale-110" />
                </div>
                <CardContent className="p-4">
                  {product.badge && (
                    <span className="mb-2 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {product.badge}
                    </span>
                  )}
                  <h3 className="font-semibold text-foreground">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">{product.size}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">${product.price.toFixed(2)}</span>
                    <Button size="sm" variant="water">Add to Cart</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/products">
              <Button variant="outline" size="lg" className="gap-2">
                View All Products <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="gradient-water-hero py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold text-water-foreground">Ready to Never Run Out of Water?</h2>
          <p className="mt-3 text-lg text-water-foreground/80">
            Subscribe today and get your first delivery free. Cancel anytime.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/subscriptions">
              <Button variant="hero" size="lg" className="gap-2 text-base">
                Start Subscription <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/schedule">
              <Button variant="water-outline" size="lg" className="border-water-foreground/30 text-water-foreground hover:bg-water-foreground/10 text-base">
                Schedule One-Time Delivery
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
