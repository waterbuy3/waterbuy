import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  MapPin, Bell, Shield, HelpCircle, ChevronRight,
  ChevronLeft, LogOut, Package, Star, Droplets, CalendarDays, Gift,
  Share2, Repeat, Flame, Trophy, Plus, Trash2, Copy, CheckCircle2,
  Phone, Mail, Lock, Smartphone, ChevronDown, ChevronUp, Check,
  AlertCircle, Send, MessageCircle, LifeBuoy, Wallet, Clock, Truck,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import {
  saveUserAddress,
  deleteUserAddress,
  setDefaultAddress,
  subscribeUserOrders,
  subscribeUserSchedules,
  setUserActivePlan,
  sendSupportMessage,
  subscribeUserSupportMessages,
  subscribeNotifications,
  markNotificationsRead,
  setUserSchedulesStatus,
  cancelUserSubscriptionOrders,
  type UserAddress,
  type AppNotification,
} from "@/lib/supabase";

export const Route = createFileRoute("/profile")({
  validateSearch: (search: Record<string, unknown>) => ({
    sheet: typeof search.sheet === "string" ? (search.sheet as string) : undefined,
    tab: typeof search.tab === "string" ? (search.tab as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Profile — AquaPure Water Delivery" },
      { name: "description", content: "Manage your account, addresses, and settings." },
    ],
  }),
  component: ProfilePage,
});

const SUPPORT_EMAIL = "support@aquapure.in";
const SUPPORT_PHONE = "1800-AQUA-PURE";

const FAQ_ITEMS = [
  { q: "How do I track my order?", a: "Open My Orders, tap any order to see its live status timeline — placed, confirmed, out for delivery, delivered." },
  { q: "Can I change my delivery address?", a: "Yes — tap Manage Addresses to add, edit, or set a default address. You can also enter a fresh address at checkout." },
  { q: "What if I missed my delivery?", a: `Call us at ${SUPPORT_PHONE}. We'll reschedule at no extra charge within 24 hours.` },
  { q: "How do subscription plans work?", a: "Choose a plan, set your schedule, and we deliver automatically. Pause, resume, or cancel anytime from this page." },
  { q: "Is the water certified safe?", a: "Yes — all our water is BIS-certified, RO+UV purified, and tested daily at our facilities." },
  { q: "How are refunds handled?", a: "Refunds for cancelled or undelivered orders are processed within 5–7 business days to your original payment method." },
];

const SUPPORT_SUBJECTS = ["General Enquiry", "Order Issue", "Delivery Problem", "Payment Issue", "Subscription Help", "Other"];

type SheetId =
  | "orders" | "addresses" | "payments" | "notifications"
  | "privacy" | "help" | "refer" | null;

interface OrderRecord {
  id: string;
  date: string;
  status: string;
  items: string;
  total: number;
  payment?: string;
  address?: string;
  orderType: "cart" | "subscription" | "schedule";
}

interface ScheduleRecord {
  id: string;
  productName: string;
  quantity: number;
  frequency: string;
  startDate: string;
  timeSlot: string;
  address: string;
  total: number;
  status: string;
  createdAt: string;
}

const ORDER_STEPS = [
  { key: "pending",    label: "Order Placed",    icon: Package },
  { key: "confirmed",  label: "Confirmed",        icon: CheckCircle2 },
  { key: "in_transit", label: "Out for Delivery", icon: Truck },
  { key: "delivered",  label: "Delivered",        icon: Droplets },
] as const;

const statusColor: Record<string, string> = {
  pending:    "text-amber-600 bg-amber-50",
  confirmed:  "text-blue-600 bg-blue-50",
  in_transit: "text-purple-600 bg-purple-50",
  delivered:  "text-emerald-600 bg-emerald-50",
  cancelled:  "text-red-500 bg-red-50",
  rejected:   "text-rose-600 bg-rose-50",
};

// ─── Local preference store (device-level, SSR-safe — read inside useEffect) ──
const DEFAULT_NOTIF = { delivery: true, offers: true, reminders: true, newsletter: false };
type NotifPrefs = typeof DEFAULT_NOTIF;
const DEFAULT_PAYMENT = { method: "upi" as "upi" | "cod", upiId: "" };
type PaymentPrefs = typeof DEFAULT_PAYMENT;

