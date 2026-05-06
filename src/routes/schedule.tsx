import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { products, categories } from "@/lib/data";
import { CalendarDays, MapPin, Package, Clock, CheckCircle2, Droplets } from "lucide-react";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule Delivery — AquaPure Water Delivery" },
      { name: "description", content: "Schedule one-time or recurring water delivery. Choose products, date, time, and address." },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const [step, setStep] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState("weekly");
  const [submitted, setSubmitted] = useState(false);

  const filteredProducts = selectedCategory === "all"
    ? products
    : products.filter((p) => p.category === selectedCategory);

  const selectedProductData = products.find((p) => p.id === selectedProduct);

  const timeSlots = [
    "6:00 AM - 8:00 AM",
    "8:00 AM - 10:00 AM",
    "10:00 AM - 12:00 PM",
    "12:00 PM - 2:00 PM",
    "2:00 PM - 4:00 PM",
    "4:00 PM - 6:00 PM",
    "6:00 PM - 8:00 PM",
  ];

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-10 w-10 text-success" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Delivery Scheduled!</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Your {selectedProductData?.name} ({quantity}x) will be delivered on {selectedDate} during {selectedTime}.
        </p>
        {isRecurring && (
          <p className="mt-2 text-sm text-primary font-medium">
            Recurring {frequency} delivery has been set up.
          </p>
        )}
        <div className="mt-8 rounded-xl bg-muted/50 p-6 text-left">
          <h3 className="font-semibold text-foreground mb-3">Delivery Details</h3>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground"><strong className="text-foreground">Product:</strong> {selectedProductData?.name} — {selectedProductData?.size}</p>
            <p className="text-muted-foreground"><strong className="text-foreground">Quantity:</strong> {quantity}</p>
            <p className="text-muted-foreground"><strong className="text-foreground">Address:</strong> {address}</p>
            <p className="text-muted-foreground"><strong className="text-foreground">Total:</strong> ${((selectedProductData?.price || 0) * quantity).toFixed(2)}</p>
          </div>
        </div>
        <Button variant="water" size="lg" className="mt-6" onClick={() => { setSubmitted(false); setStep(1); setSelectedProduct(null); }}>
          Schedule Another Delivery
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Schedule Delivery</h1>
        <p className="mt-1 text-muted-foreground">Plan your water delivery in 3 simple steps</p>
      </div>

      {/* Progress */}
      <div className="mb-8 flex items-center gap-2">
        {[
          { num: 1, label: "Select Product", icon: Package },
          { num: 2, label: "Choose Time", icon: CalendarDays },
          { num: 3, label: "Delivery Address", icon: MapPin },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-2 flex-1">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                step >= s.num
                  ? "gradient-water text-water-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s.num}
            </div>
            <span className={`hidden text-sm sm:block ${step >= s.num ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {s.label}
            </span>
            {i < 2 && <div className={`mx-2 h-px flex-1 ${step > s.num ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Product */}
      {step === 1 && (
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${selectedCategory === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${selectedCategory === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
              >
                {c.icon} {c.name}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((p) => (
              <Card
                key={p.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-water ${
                  selectedProduct === p.id ? "ring-2 ring-primary shadow-water" : ""
                }`}
                onClick={() => setSelectedProduct(p.id)}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <Droplets className="h-8 w-8 shrink-0 text-primary/40" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">{p.size}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">${p.price.toFixed(2)}</span>
                </CardContent>
              </Card>
            ))}
          </div>
          {selectedProduct && (
            <div className="mt-6 flex items-center gap-4">
              <label className="text-sm font-medium text-foreground">Quantity:</label>
              <div className="flex items-center rounded-lg border">
                <button className="px-3 py-1.5 text-foreground hover:bg-accent" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                <span className="px-4 py-1.5 text-sm font-semibold text-foreground border-x">{quantity}</span>
                <button className="px-3 py-1.5 text-foreground hover:bg-accent" onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>
              <Button variant="hero" onClick={() => setStep(2)}>
                Continue
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Date & Time */}
      {step === 2 && (
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> Select Date & Time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Delivery Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Time Slot</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedTime(slot)}
                      className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors ${
                        selectedTime === slot
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "text-foreground hover:bg-accent"
                      }`}
                    >
                      <Clock className="h-4 w-4" />
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary accent-primary"
                  />
                  <span className="text-sm font-medium text-foreground">Make this a recurring delivery</span>
                </label>
                {isRecurring && (
                  <div className="mt-3 flex gap-2">
                    {["daily", "weekly", "bi-weekly", "monthly"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setFrequency(f)}
                        className={`rounded-full px-3 py-1 text-sm capitalize transition-colors ${
                          frequency === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button
                  variant="hero"
                  disabled={!selectedDate || !selectedTime}
                  onClick={() => setStep(3)}
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Address */}
      {step === 3 && (
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Delivery Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Full Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your complete delivery address..."
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                />
              </div>

              {/* Summary */}
              <div className="rounded-xl bg-muted/50 p-5">
                <h3 className="font-semibold text-foreground mb-3">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Product</span>
                    <span className="text-foreground font-medium">{selectedProductData?.name} ({selectedProductData?.size})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quantity</span>
                    <span className="text-foreground font-medium">{quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="text-foreground font-medium">{selectedDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time</span>
                    <span className="text-foreground font-medium">{selectedTime}</span>
                  </div>
                  {isRecurring && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recurring</span>
                      <span className="text-primary font-medium capitalize">{frequency}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="text-lg font-bold text-primary">${((selectedProductData?.price || 0) * quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button
                  variant="hero"
                  size="lg"
                  disabled={!address.trim()}
                  onClick={() => setSubmitted(true)}
                  className="flex-1"
                >
                  Confirm Delivery
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
