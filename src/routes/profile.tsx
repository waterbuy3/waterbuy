import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  User, MapPin, CreditCard, Bell, Shield, HelpCircle, ChevronRight,
  LogOut, Package, Star, Droplets, CalendarDays, Gift, Share2, Repeat,
  Flame, Trophy, Plus, Trash2, Copy, CheckCircle2, X,
  Phone, Mail, Lock, Smartphone, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose,
} from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — AquaPure Water Delivery" },
      { name: "description", content: "Manage your account, addresses, and settings." },
    ],
  }),
  component: ProfilePage,
});

/* ─── Mock data ──────────────────────────────────────────────────────────── */

const MOCK_ORDERS = [
  { id: "ORD-4821", date: "Today, 10:30 AM",     status: "Delivered",   items: "2×20L Cans",    total: 499 },
  { id: "ORD-4803", date: "Yesterday, 4:00 PM",  status: "Delivered",   items: "1×5L Bottle",   total: 89  },
  { id: "ORD-4777", date: "May 3, 2:00 PM",      status: "Delivered",   items: "4×1L Bottles",  total: 160 },
  { id: "ORD-4750", date: "Apr 29, 11:00 AM",    status: "Delivered",   items: "1×20L Tanker",  total: 299 },
];

const MOCK_ADDRESSES = [
  { id: "a1", tag: "Home",   address: "12/3, Green Valley, Block A, Hyderabad – 500001", default: true  },
  { id: "a2", tag: "Office", address: "Floor 4, Tech Park, HITEC City, Hyderabad – 500081", default: false },
];

const MOCK_PAYMENTS = [
  { id: "p1", type: "upi",  label: "traitsoftwares@oksbi",   icon: Smartphone },
  { id: "p2", type: "card", label: "•••• •••• •••• 4242",    icon: CreditCard  },
];

const FAQ_ITEMS = [
  { q: "How do I track my order?",              a: "Go to My Orders → tap the order to see live status and driver location." },
  { q: "Can I change my delivery address?",     a: "Yes — tap Manage Addresses in your profile to add or update addresses." },
  { q: "What if I missed my delivery?",         a: "Call us at 1800-AQUA-PURE. We'll reschedule at no extra charge within 24 hours." },
  { q: "How do subscription plans work?",       a: "Choose a plan, set your schedule, and we'll deliver automatically. Pause or cancel anytime." },
  { q: "Is the water certified safe?",          a: "Yes — all our water is BIS-certified, RO+UV purified, and tested daily at our facilities." },
];

/* ─── Component ─────────────────────────────────────────────────────────── */

type SheetId =
  | "orders" | "addresses" | "payments" | "notifications"
  | "privacy" | "help" | "refer" | null;