function loadPrefs<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<T>) } : fallback;
  } catch { return fallback; }
}
function savePrefs(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

function safeParseDate(ts: unknown): string {
  if (!ts) return "—";
  const fmt = (d: Date) =>
    isNaN(d.getTime())
      ? "—"
      : d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  if (typeof ts === "object" && ts !== null && "seconds" in (ts as Record<string, unknown>)) {
    const secs = (ts as Record<string, unknown>).seconds;
    if (typeof secs === "number") return fmt(new Date(secs * 1000));
  }
  if (typeof ts === "string") return fmt(new Date(ts));
  if (ts instanceof Date) return fmt(ts);
  if (typeof ts === "number") return fmt(new Date(ts));
  return "—";
}

function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { sheet: sheetParam, tab: tabParam } = Route.useSearch();

  const [activeSheet, setActiveSheet] = useState<SheetId>(null);
  const [orderTab, setOrderTab] = useState<"cart" | "subscription" | "schedule">("cart");

  // Open sheet / tab from URL search params (e.g. ?sheet=orders&tab=schedule)
  useEffect(() => {
    const valid: SheetId[] = ["orders", "addresses", "payments", "notifications", "privacy", "help", "refer"];
    if (sheetParam && (valid as string[]).includes(sheetParam)) {
      setActiveSheet(sheetParam as SheetId);
    }
    if (tabParam && ["cart", "subscription", "schedule"].includes(tabParam)) {
      setOrderTab(tabParam as "cart" | "subscription" | "schedule");
    }
  }, [sheetParam, tabParam]);

  // Clear search params when sheet closes so deep links re-trigger
  useEffect(() => {
    if (activeSheet === null && (sheetParam || tabParam)) {
      navigate({ to: "/profile", search: { sheet: undefined, tab: undefined }, replace: true });
    }
  }, [activeSheet, sheetParam, tabParam, navigate]);

  // Mark notifications read when that sheet opens
  useEffect(() => {
    if (activeSheet === "notifications" && profile?.uid) {
      markNotificationsRead(profile.uid).catch(() => {});
    }
  }, [activeSheet, profile?.uid]);

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [planAction, setPlanAction] = useState<"cancel" | null>(null);
  const [planActing, setPlanActing] = useState(false);

  /* Address form state */
  const [newLine1, setNewLine1] = useState("");
  const [newPincode, setNewPincode] = useState("");
  const [newLandmark, setNewLandmark] = useState("");
  const [newTag, setNewTag] = useState<"Home" | "Work" | "Other">("Home");
  const [newDefault, setNewDefault] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [privacyInfo, setPrivacyInfo] = useState<string | null>(null);

  /* Device preferences — loaded from localStorage after mount */
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF);
  const [payPrefs, setPayPrefs] = useState<PaymentPrefs>(DEFAULT_PAYMENT);
  const [savedPayToast, setSavedPayToast] = useState(false);
  useEffect(() => {
    setNotifPrefs(loadPrefs("aqp-notif-prefs", DEFAULT_NOTIF));
    setPayPrefs(loadPrefs("aqp-payment-prefs", DEFAULT_PAYMENT));
  }, []);
  const updateNotif = (key: keyof NotifPrefs, val: boolean) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: val };
      savePrefs("aqp-notif-prefs", next);
      return next;
    });
  };
  const updatePayment = (patch: Partial<PaymentPrefs>) => {
    setPayPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePrefs("aqp-payment-prefs", next);
      return next;
    });
    setSavedPayToast(true);
    setTimeout(() => setSavedPayToast(false), 1800);
  };

  /* Notifications + support */
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const unreadCount = appNotifications.filter((n) => !n.read).length;

  interface SupportMsg { id: string; message: string; admin_reply: string | null; created_at: string; status: string; subject?: string; }
  const [supportMsgs, setSupportMsgs] = useState<SupportMsg[]>([]);
  const [supportInput, setSupportInput] = useState("");
  const [supportSubject, setSupportSubject] = useState(SUPPORT_SUBJECTS[0]);
  const [sendingSupport, setSendingSupport] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsubN = subscribeNotifications(profile.uid, setAppNotifications);
    const unsubS = subscribeUserSupportMessages(profile.uid, (msgs) => setSupportMsgs(msgs as SupportMsg[]));
    return () => { unsubN(); unsubS(); };
  }, [profile?.uid]);

  const displayName = profile?.name || user?.displayName || "Guest";
  const phone = profile?.phone || user?.phoneNumber || "";
  const email = profile?.email || user?.email || "";
  const initials = displayName.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const photoURL = profile?.photoURL || user?.photoURL || "";
  const referralCode = profile?.referralCode || "AQUA-DEMO";
  const addresses: UserAddress[] = profile?.addresses ?? [];
  const isPrime = profile?.membershipTier === "prime";

  /* Realtime orders + schedules */
  useEffect(() => {
    if (!profile?.uid) return;
    setOrdersLoading(true);
    const unsubOrders = subscribeUserOrders(profile.uid, (docs) => {
      const mapped = (docs as Record<string, unknown>[]).map((d) => ({
        id: String(d.id ?? ""),
        date: safeParseDate(d.placed_at),
        status: String(d.status ?? "pending"),
        items: String(d.items ?? ""),
        total: Number(d.total ?? 0),
        payment: String(d.payment ?? ""),
        address: String(d.address ?? ""),
        orderType: (d.order_type as "cart" | "subscription" | "schedule") ?? "cart",
      }));
      setOrders(mapped);
      setOrdersLoading(false);
      setSelectedOrder((prev) => prev ? (mapped.find((o) => o.id === prev.id) ?? prev) : null);
    });
    const unsubSchedules = subscribeUserSchedules(profile.uid, (docs) => {
      const mapped = (docs as Record<string, unknown>[]).map((d) => ({
        id: String(d.id ?? ""),
        productName: String(d.product_name ?? ""),
        quantity: Number(d.quantity ?? 1),
        frequency: String(d.frequency ?? ""),
        startDate: String(d.start_date ?? ""),
        timeSlot: String(d.time_slot ?? ""),
        address: String(d.address ?? ""),
        total: Number(d.total ?? 0),
        status: String(d.status ?? "active"),
        createdAt: String(d.created_at ?? ""),
      }));
      setSchedules(mapped);
    });
    return () => { unsubOrders(); unsubSchedules(); };
  }, [profile?.uid]);

  const cartCount = orders.filter((o) => o.orderType === "cart").length;
  const subCount = orders.filter((o) => o.orderType === "subscription").length;
  const activeOrders = orders.filter((o) => ["pending", "confirmed", "in_transit"].includes(o.status)).length;

  const userStats = [
    { icon: Package, value: String(profile?.ordersCount ?? orders.length ?? 0), label: "Orders", zero: !(profile?.ordersCount || orders.length) },
    { icon: Droplets, value: `${profile?.litresDelivered ?? 0}L`, label: "Delivered", zero: !profile?.litresDelivered },
    { icon: Flame, value: String(profile?.streak ?? 0), label: "Streak", zero: !profile?.streak },
    { icon: Star, value: "4.9", label: "Rating", zero: false },
  ];

  const quickActions = [
    { icon: Package, label: "My Orders", sheet: "orders" as SheetId, tint: "bg-sky-50 text-sky-600", badge: activeOrders },
    { icon: MapPin, label: "Address", sheet: "addresses" as SheetId, tint: "bg-violet-50 text-violet-600", badge: 0 },
    { icon: LifeBuoy, label: "Support", sheet: "help" as SheetId, tint: "bg-emerald-50 text-emerald-600", badge: 0 },
    { icon: Gift, label: "Refer", sheet: "refer" as SheetId, tint: "bg-amber-50 text-amber-600", badge: 0 },
  ];

  const settingsGroups = [
    {
      title: "Account",
      items: [
        { icon: Package, label: "My Orders", desc: `${orders.length} order${orders.length === 1 ? "" : "s"} · ${schedules.length} scheduled`, sheet: "orders" as SheetId },
        { icon: MapPin, label: "Manage Addresses", desc: addresses.length ? `${addresses.length} saved` : "Add a delivery address", sheet: "addresses" as SheetId },
        { icon: Wallet, label: "Payment Preferences", desc: payPrefs.method === "upi" ? "UPI / Online" : "Cash on Delivery", sheet: "payments" as SheetId },
      ],
    },
    {
      title: "Preferences",
      items: [
        { icon: Bell, label: "Notifications", desc: unreadCount ? `${unreadCount} unread` : "Delivery alerts & offers", sheet: "notifications" as SheetId },
        { icon: Shield, label: "Privacy & Security", desc: "Account and data settings", sheet: "privacy" as SheetId },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help & Support", desc: "FAQs, chat, and contact", sheet: "help" as SheetId },
        { icon: Share2, label: "Refer & Earn", desc: "Get ₹50 for every friend", sheet: "refer" as SheetId, badge: "₹50" },
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

  const handleDeleteAddress = async (id: string) => {
    if (!profile?.uid) return;
    await deleteUserAddress(profile.uid, id).catch(() => {});
  };
  const handleSetDefault = async (id: string) => {
    if (!profile?.uid) return;
    await setDefaultAddress(profile.uid, id).catch(() => {});
  };
  const handleAddAddress = async () => {
    if (!newLine1.trim() || !newPincode.trim() || !profile?.uid) return;
    setSavingAddress(true);
    await saveUserAddress(profile.uid, {
      tag: newTag,
      line1: newLine1.trim(),
      pincode: newPincode.trim(),
      landmark: newLandmark.trim() || undefined,
      isDefault: newDefault || addresses.length === 0,
    }).catch(() => {});
    setNewLine1(""); setNewPincode(""); setNewLandmark(""); setNewTag("Home");
    setNewDefault(false); setAddingAddress(false); setSavingAddress(false);
  };

  const handleSendSupport = async () => {
    if (!profile?.uid || !supportInput.trim()) return;
    setSendingSupport(true);
    const ok = await sendSupportMessage({
      userId: profile.uid,
      userName: profile.name || displayName,
      userEmail: email,
      subject: supportSubject,
      message: supportInput.trim(),
    });
    if (ok) setSupportInput("");
    setSendingSupport(false);
  };

  return (
    <div className="bg-muted/20 min-h-screen pb-28">
      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-primary via-water to-primary px-4 pt-8 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.12] pointer-events-none">
          <svg viewBox="0 0 320 200" className="w-full h-full">
            <circle cx="280" cy="20" r="110" fill="white" />
            <circle cx="20" cy="170" r="80" fill="white" />
          </svg>
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="relative shrink-0">
            {photoURL ? (
              <img src={photoURL} alt={displayName} width={72} height={72}
                className="w-[72px] h-[72px] rounded-2xl object-cover border-2 border-white/40 shadow-lg" />
            ) : (
              <div className="w-[72px] h-[72px] rounded-2xl bg-white/20 backdrop-blur border-2 border-white/40 flex items-center justify-center shadow-lg">
                <span className="text-2xl font-extrabold text-white">{initials}</span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success border-2 border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-white tracking-tight truncate">{displayName}</h1>
            {phone && <p className="text-sm text-white/85 font-medium">{phone}</p>}
            {email && <p className="text-xs text-white/65 font-medium truncate">{email}</p>}
            <div className={`mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur ${isPrime ? "bg-amber-300/30" : "bg-white/20"}`}>
              <Trophy className={`h-3 w-3 ${isPrime ? "text-amber-200" : "text-white"}`} />
              <span className="text-[10px] font-extrabold text-white uppercase tracking-wide">
                {isPrime ? "Aqua Prime Member" : "Aqua Member"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats (floating) ── */}
      <div className="mx-4 -mt-10 bg-background rounded-2xl border border-border/40 shadow-water overflow-hidden z-10 relative">
        <div className="grid grid-cols-4 divide-x divide-border/40">
          {userStats.map((s, i) => (
            <div key={i} className="flex flex-col items-center py-4 gap-0.5">
              <s.icon className={`h-4 w-4 mb-0.5 ${s.zero ? "text-muted-foreground/40" : "text-primary"}`} />
              <span className={`text-base font-extrabold ${s.zero ? "text-muted-foreground/50" : "text-foreground"}`}>{s.value}</span>
              <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide text-center">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="px-4 mt-4 grid grid-cols-4 gap-2.5">
        {quickActions.map((qa) => (
          <button
            key={qa.label}
            onClick={() => { if (qa.sheet === "orders") setOrderTab("cart"); setActiveSheet(qa.sheet); }}
            className="bg-background rounded-2xl border border-border/40 shadow-sm py-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
          >
            <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center ${qa.tint}`}>
              <qa.icon className="h-[18px] w-[18px]" />
              {qa.badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-primary text-white text-[9px] font-extrabold rounded-full flex items-center justify-center">
                  {qa.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold text-foreground">{qa.label}</span>
          </button>
        ))}
      </div>

      {/* ── Active Subscription ── */}
      <div className="mx-4 mt-4">
        {profile?.activePlan ? (
          <div className={`rounded-2xl p-4 shadow-water relative overflow-hidden ${profile.activePlan.paused ? "bg-gradient-to-r from-slate-500 to-slate-600" : "bg-gradient-to-r from-primary to-water"}`}>
            <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center gap-3 z-10 relative">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Repeat className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-white/70 uppercase tracking-wider">
                    {profile.activePlan.paused ? "Plan Paused" : "Active Plan"}
                  </span>
                  {profile.activePlan.paused && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-white/20 text-white">PAUSED</span>
                  )}
                </div>
                <h3 className="text-sm font-extrabold text-white leading-tight truncate">{profile.activePlan.planName}</h3>
                <p className="text-[11px] text-white/75 flex items-center gap-1 mt-0.5">
                  <CalendarDays className="h-3 w-3" />{profile.activePlan.frequency}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-base font-extrabold text-white">₹{profile.activePlan.price}</span>
                <p className="text-[10px] text-white/70">/month</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3 z-10 relative">
              <button
                disabled={planActing}
                onClick={async () => {
                  if (!profile?.uid || !profile.activePlan) return;
                  const nowPaused = !profile.activePlan.paused;
                  setPlanActing(true);
                  await Promise.all([
                    setUserActivePlan(profile.uid, { ...profile.activePlan, paused: nowPaused }).catch(() => {}),
                    setUserSchedulesStatus(profile.uid, nowPaused ? "paused" : "active").catch(() => {}),
                  ]);
                  setPlanActing(false);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-extrabold bg-white/20 text-white hover:bg-white/30 transition-colors disabled:opacity-60"
              >
                {profile.activePlan.paused ? "▶ Resume" : "⏸ Pause"}
              </button>
              <button
                disabled={planActing}
                onClick={() => setPlanAction("cancel")}
                className="flex-1 py-2 rounded-xl text-xs font-extrabold bg-white/10 text-white/80 hover:bg-red-500/40 hover:text-white transition-colors disabled:opacity-60"
              >
                ✕ Cancel
              </button>
              <Link to="/subscriptions" className="flex-1">
                <button className="w-full py-2 rounded-xl text-xs font-extrabold bg-white/20 text-white hover:bg-white/30 transition-colors">
                  🔄 Change
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <Link to="/subscriptions">
            <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Repeat className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">No Active Plan</span>
                <h3 className="text-sm font-bold text-foreground leading-tight">Subscribe & save up to 30%</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Tap to explore subscription plans</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            </div>
          </Link>
        )}
      </div>

      {/* Cancel Plan dialog */}
      {planAction === "cancel" && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm px-4"
          style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
          onClick={() => !planActing && setPlanAction(null)}
        >
          <div className="w-full max-w-sm bg-background rounded-3xl p-6 shadow-2xl mb-2" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-base font-extrabold text-foreground mb-1 text-center">Cancel Subscription?</h3>
            <p className="text-sm text-muted-foreground mb-5 text-center leading-relaxed">
              Your plan and all scheduled deliveries will be cancelled immediately. You can resubscribe anytime.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-2xl h-12" onClick={() => setPlanAction(null)}>Keep Plan</Button>
              <Button
                disabled={planActing}
                className="flex-1 rounded-2xl h-12 bg-destructive hover:bg-destructive/90 text-white border-0"
                onClick={async () => {
                  if (!profile?.uid) return;
                  setPlanActing(true);
                  await Promise.all([
                    setUserActivePlan(profile.uid, null).catch(() => {}),
                    setUserSchedulesStatus(profile.uid, "cancelled").catch(() => {}),
                    cancelUserSubscriptionOrders(profile.uid).catch(() => {}),
                  ]);
                  setPlanActing(false);
                  setPlanAction(null);
                }}
              >
                {planActing ? "Cancelling…" : "Yes, Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Referral banner */}
      <div className="mx-4 mt-3">
        <button
          onClick={() => setActiveSheet("refer")}
          className="w-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
        >
          <div className="h-11 w-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Gift className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-extrabold text-amber-900">Refer & Earn ₹50</h4>
            <p className="text-[11px] text-amber-700 font-medium">
              Code <span className="font-extrabold tracking-widest">{referralCode}</span>
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-amber-600 shrink-0" />
        </button>
      </div>

      {/* Settings groups */}
      <div className="px-4 space-y-5 mt-5">
        {settingsGroups.map((group, idx) => (
          <div key={idx}>
            <h2 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-2 ml-1">{group.title}</h2>
            <div className="bg-background rounded-2xl border border-border/40 shadow-sm overflow-hidden">
              {group.items.map((item, itemIdx) => (
                <button
                  key={itemIdx}
                  className="w-full text-left"
                  onClick={() => { if (item.sheet === "orders") setOrderTab("cart"); setActiveSheet(item.sheet); }}
                >
                  <div className={`flex items-center justify-between p-4 hover:bg-muted/30 active:bg-muted/50 transition-colors ${itemIdx !== group.items.length - 1 ? "border-b border-border/40" : ""}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-foreground">{item.label}</h3>
                        <p className="text-[10px] text-muted-foreground font-medium truncate">{item.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(item as { badge?: string }).badge && (
                        <span className="text-[9px] font-extrabold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {(item as { badge: string }).badge}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-destructive/10 text-destructive font-bold text-sm hover:bg-destructive/20 active:bg-destructive/30 transition-colors border border-destructive/20"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>

        <p className="text-center text-[10px] text-muted-foreground/60 font-medium">
          AquaPure · v1.0.0
        </p>
      </div>

      {/* ── My Orders Sheet ── */}
      <Sheet open={activeSheet === "orders"} onOpenChange={(o) => { if (!o) { setActiveSheet(null); setSelectedOrder(null); } }}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] flex flex-col pb-0">
          <SheetHeader className="mb-3 shrink-0">
            <SheetTitle className="flex items-center gap-2">
              {selectedOrder ? (
                <button onClick={() => setSelectedOrder(null)} className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <ChevronLeft className="h-4 w-4" /> Order #{selectedOrder.id.slice(0, 8).toUpperCase()}
                </button>
              ) : (
                <><Package className="h-5 w-5 text-primary" /> My Orders</>
              )}
            </SheetTitle>
          </SheetHeader>

          {!selectedOrder && (
            <div className="flex gap-1 p-1 bg-muted/50 rounded-2xl mb-3 shrink-0">
              {([
                { key: "cart", label: "🛒 Cart", count: cartCount },
                { key: "subscription", label: "🔄 Plans", count: subCount },
                { key: "schedule", label: "📅 Scheduled", count: schedules.length },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setOrderTab(t.key)}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-extrabold transition-all flex items-center justify-center gap-1 ${
                    orderTab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {t.label}
                  {t.count > 0 && (
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${orderTab === t.key ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto pb-6">
            {selectedOrder ? (
              <div className="space-y-5">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                    selectedOrder.orderType === "subscription" ? "bg-indigo-100 text-indigo-700"
                    : selectedOrder.orderType === "schedule" ? "bg-teal-100 text-teal-700"
                    : "bg-sky-100 text-sky-700"
                  }`}>
                    {selectedOrder.orderType === "subscription" ? "🔄 Subscription"
                      : selectedOrder.orderType === "schedule" ? "📅 Scheduled" : "🛒 Cart Order"}
                  </span>
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full capitalize ${statusColor[selectedOrder.status] ?? "text-slate-600 bg-slate-100"}`}>
                    {selectedOrder.status.replace("_", " ")}
                  </span>
                </div>

                {selectedOrder.status !== "cancelled" && selectedOrder.status !== "rejected" && (
                  <div className="relative">
                    <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border/60" />
                    <div className="space-y-4">
                      {ORDER_STEPS.map((step, i) => {
                        const currentIdx = ORDER_STEPS.findIndex((s) => s.key === selectedOrder.status);
                        const done = i <= currentIdx;
                        const active = i === currentIdx;
                        return (
                          <div key={step.key} className="flex items-start gap-4 relative">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all ${
                              done ? "bg-primary text-white shadow-md" : "bg-muted text-muted-foreground border-2 border-border"
                            } ${active ? "ring-2 ring-primary/30 ring-offset-2" : ""}`}>
                              <step.icon className="h-4 w-4" />
                            </div>
                            <div className="pt-1.5">
                              <p className={`text-sm font-bold ${done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                              {active && <p className="text-[11px] text-primary font-medium mt-0.5">Current status</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {selectedOrder.status === "rejected" && (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm text-rose-600 font-medium">
                    This order was rejected by the vendor. Please place a new order or contact support.
                  </div>
                )}
                {selectedOrder.status === "cancelled" && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600 font-medium">
                    This order was cancelled. Contact support if you need help.
                  </div>
                )}

                <div className="bg-muted/40 rounded-2xl p-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">Items</span>
                    <span className="font-semibold text-right">{selectedOrder.items}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-extrabold text-primary">₹{selectedOrder.total}</span>
                  </div>
                  {selectedOrder.payment && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment</span>
                      <span className="font-semibold capitalize">
                        {selectedOrder.payment === "cod" ? "Cash on Delivery" : selectedOrder.payment === "pending" ? "Pending" : selectedOrder.payment.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Placed</span>
                    <span className="font-semibold">{selectedOrder.date}</span>
                  </div>
                  {selectedOrder.address && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground shrink-0">Address</span>
                      <span className="font-semibold text-right">{selectedOrder.address}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => { setActiveSheet("help"); setSelectedOrder(null); }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-border/60 text-sm font-bold text-foreground hover:bg-muted/40 transition-colors"
                >
                  <MessageCircle className="h-4 w-4 text-primary" /> Need help with this order?
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {ordersLoading && [1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl shimmer" />)}

                {!ordersLoading && orderTab === "cart" && (() => {
                  const list = orders.filter((o) => o.orderType === "cart");
                  return list.length === 0 ? (
                    <EmptyState icon={Package} title="No cart orders yet" sub="Shop products and check out to place an order." />
                  ) : list.map((order) => (
                    <OrderRow key={order.id} order={order} onClick={() => setSelectedOrder(order)} tint="bg-sky-100" emoji="🛒" />
                  ));
                })()}

                {!ordersLoading && orderTab === "subscription" && (() => {
                  const list = orders.filter((o) => o.orderType === "subscription");
                  return list.length === 0 ? (
                    <EmptyState icon={Repeat} title="No subscription orders" sub="Subscribe to a plan to see orders here." />
                  ) : list.map((order) => (
                    <OrderRow key={order.id} order={order} onClick={() => setSelectedOrder(order)} tint="bg-indigo-100" emoji="🔄" />
                  ));
                })()}

                {!ordersLoading && orderTab === "schedule" && (
                  schedules.length === 0 ? (
                    <EmptyState icon={CalendarDays} title="No scheduled deliveries" sub="Use Schedule to set up recurring deliveries." />
                  ) : schedules.map((s) => (
                    <div key={s.id} className="bg-muted/40 rounded-2xl p-4 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center shrink-0 text-lg">📅</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-xs font-extrabold">{s.productName}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            s.status === "active" ? "text-emerald-700 bg-emerald-100" : "text-slate-500 bg-slate-100"
                          }`}>{s.status}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Qty {s.quantity} · {s.frequency}</p>
                        <p className="text-[11px] text-muted-foreground">From {s.startDate}{s.timeSlot ? ` · ${s.timeSlot}` : ""}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{s.address}</p>
                      </div>
                      <span className="text-sm font-extrabold text-foreground shrink-0">₹{s.total}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Manage Addresses Sheet ── */}
      <Sheet open={activeSheet === "addresses"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto pb-10">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" /> Manage Addresses
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3">
            {addresses.length === 0 && !addingAddress && (
              <EmptyState icon={MapPin} title="No saved addresses" sub="Add one to speed up checkout." />
            )}
            {addresses.map((addr) => (
              <div key={addr.id} className="bg-muted/40 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs font-extrabold">{addr.tag}</span>
                    {addr.isDefault && (
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Default</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {addr.line1}{addr.pincode ? ` – ${addr.pincode}` : ""}{addr.landmark ? `, near ${addr.landmark}` : ""}
                  </p>
                  {!addr.isDefault && (
                    <button onClick={() => handleSetDefault(addr.id)} className="mt-1.5 text-[10px] font-bold text-primary flex items-center gap-1">
                      <Check className="h-3 w-3" /> Set as default
                    </button>
                  )}
                </div>
                <button onClick={() => handleDeleteAddress(addr.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors shrink-0" aria-label="Delete address">
                  <Trash2 className="h-4 w-4 text-destructive/60" />
                </button>
              </div>
            ))}

            {addingAddress ? (
              <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
                <div className="flex gap-2">
                  {(["Home", "Work", "Other"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setNewTag(t)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                        newTag === t ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground"
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
                <input
                  className="w-full bg-background rounded-xl border border-border/50 px-3 py-2.5 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                  placeholder="House / Flat no., Street, Area…"
                  value={newLine1} onChange={(e) => setNewLine1(e.target.value)} autoComplete="street-address"
                />
                <div className="flex gap-2">
                  <input
                    className="w-28 bg-background rounded-xl border border-border/50 px-3 py-2.5 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                    placeholder="Pincode" value={newPincode}
                    onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric" autoComplete="postal-code" maxLength={6}
                  />
                  <input
                    className="flex-1 bg-background rounded-xl border border-border/50 px-3 py-2.5 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                    placeholder="Landmark (optional)" value={newLandmark} onChange={(e) => setNewLandmark(e.target.value)}
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newDefault} onChange={(e) => setNewDefault(e.target.checked)} className="accent-primary" />
                  <span className="text-xs font-medium text-foreground">Set as default address</span>
                </label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 rounded-xl"
                    onClick={() => { setAddingAddress(false); setNewLine1(""); setNewPincode(""); setNewLandmark(""); }}>
                    Cancel
                  </Button>
                  <Button size="sm" className="flex-1 rounded-xl" disabled={!newLine1.trim() || !newPincode.trim() || savingAddress} onClick={handleAddAddress}>
                    {savingAddress ? "Saving…" : "Save Address"}
                  </Button>
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

      {/* ── Payment Preferences Sheet ── */}
      <Sheet open={activeSheet === "payments"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto pb-10">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" /> Payment Preferences
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Choose the payment method used by default at checkout. You can still switch on any order.
            </p>

            {([
              { id: "upi" as const, icon: Smartphone, label: "UPI / Online", desc: "PhonePe, GPay, Paytm & more" },
              { id: "cod" as const, icon: Truck, label: "Cash on Delivery", desc: "Pay when your order arrives" },
            ]).map((m) => {
              const selected = payPrefs.method === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => updatePayment({ method: m.id })}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                    selected ? "border-primary bg-primary/8" : "border-border/40 hover:border-primary/30"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selected ? "bg-primary" : "bg-muted"}`}>
                    <m.icon className={`h-5 w-5 ${selected ? "text-white" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">{m.label}</p>
                    <p className="text-[11px] text-muted-foreground">{m.desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
                    {selected && <Check className="h-3 w-3 text-white stroke-[3]" />}
                  </div>
                </button>
              );
            })}

            {payPrefs.method === "upi" && (
              <div className="bg-muted/40 rounded-2xl p-4">
                <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                  <Smartphone className="h-3.5 w-3.5" /> Saved UPI ID <span className="text-muted-foreground/60 normal-case font-medium">(optional)</span>
                </label>
                <input
                  value={payPrefs.upiId}
                  onChange={(e) => updatePayment({ upiId: e.target.value.trim() })}
                  placeholder="yourname@bank"
                  autoCapitalize="none"
                  className="w-full bg-background rounded-xl border border-border/50 px-3 py-2.5 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                />
                <p className="text-[11px] text-muted-foreground mt-2">
                  We'll suggest this UPI ID at checkout. Your card/UPI details are never stored — payment happens securely in your bank's app.
                </p>
              </div>
            )}

            {savedPayToast && (
              <div className="flex items-center gap-2 bg-success/10 border border-success/30 rounded-xl px-3 py-2.5">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <p className="text-xs font-bold text-success">Preference saved on this device</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Notifications Sheet ── */}
      <Sheet open={activeSheet === "notifications"} onOpenChange={(o) => { if (!o) setActiveSheet(null); }}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto pb-10">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" /> Notifications
              {unreadCount > 0 && (
                <span className="ml-auto text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-destructive text-white">{unreadCount} new</span>
              )}
            </SheetTitle>
          </SheetHeader>

          {appNotifications.length > 0 ? (
            <div className="mb-4 space-y-2">
              <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest px-1">Recent</p>
              {appNotifications.map((n) => (
                <div key={n.id} className={`flex gap-3 rounded-2xl p-3 border transition-colors ${n.read ? "bg-muted/30 border-border/30" : "bg-primary/5 border-primary/20"}`}>
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Bell className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${n.read ? "text-muted-foreground" : "text-foreground"}`}>{n.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {new Date(n.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-4"><EmptyState icon={Bell} title="No notifications yet" sub="Order updates and offers will appear here." /></div>
          )}

          <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest px-1 mb-2">Preferences</p>
          <div className="bg-muted/30 rounded-2xl divide-y divide-border/40 overflow-hidden">
            {[
              { key: "delivery" as const, label: "Delivery Alerts", desc: "Live order and delivery updates" },
              { key: "offers" as const, label: "Offers & Discounts", desc: "Exclusive deals and promotions" },
              { key: "reminders" as const, label: "Subscription Reminders", desc: "Upcoming delivery reminders" },
              { key: "newsletter" as const, label: "Newsletter", desc: "Monthly hydration tips" },
            ].map((n) => (
              <div key={n.key} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-bold">{n.label}</p>
                  <p className="text-[11px] text-muted-foreground">{n.desc}</p>
                </div>
                <Switch checked={notifPrefs[n.key]} onCheckedChange={(v) => updateNotif(n.key, v)} />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 px-1">Preferences are saved on this device.</p>
        </SheetContent>
      </Sheet>

      {/* ── Privacy & Security Sheet ── */}
      <Sheet open={activeSheet === "privacy"} onOpenChange={(o) => { if (!o) { setActiveSheet(null); setPrivacyInfo(null); } }}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto pb-10">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Privacy & Security
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3">
            {privacyInfo && (
              <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3">
                <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-foreground">{privacyInfo}</p>
              </div>
            )}
            <div className="bg-muted/40 rounded-2xl divide-y divide-border/40 overflow-hidden">
              {[
                { icon: Phone, label: "Phone Number", value: phone || "Not linked" },
                { icon: Mail, label: "Email", value: email || "Not linked" },
                { icon: Lock, label: "Password", value: "••••••••" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wide">{item.label}</p>
                      <p className="text-sm font-bold truncate">{item.value}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPrivacyInfo(`To update your ${item.label.toLowerCase()}, email ${SUPPORT_EMAIL} or call ${SUPPORT_PHONE}.`)}
                    className="text-xs text-primary font-bold flex items-center gap-1 shrink-0"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-muted/40 rounded-2xl p-4">
              <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide mb-3">Data & Privacy</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setPrivacyInfo(`Your data export will be emailed to ${email || "your registered email"} within 48 hours. Email ${SUPPORT_EMAIL} to request it.`)}
                  className="w-full text-left text-sm font-bold text-foreground hover:text-primary transition-colors flex items-center justify-between"
                >
                  Download My Data <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </button>
                <button
                  onClick={() => setPrivacyInfo(`To permanently delete your account, email ${SUPPORT_EMAIL} with the subject "Account Deletion Request". We'll process it within 7 business days.`)}
                  className="w-full text-left text-sm font-bold text-destructive hover:text-destructive/80 transition-colors flex items-center justify-between"
                >
                  Delete Account <ChevronRight className="h-4 w-4 text-destructive/40" />
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Help & Support Sheet ── */}
      <Sheet open={activeSheet === "help"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] flex flex-col pb-0">
          <SheetHeader className="mb-3 shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-primary" /> Help & Support
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
            {/* Contact channels — real links */}
            <div className="grid grid-cols-2 gap-3">
              <a href={`tel:${SUPPORT_PHONE}`}
                className="rounded-2xl border border-green-200 bg-green-50 p-4 flex flex-col items-center gap-1.5 text-center active:scale-95 transition-transform">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-green-700" />
                </div>
                <p className="text-xs font-extrabold text-green-800">Call Us</p>
                <p className="text-[10px] font-medium text-green-600">{SUPPORT_PHONE}</p>
              </a>
              <a href={`mailto:${SUPPORT_EMAIL}`}
                className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex flex-col items-center gap-1.5 text-center active:scale-95 transition-transform">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-700" />
                </div>
                <p className="text-xs font-extrabold text-blue-800">Email Us</p>
                <p className="text-[10px] font-medium text-blue-600 truncate max-w-full">{SUPPORT_EMAIL}</p>
              </a>
            </div>

            {/* Conversation */}
            {supportMsgs.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Your Conversations</p>
                {supportMsgs.map((msg) => {
                  const st = msg.status === "replied" ? "Replied" : msg.status === "closed" ? "Closed" : "Awaiting reply";
                  const stCls = msg.status === "replied" ? "bg-emerald-100 text-emerald-700" : msg.status === "closed" ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-700";
                  return (
                    <div key={msg.id} className="bg-muted/40 rounded-2xl p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wide truncate">
                          {msg.subject || "Support"}
                        </span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 ${stCls}`}>{st}</span>
                      </div>
                      <div className="flex justify-end">
                        <div className="bg-primary text-white text-xs rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%]">
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                          <p className="text-[9px] text-white/60 mt-1 text-right">
                            {msg.created_at ? new Date(msg.created_at).toLocaleDateString() : ""}
                          </p>
                        </div>
                      </div>
                      {msg.admin_reply && (
                        <div className="flex justify-start">
                          <div className="bg-background border border-border/50 text-foreground text-xs rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                            <p className="font-extrabold text-[10px] text-primary mb-0.5">Support Team</p>
                            <p className="whitespace-pre-wrap break-words">{msg.admin_reply}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Compose */}
            <div className="bg-muted/40 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5 text-primary" /> Send us a message
              </p>
              <select
                value={supportSubject}
                onChange={(e) => setSupportSubject(e.target.value)}
                className="w-full bg-background border border-border/50 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/25"
              >
                {SUPPORT_SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <textarea
                value={supportInput}
                onChange={(e) => setSupportInput(e.target.value)}
                placeholder="Describe your issue or question…"
                rows={3}
                className="w-full bg-background border border-border/50 rounded-xl px-3 py-2.5 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 resize-none"
              />
              <Button
                disabled={sendingSupport || supportInput.trim().length < 5}
                onClick={handleSendSupport}
                className="w-full rounded-xl font-extrabold gap-2"
              >
                {sendingSupport ? "Sending…" : <><Send className="h-4 w-4" /> Send Message</>}
              </Button>
            </div>

            {/* FAQs */}
            <div>
              <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-2">Frequently Asked</p>
              <div className="space-y-2">
                {FAQ_ITEMS.map((faq, i) => (
                  <div key={i} className="bg-muted/40 rounded-2xl overflow-hidden">
                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left">
                      <span className="text-sm font-bold pr-4">{faq.q}</span>
                      {openFaq === i ? <ChevronUp className="h-4 w-4 text-primary shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                    </button>
                    {openFaq === i && (
                      <div className="px-4 pb-4 -mt-1">
                        <p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Refer & Earn Sheet ── */}
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
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 mb-4">
            <p className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest mb-2">Your Referral Code</p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-extrabold text-amber-900 tracking-widest">{referralCode}</span>
              <button onClick={copyReferral}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-200 text-amber-800 text-xs font-extrabold hover:bg-amber-300 transition-colors">
                {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <Button onClick={handleNativeShare} className="w-full h-12 rounded-2xl font-extrabold bg-amber-500 hover:bg-amber-600 text-white border-0">
            <Share2 className="h-4 w-4 mr-2" /> Share with Friends
          </Button>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[{ value: "₹50", label: "You earn" }, { value: "₹50", label: "They earn" }, { value: "∞", label: "No limit" }].map((s, i) => (
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

/* ── Small shared bits ── */

function EmptyState({ icon: Icon, title, sub }: { icon: typeof Package; title: string; sub: string }) {
  return (
    <div className="text-center py-10">
      <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
        <Icon className="h-7 w-7 text-muted-foreground/40" />
      </div>
      <p className="text-sm font-bold text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground/70 mt-1">{sub}</p>
    </div>
  );
}

function OrderRow({ order, onClick, tint, emoji }: { order: OrderRecord; onClick: () => void; tint: string; emoji: string }) {
  return (
    <button onClick={onClick} className="w-full bg-muted/40 rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-muted/60 transition-colors">
      <div className={`w-10 h-10 rounded-xl ${tint} flex items-center justify-center shrink-0 text-lg`}>{emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-extrabold">#{order.id.slice(0, 8).toUpperCase()}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusColor[order.status] ?? "text-slate-600 bg-slate-100"}`}>
            {order.status.replace("_", " ")}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{order.items}</p>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{order.date}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-sm font-extrabold">₹{order.total}</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </button>
  );
}
