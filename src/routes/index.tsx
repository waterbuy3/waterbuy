import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  categories as FALLBACK_CATS,
  products as FALLBACK_PRODUCTS,
  testimonials as FALLBACK_TESTIMONIALS,
  appStats as FALLBACK_STATS,
  trustBadges as FALLBACK_BADGES,
  type Category,
  type Product,
} from "@/lib/data";
import {
  subscribeProducts,
  subscribeCategories,
  subscribeHomeContent,
  subscribeDeliverySettings,
  logWaterIntake,
  type DeliverySettings,
} from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  Plus,
  ChevronRight,
  Zap,
  Star,
  Droplets,
  CalendarDays,
  Repeat,
  Package,
  Flame,
  Trophy,
  Users,
  Clock,
  ArrowRight,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useEffect, useState, useCallback } from "react";
import { useCart } from "@/context/CartContext";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
      <span className="text-[10px] font-bold text-amber-600">{rating.toFixed(1)}</span>
    </span>
  );
}

function HomePage() {
  const { cart, addToCart, removeFromCart, totalItems, totalPrice } = useCart();
  const { profile } = useAuth();

  // Live data from Firestore — falls back to hardcoded if unconfigured/empty
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATS);
  const [appStats, setAppStats] = useState(FALLBACK_STATS);
  const [trustBadges, setTrustBadges] = useState(FALLBACK_BADGES);
  const [testimonials, setTestimonials] = useState(FALLBACK_TESTIMONIALS);
  type Banner = { title: string; sub: string; bg: string; badge: string; emoji: string };
  const [banners, setBanners] = useState<Banner[]>([
    {
      title: "Get 20% Off on Tanker Booking",
      sub: "Use code TANK20",
      bg: "from-primary to-water",
      badge: "Limited Offer",
      emoji: "🚚",
    },
    {
      title: "Free Dispenser with 5L Can Sub",
      sub: "Use code FREEDISP",
      bg: "from-orange-500 to-amber-400",
      badge: "New User",
      emoji: "🎁",
    },
    {
      title: "Flat ₹50 Off on 12-Pack Bundles",
      sub: "Use code PARTY50",
      bg: "from-success to-teal-500",
      badge: "Weekend Special",
      emoji: "🎉",
    },
  ]);

  useEffect(() => {
    const unsubP = subscribeProducts((docs) => {
      if (docs.length > 0) setProducts(docs as Product[]);
    });
    const unsubC = subscribeCategories((docs) => {
      if (docs.length > 0) setCategories(docs as Category[]);
    });
    const unsubH = subscribeHomeContent((data) => {
      if (!data) return;
      const d = data as Record<string, unknown>;
      if (d.stats) setAppStats(d.stats as typeof FALLBACK_STATS);
      if (d.trustBadges) setTrustBadges(d.trustBadges as typeof FALLBACK_BADGES);
      if (d.testimonials) setTestimonials(d.testimonials as typeof FALLBACK_TESTIMONIALS);
      if (d.banners) setBanners(d.banners as Banner[]);
    });
    const unsubD = subscribeDeliverySettings((s) => setDeliverySettings(s));
    return () => {
      unsubP();
      unsubC();
      unsubH();
      unsubD();
    };
  }, []);

  // Sync today's water log from profile
  useEffect(() => {
    if (!profile) return;
    const today = new Date().toISOString().slice(0, 10);
    const log = profile.waterLog;
    if (log?.date === today) {
      setHydration(log.litres);
    } else {
      setHydration(0);
    }
  }, [profile?.uid, profile?.waterLog?.date, profile?.waterLog?.litres]);

  const instantProducts = products
    .filter((p) => p.deliveryType === "All" || p.deliveryType === "Instant")
    .slice(0, 6);
  const featuredProducts = products.filter((p) => p.popular).slice(0, 4);

  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings | null>(null);
  const [locationPincode, setLocationPincode] = useState<string>("");

  useEffect(() => {
    if (!deliverySettings?.areas?.length) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json() as { address?: { postcode?: string } };
          setLocationPincode(data?.address?.postcode ?? "");
        } catch { /* geolocation available but reverse geocode failed */ }
      },
      () => { /* user denied or unavailable — silently ignore */ }
    );
  }, [deliverySettings?.areas?.length]);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hydration, setHydration] = useState(0);
  const [loggingWater, setLoggingWater] = useState(false);
  const hydrationGoal = 3.0;
  const hydrationPct = Math.min((hydration / hydrationGoal) * 100, 100);

  const onSelect = useCallback(() => {
    if (emblaApi) setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    const id = setInterval(() => emblaApi.scrollNext(), 3500);
    return () => {
      clearInterval(id);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const quickActions = [
    { label: "Instant", icon: Zap, color: "text-amber-500 bg-amber-50", to: "/products" },
    { label: "Schedule", icon: CalendarDays, color: "text-primary bg-primary/10", to: "/schedule" },
    { label: "Subscribe", icon: Repeat, color: "text-success bg-success/10", to: "/subscriptions" },
    { label: "Bulk Order", icon: Package, color: "text-purple-500 bg-purple-50", to: "/products" },
  ];

  // Priority: saved default address > detected GPS location > first configured area
  const userPincode = profile?.addresses?.find((a) => a.isDefault)?.pincode ?? "";
  const effectivePincode = userPincode || locationPincode;
  const matchedArea = deliverySettings?.areas?.find((a) => a.pincode === effectivePincode);
  const areaEta = matchedArea?.etaMins ?? deliverySettings?.etaMins ?? appStats.avgDeliveryMin;
  const areaName =
    matchedArea?.name ??
    (effectivePincode ? `PIN ${effectivePincode}` : null) ??
    deliverySettings?.areas?.[0]?.name ??
    null;
  const isServiceable = !deliverySettings?.servicePincodes ||
    !effectivePincode ||
    deliverySettings.servicePincodes.split(/[\s,]+/).filter(Boolean).includes(effectivePincode);

  return (
    <div className="bg-muted/30 min-h-screen pb-8">
      {/* Live strip */}
      <div className="bg-primary px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <span className="text-[11px] font-bold text-white/90">
            {isServiceable
              ? areaName
                ? `Live · Delivering to ${areaName}`
                : "Live · Delivering in your area"
              : "Check if we deliver to your area"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-semibold text-white/75">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {areaEta} min avg
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
            {appStats.rating}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <section className="px-4 py-4">
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((a) => (
            <Link key={a.label} to={a.to} className="flex flex-col items-center gap-1.5 group">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center ${a.color} group-active:scale-95 transition-transform shadow-sm`}
              >
                <a.icon className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-bold text-foreground text-center leading-tight">
                {a.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Carousel */}
      <section className="pb-4">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {banners.map((banner, idx) => (
              <div key={idx} className="flex-[0_0_100%] min-w-0 px-4">
                <div
                  className={`relative bg-gradient-to-br ${banner.bg} h-48 rounded-3xl overflow-hidden`}
                  style={{ boxShadow: "0 8px 32px -8px rgba(0,0,0,0.25)" }}
                >
                  {/* Decorative circles */}
                  <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
                  <div className="absolute -bottom-10 -right-4 w-28 h-28 rounded-full bg-black/10" />
                  <div className="absolute top-4 right-16 w-10 h-10 rounded-full bg-white/8" />

                  {/* Big emoji — positioned right, large */}
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[88px] leading-none select-none drop-shadow-lg" aria-hidden="true">
                    {banner.emoji}
                  </div>

                  {/* Content */}
                  <div className="relative z-10 h-full flex flex-col justify-between p-5">
                    {/* Top: badge */}
                    <div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-black/20 backdrop-blur-md rounded-full text-[9px] font-extrabold text-white uppercase tracking-widest">
                        <span className="w-1 h-1 rounded-full bg-white/80 inline-block" />
                        {banner.badge}
                      </span>
                    </div>

                    {/* Bottom: text + CTA */}
                    <div>
                      <h2 className="text-[20px] font-extrabold text-white leading-tight tracking-tight max-w-[60%]">
                        {banner.title}
                      </h2>
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-[11px] text-white/80 font-bold bg-black/15 px-2.5 py-1 rounded-full">
                          {banner.sub}
                        </p>
                        <Link to="/products">
                          <button className="flex items-center gap-1 px-3.5 py-1.5 bg-white rounded-full text-[11px] font-extrabold text-slate-800 shadow-sm active:scale-95 transition-transform">
                            Order Now <ArrowRight className="h-3 w-3" />
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`rounded-full transition-all duration-300 ${i === selectedIndex ? "w-6 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-border"}`}
            />
          ))}
        </div>
      </section>

      {/* Trust Badges */}
      <section className="px-4 pb-5">
        <div className="flex overflow-x-auto gap-2 no-scrollbar">
          {trustBadges.map((b) => (
            <div
              key={b.label}
              className="shrink-0 flex items-center gap-1.5 bg-background border border-border/40 rounded-full px-3 py-1.5 shadow-sm"
            >
              <span className="text-sm">{b.icon}</span>
              <span className="text-[11px] font-bold text-foreground whitespace-nowrap">
                {b.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Strip */}
      <section className="mx-4 mb-5 rounded-2xl bg-foreground overflow-hidden shadow-water-lg">
        <div className="grid grid-cols-3 divide-x divide-white/10">
          {[
            { icon: Droplets, value: appStats.deliveriesToday, label: "Today's deliveries" },
            { icon: Users, value: appStats.happyCustomers, label: "Happy customers" },
            { icon: Trophy, value: `${appStats.citiesCovered} cities`, label: "Covered" },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center py-4 gap-0.5">
              <s.icon className="h-4 w-4 text-water-light mb-1" />
              <span className="text-base font-extrabold text-white tracking-tight">{s.value}</span>
              <span className="text-[9px] text-white/50 font-semibold uppercase tracking-wide text-center leading-tight px-2">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-4 mb-5 bg-background rounded-2xl shadow-sm border border-border/40 overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h2 className="font-extrabold text-foreground text-sm tracking-tight">
            SHOP BY CATEGORY
          </h2>
          <Link
            to="/products"
            className="text-[11px] font-bold text-primary flex items-center gap-0.5"
          >
            All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-y-5 gap-x-2 px-4 pb-5">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to="/products"
              search={{ category: cat.id }}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-b ${cat.color} shadow-sm group-active:scale-95 transition-transform`}
              >
                {cat.icon}
              </div>
              <span className="text-[10px] font-bold text-foreground text-center leading-tight">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Hydration Tracker */}
      <section className="mx-4 mb-5">
        <div className="bg-gradient-to-br from-primary to-water rounded-2xl p-4 shadow-water-lg relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <circle cx="160" cy="40" r="80" fill="white" />
              <circle cx="20" cy="160" r="50" fill="white" />
            </svg>
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div>
                {(profile?.streak ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Flame className="h-4 w-4 text-amber-300" />
                    <span className="text-[11px] font-extrabold text-white/80 uppercase tracking-wider">
                      {profile!.streak}-Day Streak!
                    </span>
                  </div>
                )}
                <h3 className="text-lg font-extrabold text-white">Today's Hydration</h3>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-white">{hydration.toFixed(2)}L</span>
                <p className="text-[10px] text-white/70 font-bold">/ {hydrationGoal}L goal</p>
              </div>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{ width: `${hydrationPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-white/70 font-semibold">
                {hydration >= hydrationGoal
                  ? "🎉 Amazing! You've hit your 3L goal today!"
                  : `${(hydrationGoal - hydration).toFixed(2)}L more to reach your goal`}
              </p>
              <button
                disabled={loggingWater}
                onClick={async () => {
                  if (!profile?.uid) {
                    setHydration((h) => Math.min(+(h + 0.25).toFixed(3), 3));
                    return;
                  }
                  setLoggingWater(true);
                  const result = await logWaterIntake(profile.uid, 0.25);
                  if (result) setHydration(Math.min(result.litres, 3));
                  setLoggingWater(false);
                }}
                className="flex items-center gap-1 bg-white/20 hover:bg-white/30 active:bg-white/40 disabled:opacity-60 rounded-full px-3 py-1.5 text-[11px] font-extrabold text-white transition-colors"
              >
                <Plus className="h-3 w-3" /> Log 250ml
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Instant Delivery */}
      <section className="mb-5">
        <div className="flex items-center justify-between px-4 mb-3">
          <div className="flex items-center gap-1.5">
            <Zap className="h-5 w-5 text-amber-500 fill-amber-400/20" />
            <h2 className="text-lg font-extrabold text-foreground">Delivery in 10 mins</h2>
          </div>
          <Link to="/products" className="text-xs font-bold text-primary flex items-center gap-0.5">
            See all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar px-4">
          {instantProducts.map((product) => {
            const qty = cart[product.id] || 0;
            const savings = product.mrp ? product.mrp - product.price : 0;
            return (
              <div
                key={product.id}
                className="w-[148px] shrink-0 bg-background rounded-2xl border border-border/40 shadow-sm relative overflow-hidden card-lift group"
              >
                {product.badge && (
                  <div className="absolute top-0 left-0 bg-primary text-[9px] font-extrabold text-white px-2 py-0.5 rounded-br-xl z-20 tracking-wide">
                    {product.badge}
                  </div>
                )}
                {savings > 0 && (
                  <div className="absolute top-0 right-0 bg-success text-[9px] font-extrabold text-white px-2 py-0.5 rounded-bl-xl z-20">
                    -{Math.round((savings / product.mrp!) * 100)}%
                  </div>
                )}
                <div className="h-28 bg-muted rounded-t-2xl overflow-hidden">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    width={160}
                    height={112}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-foreground text-xs line-clamp-2 leading-tight mb-1">
                    {product.name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-medium mb-1">
                    {product.size}
                  </p>
                  {product.rating && (
                    <div className="mb-2">
                      <StarRating rating={product.rating} />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-sm text-foreground">
                        ₹{product.price}
                      </span>
                      {product.mrp && (
                        <span className="text-[10px] text-muted-foreground line-through ml-1">
                          ₹{product.mrp}
                        </span>
                      )}
                    </div>
                    {qty === 0 ? (
                      <Button
                        size="icon"
                        onClick={() => addToCart(product.id)}
                        className="h-7 w-7 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white shadow-none border border-primary/20 transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1 bg-primary rounded-lg px-1.5 py-0.5">
                        <button
                          onClick={() => removeFromCart(product.id)}
                          className="text-white text-sm font-bold px-0.5"
                        >
                          −
                        </button>
                        <span className="text-white text-xs font-extrabold w-4 text-center">
                          {qty}
                        </span>
                        <button
                          onClick={() => addToCart(product.id)}
                          className="text-white text-sm font-bold px-0.5"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Top Picks */}
      <section className="mx-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold text-foreground flex items-center gap-1.5">
            <Trophy className="h-5 w-5 text-amber-500" /> Top Picks
          </h2>
          <Link to="/products" className="text-xs font-bold text-primary flex items-center gap-0.5">
            See all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="space-y-3">
          {featuredProducts.map((p) => {
            const qty = cart[p.id] || 0;
            return (
              <div
                key={p.id}
                className="flex gap-3 bg-background rounded-2xl border border-border/40 p-3 shadow-sm card-lift"
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0">
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    width={80}
                    height={80}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 flex flex-col justify-between py-0.5">
                  <div>
                    <span className="text-[9px] font-extrabold text-primary uppercase tracking-widest">
                      {p.badge}
                    </span>
                    <h3 className="font-bold text-foreground text-sm leading-tight">{p.name}</h3>
                    <p className="text-[10px] text-muted-foreground">{p.size}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      {p.rating && <StarRating rating={p.rating} />}
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="font-extrabold text-sm text-foreground">₹{p.price}</span>
                        {p.mrp && (
                          <span className="text-[10px] text-muted-foreground line-through">
                            ₹{p.mrp}
                          </span>
                        )}
                      </div>
                    </div>
                    {qty === 0 ? (
                      <Button
                        size="sm"
                        onClick={() => addToCart(p.id)}
                        className="rounded-xl h-7 text-xs bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/20 shadow-none font-bold"
                      >
                        Add
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1 bg-primary rounded-lg px-2 py-1">
                        <button
                          onClick={() => removeFromCart(p.id)}
                          className="text-white text-sm font-bold"
                        >
                          −
                        </button>
                        <span className="text-white text-xs font-extrabold w-4 text-center">
                          {qty}
                        </span>
                        <button
                          onClick={() => addToCart(p.id)}
                          className="text-white text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mb-5">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-lg font-extrabold text-foreground">What customers say</h2>
          <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="text-[11px] font-extrabold text-amber-700">
              {appStats.rating} · {appStats.happyCustomers}
            </span>
          </div>
        </div>
        <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar px-4">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="shrink-0 w-64 bg-background border border-border/40 rounded-2xl p-4 shadow-sm card-lift"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-water flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-extrabold text-white">{t.avatar}</span>
                </div>
                <div>
                  <p className="text-xs font-extrabold text-foreground leading-none">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.location}</p>
                </div>
                <div className="ml-auto flex">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
              <p className="text-xs text-foreground/80 font-medium leading-relaxed line-clamp-3">
                "{t.text}"
              </p>
              <span className="mt-2 inline-block text-[9px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {t.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Subscription CTA */}
      <section className="px-4 mb-2">
        <Link to="/subscriptions">
          <div className="bg-foreground rounded-2xl p-5 flex items-center justify-between shadow-water-lg relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-[72%]">
              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-white/60 uppercase tracking-widest mb-1">
                <ShieldCheck className="h-3 w-3" /> Auto-pilot hydration
              </span>
              <h2 className="text-lg font-extrabold text-background mb-1 tracking-tight leading-tight">
                Never run out of water again
              </h2>
              <p className="text-[11px] text-background/70 font-medium">
                Subscribe from ₹899/month · Cancel anytime
              </p>
            </div>
            <div className="relative z-10 flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-water group-hover:scale-105 transition-transform">
                <ArrowRight className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </Link>
      </section>

      {/* Global cart bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-[84px] left-0 right-0 max-w-md mx-auto px-4 z-50 animate-in slide-in-from-bottom-3 duration-300">
          <Link to="/checkout">
            <div className="bg-success text-white rounded-2xl px-4 py-3 flex items-center shadow-2xl justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-extrabold">
                    {totalItems} item{totalItems !== 1 ? "s" : ""} in cart
                  </p>
                  <p className="text-xs font-semibold opacity-80">₹{totalPrice} total</p>
                </div>
              </div>
              <span className="font-extrabold text-sm bg-white/20 rounded-xl px-3 py-1.5">
                Checkout →
              </span>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
