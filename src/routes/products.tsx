import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  products as FALLBACK_PRODUCTS,
  categories as FALLBACK_CATEGORIES,
  type Product,
  type Category,
} from "@/lib/data";
import { subscribeProducts, subscribeCategories } from "@/lib/supabase";
import {
  ShoppingCart,
  Filter,
  Zap,
  Calendar,
  Package,
  ChevronDown,
  Star,
  X,
  Flame,
  Search,
} from "lucide-react";
import { z } from "zod";
import { useCart } from "@/context/CartContext";

const searchSchema = z.object({
  category: z.string().optional(),
  query: z.string().optional(),
});

export const Route = createFileRoute("/products")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Products — AquaPure Water Delivery" },
      {
        name: "description",
        content: "Browse water bottles, cans, bundles and tankers for every need.",
      },
    ],
  }),
  component: ProductsPage,
});

function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <span className="flex items-center gap-1">
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
      <span className="text-[10px] font-bold text-amber-600">{rating.toFixed(1)}</span>
      {count && (
        <span className="text-[10px] text-muted-foreground">
          ({count > 999 ? `${(count / 1000).toFixed(1)}k` : count})
        </span>
      )}
    </span>
  );
}

function highlight(text: string, query: string) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function ProductsPage() {
  const { category: initialCategory, query: urlQuery } = Route.useSearch();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || "all");
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc" | "rating">(
    "default",
  );
  const [localQuery, setLocalQuery] = useState(urlQuery || "");
  const { cart, addToCart, removeFromCart, totalItems, totalPrice } = useCart();

  // Live Firestore data (falls back to hardcoded data if Firestore empty/unconfigured)
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);

  useEffect(() => {
    const unsubP = subscribeProducts((docs) => {
      if (docs.length > 0) setProducts(docs as Product[]);
    });
    const unsubC = subscribeCategories((docs) => {
      if (docs.length > 0) setCategories(docs as Category[]);
    });
    return () => {
      unsubP();
      unsubC();
    };
  }, []);

  // Sync local search box with URL query param
  useEffect(() => {
    setLocalQuery(urlQuery || "");
  }, [urlQuery]);

  const activeQuery = (urlQuery || "").trim().toLowerCase();

  const filtered = products
    .filter((p) => {
      const matchCategory = selectedCategory === "all" || p.category === selectedCategory;
      const matchQuery =
        !activeQuery ||
        p.name.toLowerCase().includes(activeQuery) ||
        p.description.toLowerCase().includes(activeQuery) ||
        p.category.toLowerCase().includes(activeQuery) ||
        (p.badge || "").toLowerCase().includes(activeQuery) ||
        p.size.toLowerCase().includes(activeQuery);
      return matchCategory && matchQuery;
    })
    .sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      return 0;
    });

  const handleLocalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = localQuery.trim();
    navigate({
      to: "/products",
      search: {
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        query: q || undefined,
      },
    });
  };

  const clearSearch = () => {
    setLocalQuery("");
    navigate({
      to: "/products",
      search: { category: selectedCategory !== "all" ? selectedCategory : undefined },
    });
  };

  const getDeliveryInfo = (type?: string) => {
    if (type === "Instant")
      return {
        icon: <Zap className="h-3 w-3 text-amber-500" />,
        label: "10 min delivery",
        cls: "text-amber-600 bg-amber-50",
      };
    if (type === "Scheduled")
      return {
        icon: <Calendar className="h-3 w-3 text-primary" />,
        label: "Scheduled",
        cls: "text-primary bg-primary/10",
      };
    return {
      icon: <Package className="h-3 w-3 text-success" />,
      label: "All modes",
      cls: "text-success bg-success/10",
    };
  };

  return (
    <div className="bg-muted/20 min-h-screen pb-28">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md shadow-sm border-b border-border/30">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="font-extrabold text-foreground text-lg flex items-center gap-1">
            Shop <ChevronDown className="h-5 w-5" />
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-xs font-bold text-foreground bg-muted rounded-xl px-3 py-1.5 border-none outline-none cursor-pointer"
          >
            <option value="default">Relevance</option>
            <option value="rating">Top Rated</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
          </select>
        </div>

        {/* Inline search bar (synced with Header search) */}
        <form onSubmit={handleLocalSearch} className="px-4 pb-2 relative">
          <Search
            className="absolute left-7 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            style={{ height: 15, width: 15, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="search"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && handleLocalSearch(e as unknown as React.FormEvent)
            }
            placeholder="Search products…"
            className="w-full bg-muted/60 border border-border/50 rounded-xl py-2 pl-9 pr-8 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:bg-background transition-all"
          />
          {localQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-7 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X style={{ height: 14, width: 14 }} />
            </button>
          )}
        </form>

        {/* Category Filter Chips */}
        <div className="flex overflow-x-auto pb-3 no-scrollbar items-center gap-2 px-4">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <button
            onClick={() => setSelectedCategory("all")}
            className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all shrink-0 border ${
              selectedCategory === "all"
                ? "bg-foreground text-background border-foreground shadow-sm"
                : "bg-background text-foreground border-border/60 hover:bg-muted"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all shrink-0 flex items-center gap-1 border ${
                selectedCategory === cat.id
                  ? "bg-foreground text-background border-foreground shadow-sm"
                  : "bg-background text-foreground border-border/60 hover:bg-muted"
              }`}
            >
              <span className="text-[13px]">{cat.icon}</span> {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results meta */}
      <div className="px-4 py-2 flex items-center gap-2">
        {activeQuery && (
          <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full flex items-center gap-1">
            <Search style={{ height: 11, width: 11 }} />"{urlQuery}"
            <button onClick={clearSearch} className="ml-0.5 hover:text-primary/70">
              <X style={{ height: 10, width: 10 }} />
            </button>
          </span>
        )}
        <span className="text-xs text-muted-foreground font-semibold">
          {filtered.length} {filtered.length === 1 ? "item" : "items"}
          {activeQuery ? " found" : ""}
        </span>
      </div>

      {/* Product List */}
      <div className="px-4 space-y-3">
        {filtered.map((product) => {
          const qty = cart[product.id] || 0;
          const delivery = getDeliveryInfo(product.deliveryType);
          const savings = product.mrp ? product.mrp - product.price : 0;
          const savingsPct = product.mrp ? Math.round((savings / product.mrp) * 100) : 0;

          return (
            <div
              key={product.id}
              className="flex gap-3 p-3.5 bg-background rounded-2xl border border-border/40 shadow-sm relative overflow-hidden card-lift"
            >
              {/* Image */}
              <div className="relative w-28 h-28 rounded-xl overflow-hidden shrink-0 bg-muted">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  width={112}
                  height={112}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                {product.badge && (
                  <div className="absolute top-0 left-0 bg-primary/90 px-2 py-0.5 rounded-br-xl text-[9px] font-extrabold text-white uppercase tracking-wide">
                    {product.badge}
                  </div>
                )}
                {savingsPct > 0 && (
                  <div className="absolute bottom-0 right-0 bg-success px-2 py-0.5 rounded-tl-xl text-[9px] font-extrabold text-white">
                    -{savingsPct}%
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex flex-col flex-1 justify-between py-0.5">
                <div>
                  <h3 className="font-extrabold text-foreground text-sm leading-tight">
                    {activeQuery ? highlight(product.name, activeQuery) : product.name}
                  </h3>
                  <p className="text-[10px] font-bold text-muted-foreground mt-0.5">
                    {product.size} · {product.unit}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                    {activeQuery
                      ? highlight(product.description, activeQuery)
                      : product.description}
                  </p>
                  {product.rating && (
                    <div className="mt-1">
                      <StarRating rating={product.rating} count={product.reviewCount} />
                    </div>
                  )}
                </div>

                <div className="flex items-end justify-between mt-2">
                  <div>
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full mb-1 ${delivery.cls}`}
                    >
                      {delivery.icon} {delivery.label}
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-extrabold text-foreground">
                        ₹{product.price}
                      </span>
                      {product.mrp && (
                        <span className="text-[11px] text-muted-foreground line-through">
                          ₹{product.mrp}
                        </span>
                      )}
                      {savings > 0 && (
                        <span className="text-[10px] font-extrabold text-success">
                          Save ₹{savings}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cart control */}
                  <div className="w-[80px]">
                    {qty === 0 ? (
                      <button
                        onClick={() => addToCart(product.id)}
                        className="w-full py-2 rounded-xl border-2 border-primary/30 bg-primary/5 text-primary text-xs font-extrabold uppercase tracking-wide hover:bg-primary/10 active:scale-95 transition-all"
                      >
                        ADD
                      </button>
                    ) : (
                      <div className="flex items-center justify-between w-full py-1.5 rounded-xl border-2 border-primary bg-primary text-white text-xs font-extrabold shadow-sm px-2">
                        <button
                          aria-label={`Remove one ${product.name}`}
                          onClick={() => removeFromCart(product.id)}
                          className="px-1 text-base leading-none"
                        >
                          −
                        </button>
                        <span aria-label={`${qty} in cart`}>{qty}</span>
                        <button
                          aria-label={`Add one ${product.name}`}
                          onClick={() => addToCart(product.id)}
                          className="px-1 text-base leading-none"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Popular flame */}
              {product.popular && (
                <div className="absolute top-2 right-2">
                  <Flame className="h-4 w-4 text-amber-400 fill-amber-400/20" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="py-20 text-center px-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Package className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            {activeQuery ? `No results for "${urlQuery}"` : "No items available"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeQuery
              ? "Try a different search term or clear filters."
              : "Try removing filters to see more products."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {activeQuery && (
              <button
                onClick={clearSearch}
                className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-4 py-2 rounded-xl"
              >
                <X className="h-3 w-3" /> Clear search
              </button>
            )}
            {selectedCategory !== "all" && (
              <button
                onClick={() => setSelectedCategory("all")}
                className="flex items-center gap-1.5 text-xs font-bold text-foreground bg-muted px-4 py-2 rounded-xl"
              >
                <X className="h-3 w-3" /> Clear category
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Cart Bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-[84px] left-0 right-0 px-4 max-w-md mx-auto z-40 animate-in slide-in-from-bottom-3 duration-300">
          <div className="bg-success text-white rounded-2xl px-4 py-3.5 flex items-center shadow-2xl justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-extrabold">
                  {totalItems} item{totalItems !== 1 ? "s" : ""} added
                </p>
                <p className="text-xs font-semibold opacity-80">₹{totalPrice} total</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate({ to: "/checkout" })}
              className="rounded-xl font-extrabold bg-white text-success hover:bg-white/90 shadow-none h-9 px-4"
            >
              Checkout →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
