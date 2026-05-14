import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AddressPicker } from "@/components/AddressPicker";
import {
  products as FALLBACK_PRODUCTS,
  categories as FALLBACK_CATS,
  type Product,
  type Category,
} from "@/lib/data";
import {
  subscribeProducts,
  subscribeCategories,
  subscribeDeliverySettings,
  createSchedule,
  type UserAddress,
  type DeliverySettings,
} from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { MapPin, Package, CheckCircle2, Droplets, CalendarDays, PenLine } from "lucide-react";
import { CalendarScheduler } from "@/components/CalendarScheduler";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule Delivery — AquaPure Water Delivery" },
      {
        name: "description",
        content:
          "Schedule one-time or recurring water delivery. Choose products, date, time, and address.",
      },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATS);
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings | null>(null);

  useEffect(() => {
    const unsubP = subscribeProducts((docs) => {
      if (docs.length > 0) setProducts(docs as Product[]);
    });
    const unsubC = subscribeCategories((docs) => {
      if (docs.length > 0) setCategories(docs as Category[]);
    });
    const unsubS = subscribeDeliverySettings(setDeliverySettings);
    return () => {
      unsubP();
      unsubC();
      unsubS();
    };
  }, []);

  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [quantity, setQuantity] = useState(1);

  /* Address state */
  const savedAddresses: UserAddress[] = profile?.addresses ?? [];
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [address, setAddress] = useState("");

  /* Pre-select default address */
  useEffect(() => {
    if (savedAddresses.length > 0 && !selectedAddressId) {
      const def = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
      setSelectedAddressId(def.id);
      setAddress(
        [def.line1, def.pincode, def.landmark].filter(Boolean).join(", "),
      );
    }
  }, [savedAddresses.length]);

  const handleSelectAddress = (addr: UserAddress) => {
    setSelectedAddressId(addr.id);
    setAddress([addr.line1, addr.pincode, addr.landmark].filter(Boolean).join(", "));
    setManualMode(false);
  };

  const handleAddNew = () => {
    setSelectedAddressId(null);
    setAddress("");
    setManualMode(true);
  };

  /* Schedule state */
  const [scheduleData, setScheduleData] = useState<{
    date: Date | null;
    frequency: string;
    slot: string;
  }>({
    date: null,
    frequency: "",
    slot: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const filteredProducts =
    selectedCategory === "all" ? products : products.filter((p) => p.category === selectedCategory);

  const selectedProductData = products.find((p) => p.id === selectedProduct);

  const handleConfirm = async () => {
    if (!address.trim() || !selectedProductData || !scheduleData.date) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createSchedule({
        userId: profile?.uid ?? user?.uid ?? "guest",
        customer: profile?.name || user?.displayName || "Guest",
        phone: profile?.phone || user?.phoneNumber || "",
        productId: selectedProductData.id,
        productName: selectedProductData.name,
        quantity,
        frequency: scheduleData.frequency,
        startDate: scheduleData.date.toISOString().split("T")[0],
        timeSlot: scheduleData.slot,
        address: address.trim(),
        total: selectedProductData.price * quantity,
      });
      setSubmitted(true);
    } catch {
      setSubmitError("Failed to save schedule. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-success/10 border-4 border-success/20">
          <CheckCircle2 className="h-12 w-12 text-success" />
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          Delivery Scheduled!
        </h1>
        <p className="mt-3 text-muted-foreground font-medium">Your water is on its way.</p>

        <div className="mt-8 rounded-3xl glass-card p-6 text-left shadow-water border-primary/20">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/50">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Droplets className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">{selectedProductData?.name}</h3>
              <p className="text-xs text-muted-foreground">
                {selectedProductData?.size} × {quantity}
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frequency</span>
              <span className="font-bold text-primary">{scheduleData.frequency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Starting On</span>
              <span className="font-medium text-foreground">
                {scheduleData.date?.toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time Slot</span>
              <span className="font-medium text-foreground">{scheduleData.slot}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address</span>
              <span className="font-medium text-foreground text-right max-w-[60%] truncate">{address}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-border/50 flex justify-between">
              <span className="font-bold text-foreground">Total per delivery</span>
              <span className="font-extrabold text-primary">
                ₹{((selectedProductData?.price || 0) * quantity).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <Button
          variant="hero"
          size="lg"
          className="mt-8 w-full rounded-full h-14 text-base shadow-water"
          onClick={() => {
            setSubmitted(false);
            setStep(1);
            setSelectedProduct(null);
          }}
        >
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-24 sm:pb-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-foreground">Schedule Delivery</h1>
        <p className="mt-2 text-muted-foreground">Set up your automated hydration</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-10 flex justify-center">
        <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-full">
          {[
            { num: 1, icon: Package },
            { num: 2, icon: CalendarDays },
            { num: 3, icon: MapPin },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm transition-all duration-300 ${
                  step === s.num
                    ? "bg-foreground text-background shadow-md scale-110"
                    : step > s.num
                      ? "bg-primary/20 text-primary"
                      : "bg-transparent text-muted-foreground"
                }`}
              >
                {step > s.num ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <s.icon className="h-4 w-4" />
                )}
              </div>
              {i < 2 && (
                <div
                  className={`w-8 h-[2px] mx-1 rounded-full ${step > s.num ? "bg-primary/40" : "bg-border"}`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="relative glass-card rounded-[2rem] p-6 sm:p-8 shadow-water-lg border-primary/10">
        {/* Step 1: Product */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold mb-6 text-foreground">What do you need?</h2>

            <div className="mb-6 flex overflow-x-auto pb-2 no-scrollbar gap-2">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors shrink-0 ${
                  selectedCategory === "all"
                    ? "bg-foreground text-background"
                    : "bg-muted text-foreground"
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors shrink-0 ${
                    selectedCategory === c.id
                      ? "bg-foreground text-background"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 no-scrollbar">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProduct(p.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedProduct === p.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${selectedProduct === p.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
                  >
                    <Droplets className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground truncate">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {p.size} • {p.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-primary">₹{p.price.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            {selectedProduct && (
              <div className="mt-8 pt-6 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3 bg-muted p-1 rounded-xl">
                  <button
                    className="w-10 h-10 rounded-lg flex items-center justify-center bg-background shadow-sm text-foreground"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-bold">{quantity}</span>
                  <button
                    className="w-10 h-10 rounded-lg flex items-center justify-center bg-background shadow-sm text-foreground"
                    onClick={() => setQuantity(Math.min(99, quantity + 1))}
                  >
                    +
                  </button>
                </div>
                <Button
                  variant="hero"
                  className="rounded-xl px-8 h-12 shadow-water"
                  onClick={() => setStep(2)}
                >
                  Next Step
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold mb-6 text-foreground">When to deliver?</h2>
            <CalendarScheduler
              onScheduleSelect={(data) => {
                setScheduleData(data);
                setStep(3);
              }}
              frequencies={deliverySettings?.frequencies}
              timeSlots={deliverySettings?.timeSlots}
            />
            <div className="mt-4 text-center">
              <button
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setStep(1)}
              >
                Back to product
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Address */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold mb-2 text-foreground">Where to deliver?</h2>

            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> Delivery Address
                  </label>
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
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter full address, apartment number, landmark..."
                      className="w-full rounded-2xl border-2 border-border/50 bg-background/50 px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-0 min-h-[100px] resize-none"
                    />
                  </>
                )}
              </div>

              <div className="rounded-2xl bg-primary/5 border border-primary/20 p-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Total per delivery</span>
                  <span className="text-2xl font-extrabold text-foreground">
                    ₹{((selectedProductData?.price || 0) * quantity).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-primary font-medium">Pay via UPI or Cash on Delivery</p>
              </div>

              {submitError && (
                <div className="flex items-start gap-2 bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-3">
                  <span className="text-destructive text-base shrink-0 mt-0.5">⚠</span>
                  <p className="text-xs font-semibold text-destructive">{submitError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="rounded-xl h-14 w-14 p-0 flex items-center justify-center shrink-0"
                  onClick={() => setStep(2)}
                  disabled={submitting}
                >
                  <CalendarDays className="h-5 w-5" />
                </Button>
                <Button
                  variant="hero"
                  className="flex-1 rounded-xl h-14 text-base shadow-water"
                  disabled={!address.trim() || submitting}
                  onClick={handleConfirm}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Scheduling…
                    </span>
                  ) : (
                    "Confirm Schedule"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
