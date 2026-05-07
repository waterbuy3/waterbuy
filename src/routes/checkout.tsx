import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import {
  ChevronLeft, MapPin, Smartphone, Package,
  CheckCircle2, Plus, Minus, Truck, Clock, Tag,
} from "lucide-react";
import { products as FALLBACK_PRODUCTS, type Product } from "@/lib/data";
import { subscribeProducts, placeOrder } from "@/lib/firebase";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const { cart, totalPrice, totalItems, removeFromCart, addToCart, clearCart } = useCart();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState<"upi" | "cod">("upi");
  const [address, setAddress]   = useState("");
  const [pincode, setPincode]   = useState("");
  const [landmark, setLandmark] = useState("");
  const [placed, setPlaced]     = useState(false);
  const [placing, setPlacing]   = useState(false);
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);

  useEffect(() => {
    const unsub = subscribeProducts((docs) => {
      if (docs.length > 0) setProducts(docs as Product[]);
    });
    return unsub;
  }, []);

  const cartItems = Object.entries(cart)
    .map(([id, qty]) => {
      const product = products.find((p) => p.id === id);
      return product ? { ...product, qty } : null;
    })
    .filter(Boolean) as (Product & { qty: number })[];

  const deliveryFee    = totalPrice >= 299 ? 0 : 30;
  const orderTotal = totalPrice + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!address.trim() || !pincode.trim()) return;
    setPlacing(true);
    const itemsSummary = cartItems
      .map((item) => `${item.name} × ${item.qty}`)
      .join(", ");
    const fullAddress = [address.trim(), pincode.trim(), landmark.trim()].filter(Boolean).join(", ");
    await placeOrder({
      userId:   profile?.uid ?? "guest",
      customer: profile?.name || "Guest",
      phone:    profile?.phone || "",
      items:    itemsSummary,
      total:    orderTotal,
      payment:  paymentMethod,
      address:  fullAddress,
    });
    setPlacing(false);
    setPlaced(true);
    clearCart();
    setTimeout(() => navigate({ to: "/" }), 3200);
  };

  /* ── Empty cart ── */
  if (totalItems === 0 && !placed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
          <Package className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold">Cart is empty</h2>
          <p className="text-sm text-muted-foreground mt-1">Add some products before checking out.</p>
        </div>
        <Button onClick={() => navigate({ to: "/products" })} className="rounded-2xl px-8 h-11 font-extrabold">
          Shop Now
        </Button>
      </div>
    );
  }

  /* ── Success ── */
  if (placed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-5 px-8 text-center animate-slide-up-fade">
        <div className="w-24 h-24 rounded-full bg-success/15 flex items-center justify-center">
          <CheckCircle2 className="h-14 w-14 text-success" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold">Order Placed!</h2>
          <p className="text-muted-foreground text-sm mt-1">Your water is on its way 💧</p>
        </div>
        <div className="bg-primary/8 rounded-2xl p-4 w-full max-w-xs text-left space-y-1">
          <p className="text-[10px] font-extrabold text-primary uppercase tracking-wider">Estimated Delivery</p>
          <p className="text-base font-extrabold">Today, 4 – 6 PM</p>
          <p className="text-xs text-muted-foreground">You'll receive a call before delivery</p>
        </div>
        <p className="text-xs text-muted-foreground animate-pulse">Redirecting to home…</p>
      </div>
    );
  }

  /* ── Main checkout ── */
  return (
    <div className="bg-muted/20 min-h-screen pb-36">

      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/96 backdrop-blur border-b border-border/40 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/products" })}
          className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-extrabold">Checkout</h1>
        <span className="ml-auto text-xs text-muted-foreground font-medium">{totalItems} item{totalItems !== 1 ? "s" : ""}</span>
      </div>

      <div className="px-4 space-y-4 pt-4">

        {/* Cart Items */}
        <div className="bg-background rounded-2xl border border-border/40 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2 border-b border-border/40 flex items-center justify-between">
            <h2 className="text-sm font-extrabold">Your Items</h2>
            <button
              onClick={() => navigate({ to: "/products" })}
              className="text-xs text-primary font-bold"
            >
              + Add more
            </button>
          </div>

          {cartItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-4 border-b border-border/40 last:border-0">
              <img
                src={item.imageUrl}
                alt={item.name}
                width={56}
                height={56}
                loading="lazy"
                className="w-14 h-14 rounded-xl object-cover bg-muted shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold truncate">{item.name}</h3>
                <p className="text-[11px] text-muted-foreground">{item.size} · {item.unit}</p>
                <p className="text-sm font-extrabold text-primary mt-0.5">
                  ₹{(item.price * item.qty).toFixed(0)}
                  {item.qty > 1 && (
                    <span className="text-[10px] text-muted-foreground font-normal ml-1">
                      (₹{item.price} × {item.qty})
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-5 text-center text-sm font-extrabold">{item.qty}</span>
                <button
                  onClick={() => addToCart(item.id)}
                  className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Plus className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Delivery Address */}
        <div className="bg-background rounded-2xl border border-border/40 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-extrabold">Delivery Address</h2>
          </div>

          <textarea
            className="w-full bg-muted/50 rounded-xl border border-border/50 px-3 py-2.5 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 resize-none"
            placeholder="House / Flat no., Street, Area…"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="flex gap-2 mt-2">
            <input
              className="w-28 bg-muted/50 rounded-xl border border-border/50 px-3 py-2 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              placeholder="Pincode"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
            />
            <input
              className="flex-1 bg-muted/50 rounded-xl border border-border/50 px-3 py-2 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              placeholder="Landmark (optional)"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 mt-3 p-3 bg-primary/8 rounded-xl">
            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
            <p className="text-xs font-semibold text-primary">
              Estimated delivery: <span className="font-extrabold">Today, 4 – 6 PM</span>
            </p>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-background rounded-2xl border border-border/40 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-extrabold">Payment Method</h2>
          </div>

          <div className="space-y-2">
            {[
              {
                id:       "upi" as const,
                icon:     Smartphone,
                label:    "UPI / Net Banking",
                desc:     "PhonePe, GPay, Paytm, and more",
                disabled: false,
              },
              {
                id:       "cod" as const,
                icon:     Truck,
                label:    "Cash on Delivery",
                desc:     "Pay when your order arrives",
                disabled: false,
              },
            ].map((method) => (
              <button
                key={method.id}
                onClick={() => !method.disabled && setPaymentMethod(method.id)}
                disabled={method.disabled}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  paymentMethod === method.id
                    ? "border-primary bg-primary/8"
                    : "border-border/40 hover:border-primary/30"
                } ${method.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    paymentMethod === method.id ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <method.icon
                    className={`h-[18px] w-[18px] ${
                      paymentMethod === method.id ? "text-white" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{method.label}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{method.desc}</p>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    paymentMethod === method.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                  }`}
                >
                  {paymentMethod === method.id && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-background rounded-2xl border border-border/40 shadow-sm p-4">
          <h2 className="text-sm font-extrabold mb-3">Order Summary</h2>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
              <span className="font-bold">₹{totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery fee</span>
              {deliveryFee === 0 ? (
                <span className="font-bold text-success">FREE</span>
              ) : (
                <span className="font-bold">₹{deliveryFee}</span>
              )}
            </div>
            {deliveryFee > 0 && (
              <p className="text-[11px] text-primary font-semibold -mt-1">
                Add ₹{(299 - totalPrice).toFixed(0)} more for free delivery
              </p>
            )}
            <div className="border-t border-border/40 pt-2.5 flex justify-between items-baseline">
              <span className="font-extrabold text-base">Total</span>
              <span className="font-extrabold text-primary text-lg">₹{orderTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Sticky place-order CTA */}
      <div className="fixed bottom-[64px] left-1/2 -translate-x-1/2 w-full max-w-md px-4 pb-3 bg-gradient-to-t from-background via-background/90 to-transparent pt-6 z-20">
        {(!address.trim() || !pincode.trim()) && (
          <p className="text-center text-xs text-destructive font-semibold mb-2">
            Please fill in your delivery address and pincode
          </p>
        )}
        <Button
          onClick={handlePlaceOrder}
          disabled={placing || !address.trim() || !pincode.trim()}
          className="w-full h-14 rounded-2xl text-base font-extrabold shadow-water bg-gradient-to-r from-primary to-water disabled:opacity-50"
        >
          {placing ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Placing Order…
            </span>
          ) : (
            `Place Order · ₹${orderTotal.toFixed(2)}`
          )}
        </Button>
      </div>
    </div>
  );
}
