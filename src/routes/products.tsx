import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { products, categories } from "@/lib/data";
import { Droplets, ShoppingCart, Filter, X } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  category: z.string().optional(),
});

export const Route = createFileRoute("/products")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Products — AquaPure Water Delivery" },
      { name: "description", content: "Browse water bottles, cans, bundles and tankers for every need." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { category: initialCategory } = Route.useSearch();
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || "all");
  const [cart, setCart] = useState<Record<string, number>>({});

  const filtered = selectedCategory === "all"
    ? products
    : products.filter((p) => p.category === selectedCategory);

  const addToCart = (id: string) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const totalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Our Products</h1>
        <p className="mt-1 text-muted-foreground">From pocket-sized bottles to tanker lorries</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <button
          onClick={() => setSelectedCategory("all")}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            selectedCategory === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-accent"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
        {selectedCategory !== "all" && (
          <button
            onClick={() => setSelectedCategory("all")}
            className="ml-1 rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Cart summary */}
      {totalItems > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {totalItems} item{totalItems !== 1 ? "s" : ""} in cart
          </span>
          <span className="text-sm text-muted-foreground">
            — ${Object.entries(cart).reduce((sum, [id, qty]) => {
              const prod = products.find((p) => p.id === id);
              return sum + (prod ? prod.price * qty : 0);
            }, 0).toFixed(2)}
          </span>
          <Button size="sm" variant="water" className="ml-auto gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5" /> Checkout
          </Button>
        </div>
      )}

      {/* Product Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((product) => (
          <Card
            key={product.id}
            className="group overflow-hidden transition-all duration-300 hover:shadow-water hover:-translate-y-1"
          >
            <div className="gradient-water-card p-8 text-center relative">
              <Droplets className="mx-auto h-14 w-14 text-primary/50 transition-transform group-hover:scale-110" />
              {product.badge && (
                <span className="absolute top-3 right-3 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground uppercase tracking-wide">
                  {product.badge}
                </span>
              )}
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground">{product.name}</h3>
              <p className="text-sm text-muted-foreground">{product.size}</p>
              <p className="mt-1 text-xs text-muted-foreground">{product.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-lg font-bold text-primary">${product.price.toFixed(2)}</span>
                <div className="flex items-center gap-1.5">
                  {cart[product.id] && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      ×{cart[product.id]}
                    </span>
                  )}
                  <Button size="sm" variant="water" onClick={() => addToCart(product.id)}>
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-20 text-center">
          <Droplets className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-muted-foreground">No products found in this category.</p>
        </div>
      )}
    </div>
  );
}