function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [activeSheet, setActiveSheet]     = useState<SheetId>(null);
  const [addresses, setAddresses]         = useState(MOCK_ADDRESSES);
  const [newAddress, setNewAddress]       = useState("");
  const [newTag, setNewTag]               = useState("Home");
  const [addingAddress, setAddingAddress] = useState(false);
  const [copied, setCopied]               = useState(false);
  const [openFaq, setOpenFaq]             = useState<number | null>(null);
  const [notifs, setNotifs]               = useState({
    delivery: true, offers: true, reminders: true, newsletter: false,
  });

  const displayName = profile?.name || user?.displayName || "Guest";
  const phone       = profile?.phone || user?.phoneNumber || "";
  const email       = profile?.email || user?.email || "";
  const initials    = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const photoURL    = profile?.photoURL || user?.photoURL || "";
  const referralCode = profile?.referralCode || "AQUA-DEMO";

  const userStats = [
    { icon: Package,  value: String(profile?.ordersCount     ?? 0),  label: "Orders"    },
    { icon: Droplets, value: `${profile?.litresDelivered ?? 0}L`,    label: "Delivered" },
    { icon: Flame,    value: String(profile?.streak          ?? 0),  label: "Streak"    },
    { icon: Star,     value: "4.9",                                  label: "Rating"    },
  ];

  const settingsGroups = [
    {
      title: "Account",
      items: [
        { icon: Package,    label: "My Orders",        desc: "View past and active orders",    sheet: "orders"    as SheetId },
        { icon: MapPin,     label: "Manage Addresses", desc: "Add or edit delivery locations",  sheet: "addresses" as SheetId },
        { icon: CreditCard, label: "Payment Methods",  desc: "Cards, UPI",                      sheet: "payments"  as SheetId },
      ],
    },
    {
      title: "Preferences",
      items: [
        { icon: Bell,   label: "Notifications",      desc: "Delivery alerts and offers",       sheet: "notifications" as SheetId },
        { icon: Shield, label: "Privacy & Security", desc: "Password and security settings",   sheet: "privacy"       as SheetId },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help & Support", desc: "FAQs and customer care",            sheet: "help"  as SheetId },
        { icon: Share2,     label: "Refer & Earn",   desc: "Get ₹50 for every friend",          sheet: "refer" as SheetId, badge: "₹50 reward" },
      ],
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const copyReferral = () => {
    navigator.clipboard?.writeText(referralCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "AquaPure – Premium Water Delivery",
        text: `Use my referral code ${referralCode} and get ₹50 off your first order! Download AquaPure now.`,
        url: "https://aquapure.app",
      }).catch(() => {});
    } else {
      copyReferral();
    }
  };

  const removeAddress = (id: string) =>
    setAddresses((prev) => prev.filter((a) => a.id !== id));

  const addAddress = () => {
    if (!newAddress.trim()) return;
    setAddresses((prev) => [
      ...prev,
      { id: `a${Date.now()}`, tag: newTag, address: newAddress.trim(), default: false },
    ]);
    setNewAddress("");
    setAddingAddress(false);
  };

  /* ── Render ── */
  return (
    <div className="bg-muted/20 min-h-screen pb-28">

      {/* Profile Hero */}
      <div className="bg-gradient-to-br from-primary to-water px-4 pt-8 pb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg viewBox="0 0 300 160" className="w-full h-full">
            <circle cx="260" cy="20"  r="100" fill="white" />
            <circle cx="20"  cy="140" r="70"  fill="white" />
          </svg>
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="relative">
            {photoURL ? (
              <img
                src={photoURL} alt={displayName}
                width={72} height={72}
                className="w-[72px] h-[72px] rounded-2xl object-cover border-2 border-white/30 shadow-lg"
              />
            ) : (
              <div className="w-[72px] h-[72px] rounded-2xl bg-white/20 backdrop-blur border-2 border-white/30 flex items-center justify-center shadow-lg">
                <span className="text-2xl font-extrabold text-white">
                  {initials || <User className="h-8 w-8 text-white" />}
                </span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success border-2 border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-white tracking-tight truncate">{displayName}</h1>
            {phone && <p className="text-sm text-white/80 font-medium">{phone}</p>}
            {email && !phone && <p className="text-sm text-white/80 font-medium truncate">{email}</p>}
            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur">
              <Trophy className="h-3 w-3 text-amber-300" />
              <span className="text-[10px] font-extrabold text-white uppercase tracking-wide">
                {profile?.membershipTier === "prime" ? "Aqua Prime" : "Aqua Member"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mx-4 -mt-4 bg-background rounded-2xl border border-border/40 shadow-water overflow-hidden z-10 relative">
        <div className="grid grid-cols-4 divide-x divide-border/40">
          {userStats.map((s, i) => (
            <div key={i} className="flex flex-col items-center py-4 gap-0.5">
              <s.icon className="h-4 w-4 text-primary mb-0.5" />
              <span className="text-base font-extrabold text-foreground">{s.value}</span>
              <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide text-center">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Active Subscription */}
      <div className="mx-4 mt-4">
        <Link to="/subscriptions">
          <div className="bg-gradient-to-r from-primary to-water rounded-2xl p-4 flex items-center gap-3 shadow-water relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Repeat className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 z-10">
              <span className="text-[10px] font-extrabold text-white/70 uppercase tracking-wider">Active Plan</span>
              <h3 className="text-sm font-extrabold text-white leading-tight">Alternate Days · 2×5L</h3>
              <p className="text-[11px] text-white/75 flex items-center gap-1 mt-0.5">
                <CalendarDays className="h-3 w-3" /> Next: Tomorrow, 7 AM
              </p>
            </div>
            <div className="z-10 text-right">
              <span className="text-base font-extrabold text-white">₹1,299</span>
              <p className="text-[10px] text-white/70">/month</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Referral Banner */}
      {referralCode && (
        <div className="mx-4 mt-3">
          <button
            onClick={() => setActiveSheet("refer")}
            className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-left"
          >
            <div className="h-11 w-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Gift className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-extrabold text-amber-900">Refer & Earn ₹50</h4>
              <p className="text-[11px] text-amber-700 font-medium">
                Code: <span className="font-extrabold tracking-widest">{referralCode}</span>
              </p>
            </div>
            <Share2 className="h-4 w-4 text-amber-600 shrink-0" />
          </button>
        </div>
      )}

      {/* Settings Groups */}
      <div className="px-4 space-y-5 mt-5">
        {settingsGroups.map((group, idx) => (
          <div key={idx}>
            <h2 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-2 ml-1">
              {group.title}
            </h2>
            <div className="bg-background rounded-2xl border border-border/40 shadow-sm overflow-hidden">
              {group.items.map((item, itemIdx) => {
                const Inner = (
                  <div
                    className={`flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 active:bg-muted/50 transition-colors ${
                      itemIdx !== group.items.length - 1 ? "border-b border-border/40" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{item.label}</h3>
                        <p className="text-[10px] text-muted-foreground font-medium">{item.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(item as { badge?: string }).badge && (
                        <span className="text-[9px] font-extrabold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {(item as { badge: string }).badge}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                  </div>
                );

                if ((item as { link?: string }).link) {
                  return (
                    <Link key={itemIdx} to={(item as unknown as { link: string }).link as "/"}>
                      {Inner}
                    </Link>
                  );
                }
                return (
                  <button
                    key={itemIdx}
                    className="w-full text-left"
                    onClick={() => setActiveSheet((item as { sheet: SheetId }).sheet)}
                  >
                    {Inner}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-destructive/10 text-destructive font-bold text-sm hover:bg-destructive/20 active:bg-destructive/30 transition-colors border border-destructive/20"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>

      {/* ──────────────── SHEETS ──────────────── */}

      {/* My Orders */}
      <Sheet open={activeSheet === "orders"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto pb-10">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> My Orders
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3">
            {MOCK_ORDERS.map((order) => (
              <div key={order.id} className="bg-muted/40 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Droplets className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-foreground">{order.id}</span>
                    <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{order.items}</p>
                  <p className="text-[10px] text-muted-foreground">{order.date}</p>
                </div>
                <span className="text-sm font-extrabold text-foreground shrink-0">₹{order.total}</span>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Manage Addresses */}
      <Sheet open={activeSheet === "addresses"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto pb-10">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" /> Manage Addresses
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3">
            {addresses.map((addr) => (
              <div key={addr.id} className="bg-muted/40 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-extrabold">{addr.tag}</span>
                    {addr.default && (
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Default</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{addr.address}</p>
                </div>
                <button
                  onClick={() => removeAddress(addr.id)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors shrink-0"
                >
                  <Trash2 className="h-4 w-4 text-destructive/60" />
                </button>
              </div>
            ))}

            {addingAddress ? (
              <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
                <div className="flex gap-2">
                  {["Home", "Office", "Other"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setNewTag(t)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                        newTag === t ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <textarea
                  className="w-full bg-background rounded-xl border border-border/50 px-3 py-2.5 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 resize-none"
                  placeholder="Enter full address…"
                  rows={2}
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 rounded-xl" onClick={() => setAddingAddress(false)}>Cancel</Button>
                  <Button size="sm" className="flex-1 rounded-xl" onClick={addAddress}>Save</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingAddress(true)}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-primary/30 text-primary text-sm font-bold hover:bg-primary/5 transition-colors"
              >
                <Plus className="h-4 w-4" /> Add New Address
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Payment Methods */}
      <Sheet open={activeSheet === "payments"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto pb-10">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Payment Methods
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3">
            {MOCK_PAYMENTS.map((pm) => (
              <div key={pm.id} className="bg-muted/40 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <pm.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{pm.label}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">{pm.type}</p>
                </div>
                <button className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-4 w-4 text-destructive/60" />
                </button>
              </div>
            ))}
            <button className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-primary/30 text-primary text-sm font-bold hover:bg-primary/5 transition-colors">
              <Plus className="h-4 w-4" /> Add Payment Method
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Notifications */}
      <Sheet open={activeSheet === "notifications"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-10">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" /> Notifications
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-1">
            {[
              { key: "delivery"   as const, label: "Delivery Alerts",     desc: "Live order and delivery updates" },
              { key: "offers"     as const, label: "Offers & Discounts",   desc: "Exclusive deals and promotions"  },
              { key: "reminders"  as const, label: "Subscription Reminders", desc: "Upcoming delivery reminders"  },
              { key: "newsletter" as const, label: "Newsletter",           desc: "Monthly hydration tips"          },
            ].map((n) => (
              <div key={n.key} className="flex items-center justify-between p-4 rounded-2xl hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-sm font-bold">{n.label}</p>
                  <p className="text-[11px] text-muted-foreground">{n.desc}</p>
                </div>
                <Switch
                  checked={notifs[n.key]}
                  onCheckedChange={(v) => setNotifs((prev) => ({ ...prev, [n.key]: v }))}
                />
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Privacy & Security */}
      <Sheet open={activeSheet === "privacy"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto pb-10">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Privacy & Security
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3">
            <div className="bg-muted/40 rounded-2xl divide-y divide-border/40 overflow-hidden">
              {[
                { icon: Phone,  label: "Phone Number",  value: phone  || "Not linked" },
                { icon: Mail,   label: "Email",         value: email  || "Not linked" },
                { icon: Lock,   label: "Password",      value: "••••••••"             },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">{item.label}</p>
                      <p className="text-sm font-bold">{item.value}</p>
                    </div>
                  </div>
                  <button className="text-xs text-primary font-bold">Edit</button>
                </div>
              ))}
            </div>

            <div className="bg-muted/40 rounded-2xl p-4">
              <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide mb-3">Data & Privacy</h3>
              <div className="space-y-3">
                <button className="w-full text-left text-sm font-bold text-foreground hover:text-primary transition-colors">
                  Download My Data
                </button>
                <button className="w-full text-left text-sm font-bold text-destructive hover:text-destructive/80 transition-colors">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Help & Support */}
      <Sheet open={activeSheet === "help"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[88vh] overflow-y-auto pb-10">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" /> Help & Support
            </SheetTitle>
          </SheetHeader>

          {/* Contact options */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { icon: Phone,    label: "Call Us",    sub: "1800-AQUA-PURE", color: "bg-green-50 border-green-200 text-green-700" },
              { icon: Mail,     label: "Email",      sub: "support@aquapure.in", color: "bg-blue-50 border-blue-200 text-blue-700"  },
            ].map((c, i) => (
              <div key={i} className={`rounded-2xl border p-4 flex flex-col items-center gap-2 text-center ${c.color}`}>
                <c.icon className="h-5 w-5" />
                <div>
                  <p className="text-xs font-extrabold">{c.label}</p>
                  <p className="text-[10px] font-medium opacity-75">{c.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* FAQ accordion */}
          <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3">FAQs</h3>
          <div className="space-y-2">
            {FAQ_ITEMS.map((faq, i) => (
              <div key={i} className="bg-muted/40 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="text-sm font-bold pr-4">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp   className="h-4 w-4 text-primary shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  }
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 -mt-1">
                    <p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Refer & Earn */}
      <Sheet open={activeSheet === "refer"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-10">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-500" /> Refer & Earn
            </SheetTitle>
          </SheetHeader>

          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-3xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Gift className="h-10 w-10 text-amber-600" />
            </div>
            <h3 className="text-lg font-extrabold">Invite Friends, Earn ₹50</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
              For every friend who places their first order, you both get ₹50 off your next order.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
            <p className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest mb-2">Your Referral Code</p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-extrabold text-amber-900 tracking-widest">{referralCode}</span>
              <button
                onClick={copyReferral}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-200 text-amber-800 text-xs font-extrabold hover:bg-amber-300 transition-colors"
              >
                {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <Button
            onClick={handleNativeShare}
            className="w-full h-12 rounded-2xl font-extrabold bg-amber-500 hover:bg-amber-600 text-white border-0"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share with Friends
          </Button>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { value: "₹50",  label: "You earn" },
              { value: "₹50",  label: "They earn" },
              { value: "∞",    label: "No limit"  },
            ].map((s, i) => (
              <div key={i} className="bg-muted/40 rounded-xl p-3">
                <p className="text-lg font-extrabold text-amber-600">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
