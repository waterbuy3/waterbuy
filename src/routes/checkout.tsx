import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { AddressPicker } from "@/components/AddressPicker";
import { useState, useEffect } from "react";
import {
  ChevronLeft,
  MapPin,
  Smartphone,
  Package,
  Plus,
  Minus,
  Truck,
  Clock,
  Tag,
  PenLine,
  X,
  BadgePercent,
  User,
  Phone,
} from "lucide-react";
import { products as FALLBACK_PRODUCTS, type Product } from "@/lib/data";
import { subscribeProducts, subscribeDeliverySettings, placeOrder, validateCoupon, incrementCouponUsage, type UserAddress, type DeliverySettings, type CouponResult } from "@/lib/supabase";
import { OrderPlaced } from "@/components/OrderPlaced";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const { cart, totalItems, removeFromCart, addToCart, clearCart } = useCart();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState<"upi" | "cod">("upi");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [landmark, setLandmark] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [placed, setPlaced] = useState(false);
  const [placedDetails, setPlacedDetails] = useState<{ label: string; value: string }[]>([]);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings | null>(null);

  const savedAddresses: UserAddress[] = profile?.addresses ?? [];

  /* Pre-select default address when profile/addresses first load */
  useEffect(() => {
    if (savedAddresses.length > 0 && !selectedAddressId) {
      const def = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
      setSelectedAddressId(def.id);
      setAddress(def.line1);
      setPincode(def.pincode);
      setLandmark(def.landmark ?? "");
    }
  // Re-run when uid changes (login after mount) or address count changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid, savedAddresses.length]);

  /* Prefill contact details from the signed-in profile (without clobbering edits) */
  useEffect(() => {
    const pn = profile?.name;
    const pp = profile?.phone;
    if (pn) setName((n) => n || pn);
    if (pp) setPhone((p) => p || pp);
  }, [profile?.uid, profile?.name, profile?.phone]);

  useEffect(() => {
    const unsubP = subscribeProducts((docs) => {
      if (docs.length > 0) setProducts(docs as Product[]);
    });
    const unsubS = subscribeDeliverySettings(setDeliverySettings);
    return () => { unsubP(); unsubS(); };
  }, []);

  const handleSelectAddress = (addr: UserAddress) => {
    setSelectedAddressId(addr.id);
    setAddress(addr.line1);
    setPincode(addr.pincode);
    setLandmark(addr.landmark ?? "");
    setManualMode(false);
  };

  const handleAddNew = () => {
    setSelectedAddressId(null);
    setAddress("");
    setPincode("");
    setLandmark("");
    setManualMode(true);
  };

  const cartItems = Object.entries(cart)
    .map(([id, qty]) => {
      const product = products.find((p) => p.id === id);
      return product ? { ...product, qty } : null;
    })
    .filter(Boolean) as (Product & { qty: number })[];

  // Use live product prices from Supabase, not the static fallback from CartContext
  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);

  const freeAbove = deliverySettings?.freeAbove ?? 299;
  const baseFee   = deliverySettings?.fee ?? 30;
  const deliveryFee = cartSubtotal >= freeAbove ? 0 : baseFee;
  const discount = coupon?.valid ? coupon.discountAmount : 0;
  const orderTotal = Math.max(0, cartSubtotal + deliveryFee - discount);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    const result = await validateCoupon(couponCode, cartSubtotal + deliveryFee);
    setCoupon(result);
    if (!result.valid) setCouponError(result.error ?? "Invalid coupon");
    setCouponLoading(false);
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponCode("");
    setCouponError(null);
  };

  // Parse litres from product size string e.g. "5L" → 5, "500ml" → 0.5
  const parseLitres = (size: string): number => {
    const s = size?.toLowerCase() ?? "";
    const ml = s.match(/(\d+(?:\.\d+)?)\s*ml/);
    if (ml) return parseFloat(ml[1]) / 1000;
    const l = s.match(/(\d+(?:\.\d+)?)\s*l/);
    if (l) return parseFloat(l[1]);
    return 0;
  };

  const phoneDigits = phone.replace(/\D/g, "");
  const contactValid = name.trim().length >= 2 && phoneDigits.length >= 10;
  const addressValid = address.trim().length > 0 && pincode.trim().length === 6;
  const canPlace = contactValid && addressValid;

  const handlePlaceOrder = async () => {
    if (!canPlace) return;
    setPlacing(true);
    setPlaceError(null);
    const itemsSummary = cartItems.map((item) => `${item.name} × ${item.qty}`).join(", ");
    const totalLitres = cartItems.reduce((sum, item) => sum + parseLitres(item.size) * item.qty, 0);
    const fullAddress = [address.trim(), pincode.trim(), landmark.trim()]
      .filter(Boolean)
      .join(", ");
    try {
      const orderId = await placeOrder({
        userId: profile?.uid ?? "guest",
        customer: name.trim(),
        phone: phoneDigits,
        items: itemsSummary,
        total: orderTotal,
        payment: paymentMethod,
        address: fullAddress,
        litres: +totalLitres.toFixed(2),
        orderType: "cart",
      });
      if (!orderId) throw new Error("Order could not be placed. Please try again.");
      if (coupon?.valid) await incrementCouponUsage(coupon.code);
      setPlacedDetails([
        { label: "Items",      value: itemsSummary },
        { label: "Amount",     value: `₹${orderTotal.toFixed(0)}` },
        { label: "Payment",    value: paymentMethod === "cod" ? "Cash on Delivery" : "UPI / Online" },
        { label: "Deliver to", value: fullAddress },
      ]);
      clearCart();
      setPlaced(true);
    } catch (err) {
      setPlaceError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPlacing(false);
    }
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
          <p className="text-sm text-muted-foreground mt-1">
            Add some products before checking out.
          </p>
        </div>
        <Button
          onClick={() => navigate({ to: "/products" })}
          className="rounded-2xl px-8 h-11 font-extrabold"
        >
          Shop Now
        </Button>
      </div>
    );
  }

  /* ── Success ── */
  if (placed) {
    return (
      <OrderPlaced
        tab="cart"
        title="Order Placed!"
        subtitle="Your water is on its way 💧"
        details={placedDetails}
        note={
          deliverySettings?.etaMins
            ? `Estimated delivery within ${deliverySettings.etaMins} mins. You'll get a call before delivery.`
            : "We'll deliver today. You'll get a call before delivery."
        }
      />
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
        <span className="ml-auto text-xs text-muted-foreground font-medium">
          {totalItems} item{totalItems !== 1 ? "s" : ""}
        </span>
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
            <div
              key={item.id}
              className="flex items-center gap-3 p-4 border-b border-border/40 last:border-0"
            >
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
                <p className="text-[11px] text-muted-foreground">
                  {item.size} · {item.unit}
                </p>
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

        {/* Contact Details */}
        <div className="bg-background rounded-2xl border border-border/40 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-extrabold">Contact Details</h2>
          </div>
          <div className="space-y-2">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                className="w-full bg-muted/50 rounded-xl border border-border/50 pl-9 pr-3 py-2.5 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                aria-label="Full name"
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                className="w-full bg-muted/50 rounded-xl border border-border/50 pl-9 pr-3 py-2.5 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d+ ]/g, "").slice(0, 14))}
                inputMode="tel"
                autoComplete="tel"
                aria-label="Phone number"
              />
            </div>
            {phone.trim().length > 0 && phoneDigits.length < 10 && (
              <p className="text-[11px] text-destructive font-semibold">
                Enter a valid 10-digit mobile number
              </p>
            )}
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-background rounded-2xl border border-border/40 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-extrabold">Delivery Address</h2>
            </div>
            {savedAddresses.length > 0 && (
              <button
                type="button"
                onClick={() => setManualMode((m) => !m)}
                className="flex items-center gap-1 text-xs text-primary font-bold"
              >
                <PenLine className="h-3 w-3" />
                {manualMode ? "Pick saved" : "Enter manually"}
              </button>
            )}
          </div>

          {savedAddresses.length > 0 && !manualMode ? (
            <AddressPicker
              addresses={savedAddresses}
              selectedId={selectedAddressId}
              onSelect={handleSelectAddress}
              onAddNew={handleAddNew}
            />
          ) : (
            <>
              {savedAddresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setManualMode(false)}
                  className="mb-3 text-xs text-primary font-bold flex items-center gap-1"
                >
                  ← Use saved address
                </button>
              )}
              <textarea
                className="w-full bg-muted/50 rounded-xl border border-border/50 px-3 py-2.5 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 resize-none"
                placeholder="House / Flat no., Street, Area…"
                rows={2}
                value={address}
                autoComplete="street-address"
                aria-label="Delivery street address"
                onChange={(e) => setAddress(e.target.value)}
              />
              <div className="flex gap-2 mt-2">
                <input
                  className="w-28 bg-muted/50 rounded-xl border border-border/50 px-3 py-2 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                  placeholder="Pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  aria-label="Pincode"
                  maxLength={6}
                />
                <input
                  className="flex-1 bg-muted/50 rounded-xl border border-border/50 px-3 py-2 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                  placeholder="Landmark (optional)"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  autoComplete="off"
                  aria-label="Landmark"
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-2 mt-3 p-3 bg-primary/8 rounded-xl">
            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
            <p className="text-xs font-semibold text-primary">
              Estimated delivery: <span className="font-extrabold">
                {deliverySettings?.etaMins ? `Within ${deliverySettings.etaMins} mins` : "Today"}
              </span>
            </p>
          </div>
        </div>

        {/* Coupon Code */}
        <div className="bg-background rounded-2xl border border-border/40 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <BadgePercent className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-extrabold">Coupon Code</h2>
          </div>
          {coupon?.valid ? (
            <div className="flex items-center justify-between bg-success/10 border border-success/30 rounded-xl px-3 py-2.5">
              <div>
                <p className="text-sm font-extrabold text-success">{coupon.code} applied!</p>
                <p className="text-xs text-success/80 font-medium">
                  {coupon.discountType === "percent" ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`} off — saving ₹{coupon.discountAmount.toFixed(0)}
                </p>
              </div>
              <button onClick={removeCoupon} className="p-1 rounded-lg hover:bg-success/20 text-success">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={couponCode}
                onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                placeholder="Enter coupon code"
                className="flex-1 bg-muted/50 rounded-xl border border-border/50 px-3 py-2 text-sm font-medium uppercase placeholder:normal-case placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
              <Button onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()} variant="outline"
                className="rounded-xl font-extrabold px-4 border-primary/40 text-primary">
                {couponLoading ? "..." : "Apply"}
              </Button>
            </div>
          )}
          {couponError && <p className="text-xs text-destructive font-semibold mt-2">{couponError}</p>}
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
                id: "upi" as const,
                icon: Smartphone,
                label: "UPI / Net Banking",
                desc: deliverySettings?.upiId ? `UPI: ${deliverySettings.upiId}` : "PhonePe, GPay, Paytm, and more",
                enabled: deliverySettings?.upiEnabled !== false,
              },
              {
                id: "cod" as const,
                icon: Truck,
                label: "Cash on Delivery",
                desc: "Pay when your order arrives",
                enabled: deliverySettings?.codEnabled !== false,
              },
            ].filter((m) => m.enabled).map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setPaymentMethod(method.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left cursor-pointer ${
                  paymentMethod === method.id
                    ? "border-primary bg-primary/8"
                    : "border-border/40 hover:border-primary/30"
                }`}
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
                    paymentMethod === method.id
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30"
                  }`}
                >
                  {paymentMethod === method.id && <div className="w-2 h-2 rounded-full bg-white" />}
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
              <span className="font-bold">₹{cartSubtotal.toFixed(2)}</span>
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
                Add ₹{Math.max(0, freeAbove - cartSubtotal).toFixed(0)} more for free delivery
              </p>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-success">
                <span className="font-semibold">Coupon ({coupon!.code})</span>
                <span className="font-bold">−₹{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-border/40 pt-2.5 flex justify-between items-baseline">
              <span className="font-extrabold text-base">Total</span>
              <span className="font-extrabold text-primary text-lg">₹{orderTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky place-order CTA */}
      <div className="fixed bottom-[84px] left-1/2 -translate-x-1/2 w-full max-w-md px-4 pb-3 bg-gradient-to-t from-background via-background/90 to-transparent pt-6 z-20">
        {!canPlace && (
          <p className="text-center text-xs text-destructive font-semibold mb-2">
            {!contactValid
              ? "Add your name and a valid 10-digit phone number"
              : "Select or enter a delivery address with a 6-digit pincode"}
          </p>
        )}
        {placeError && (
          <p className="text-center text-xs text-destructive font-semibold mb-2 bg-destructive/10 rounded-xl px-3 py-2">
            {placeError}
          </p>
        )}
        <Button
          onClick={handlePlaceOrder}
          disabled={placing || !canPlace}
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
