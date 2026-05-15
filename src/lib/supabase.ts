// Supabase client — browser-only, gracefully no-ops when unconfigured.
//
// Schema migration (run once in Supabase SQL editor):
// See bottom of this file for the CREATE TABLE statements.

import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const isSupabaseConfigured =
  typeof window !== "undefined" &&
  !!supabaseUrl &&
  supabaseUrl !== "REPLACE_ME";

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ─── Auth adapter ─────────────────────────────────────────────────────────────
// Maps Supabase's User shape to the same interface the app already uses.

export type User = {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
  phoneNumber: string | null;
};

function adaptUser(u: SupabaseUser): User {
  return {
    uid: u.id,
    displayName:
      (u.user_metadata?.full_name as string | undefined) ??
      (u.user_metadata?.name as string | undefined) ??
      null,
    photoURL:
      (u.user_metadata?.avatar_url as string | undefined) ??
      (u.user_metadata?.picture as string | undefined) ??
      null,
    email: u.email ?? null,
    phoneNumber: u.phone ?? null,
  };
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
}

export async function sendOtp(phone: string): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
}

export async function verifyOtp(phone: string, token: string): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
  if (error) throw error;
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string,
): Promise<{ needsConfirmation: boolean }> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  // session is null when Supabase requires email confirmation
  return { needsConfirmation: data.session === null };
}

export async function supabaseSignOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  if (!supabase) return () => {};
  // onAuthStateChange fires INITIAL_SESSION on startup — no need for getSession()
  // which would double-fire the callback and cause race conditions in AuthContext.
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ? adaptUser(session.user) : null);
  });
  return () => data.subscription.unsubscribe();
}

// ─── User profile ─────────────────────────────────────────────────────────────

export interface UserAddress {
  id: string;
  tag: "Home" | "Work" | "Other";
  line1: string;
  pincode: string;
  landmark?: string;
  isDefault: boolean;
}

export interface WaterLog {
  date: string; // "YYYY-MM-DD"
  litres: number;
  entries: number[]; // e.g. [0.25, 0.25, 0.5]
}

export interface ActivePlan {
  planId: string;
  planName: string;
  frequency: string;
  price: number;
  paused?: boolean;
  startDate: string;
  nextDelivery?: string;
  quantity?: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  email: string;
  photoURL: string;
  membershipTier: "prime" | "standard";
  referralCode: string;
  createdAt: unknown;
  ordersCount: number;
  litresDelivered: number;
  streak: number;
  streakLastDate?: string;
  waterLog?: WaterLog;
  activePlan?: ActivePlan | null;
  addresses?: UserAddress[];
}

function rowToProfile(row: Record<string, unknown>): UserProfile {
  return {
    uid: row.uid as string,
    name: (row.name as string) ?? "",
    phone: (row.phone as string) ?? "",
    email: (row.email as string) ?? "",
    photoURL: (row.photo_url as string) ?? "",
    membershipTier: ((row.membership_tier as string) ?? "standard") as "prime" | "standard",
    referralCode: (row.referral_code as string) ?? "",
    createdAt: row.created_at,
    ordersCount: (row.orders_count as number) ?? 0,
    litresDelivered: (row.litres_delivered as number) ?? 0,
    streak: (row.streak as number) ?? 0,
    streakLastDate: (row.streak_last_date as string) ?? undefined,
    waterLog: (row.water_log as WaterLog) ?? undefined,
    activePlan: (row.active_plan as ActivePlan | null) ?? null,
    addresses: (row.addresses as UserAddress[]) ?? [],
  };
}

export async function upsertUser(user: User): Promise<void> {
  if (!supabase) return;
  // Preserve referral_code on subsequent logins — only generate for new users
  const { data: existing } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("uid", user.uid)
    .maybeSingle();
  const referralCode =
    (existing as { referral_code?: string } | null)?.referral_code ||
    `AQUA${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  await supabase.from("profiles").upsert(
    {
      uid: user.uid,
      name: user.displayName ?? "",
      phone: user.phoneNumber ?? "",
      email: user.email ?? "",
      photo_url: user.photoURL ?? "",
      referral_code: referralCode,
    },
    { onConflict: "uid", ignoreDuplicates: false },
  );
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("*").eq("uid", uid).single();
  return data ? rowToProfile(data as Record<string, unknown>) : null;
}

export function subscribeUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void,
): () => void {
  if (!supabase) { callback(null); return () => {}; }

  const fetch = async () => {
    const { data } = await supabase!.from("profiles").select("*").eq("uid", uid).single();
    callback(data ? rowToProfile(data as Record<string, unknown>) : null);
  };

  fetch();

  const channel = supabase
    .channel(`profile-${uid}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "profiles", filter: `uid=eq.${uid}` },
      () => fetch(),
    )
    .subscribe();

  return () => { supabase!.removeChannel(channel); };
}

// ─── Catalog — real-time listeners ───────────────────────────────────────────

function mapProduct(row: Record<string, unknown>) {
  return {
    ...row,
    imageUrl: row.image_url ?? row.imageUrl ?? "",
    deliveryType: row.delivery_type ?? row.deliveryType ?? "All",
    reviewCount: row.review_count ?? row.reviewCount ?? 0,
  };
}

export function subscribeProducts(callback: (docs: unknown[]) => void): () => void {
  if (!supabase) { callback([]); return () => {}; }

  const fetch = async () => {
    const { data } = await supabase!.from("products").select("*").eq("active", true);
    callback((data ?? []).map((r) => mapProduct(r as Record<string, unknown>)));
  };

  fetch();

  const channel = supabase
    .channel(`products-changes-${Math.random().toString(36).slice(2, 8)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => fetch())
    .subscribe();

  return () => { supabase!.removeChannel(channel); };
}

export function subscribeCategories(callback: (docs: unknown[]) => void): () => void {
  if (!supabase) { callback([]); return () => {}; }

  const fetch = async () => {
    const { data } = await supabase!
      .from("categories")
      .select("*")
      .eq("active", true)
      .order("order", { ascending: true });
    callback(data ?? []);
  };

  fetch();

  const channel = supabase
    .channel(`categories-changes-${Math.random().toString(36).slice(2, 8)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => fetch())
    .subscribe();

  return () => { supabase!.removeChannel(channel); };
}

function mapPlan(row: Record<string, unknown>) {
  return {
    ...row,
    pricePerMonth: row.price_per_month,
    deliveryFrequency: row.delivery_frequency,
  };
}

export function subscribeSubscriptionPlans(callback: (docs: unknown[]) => void): () => void {
  if (!supabase) { callback([]); return () => {}; }

  const fetch = async () => {
    const { data } = await supabase!
      .from("subscription_plans")
      .select("*")
      .eq("active", true);
    callback((data ?? []).map((r) => mapPlan(r as Record<string, unknown>)));
  };

  fetch();

  const channel = supabase
    .channel(`plans-changes-${Math.random().toString(36).slice(2, 8)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "subscription_plans" }, () => fetch())
    .subscribe();

  return () => { supabase!.removeChannel(channel); };
}

export interface DeliveryArea {
  pincode: string;
  name: string;
  etaMins: number;
}

export interface DeliverySettings {
  fee: number;
  freeAbove: number;
  minOrder: number;
  etaMins: number;
  timeSlots: string[];
  frequencies: string[];
  servicePincodes: string;
  codEnabled: boolean;
  upiEnabled: boolean;
  upiId: string;
  areas: DeliveryArea[];
}

const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  fee: 0,
  freeAbove: 200,
  minOrder: 50,
  etaMins: 30,
  timeSlots: ["Morning (6 AM–8 AM)", "Day (10 AM–2 PM)", "Evening (5 PM–8 PM)"],
  frequencies: ["Once", "Daily", "Alternate Days", "Weekly", "Monthly"],
  servicePincodes: "",
  codEnabled: true,
  upiEnabled: true,
  upiId: "",
  areas: [],
};

export function subscribeDeliverySettings(
  callback: (settings: DeliverySettings) => void,
): () => void {
  callback(DEFAULT_DELIVERY_SETTINGS);
  if (!supabase) return () => {};

  const fetch = async () => {
    const { data } = await supabase!.from("settings").select("data").eq("id", "delivery").single();
    callback(data?.data ? { ...DEFAULT_DELIVERY_SETTINGS, ...(data.data as Partial<DeliverySettings>) } : DEFAULT_DELIVERY_SETTINGS);
  };

  fetch();

  const channel = supabase
    .channel(`settings-delivery-${Math.random().toString(36).slice(2, 8)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "settings", filter: "id=eq.delivery" }, () => fetch())
    .subscribe();

  return () => { supabase!.removeChannel(channel); };
}

export function subscribeHomeContent(callback: (data: unknown | null) => void): () => void {
  if (!supabase) { callback(null); return () => {}; }

  const fetch = async () => {
    const { data } = await supabase!
      .from("content")
      .select("*")
      .eq("id", "home")
      .single();
    // Admin saves content inside a `data` JSONB column — unwrap it
    const content = (data as Record<string, unknown> | null)?.data ?? data;
    callback(content ?? null);
  };

  fetch();

  const channel = supabase
    .channel(`content-changes-${Math.random().toString(36).slice(2, 8)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "content", filter: "id=eq.home" },
      () => fetch(),
    )
    .subscribe();

  return () => { supabase!.removeChannel(channel); };
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function placeOrder(order: {
  userId: string;
  customer: string;
  phone: string;
  items: string;
  total: number;
  payment: string;
  address: string;
  litres?: number;
  orderType?: "cart" | "subscription";
}): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("orders")
    .insert({
      user_id: order.userId,
      customer: order.customer,
      phone: order.phone,
      items: order.items,
      total: order.total,
      payment: order.payment,
      address: order.address,
      litres: order.litres ?? 0,
      status: "pending",
      order_type: order.orderType ?? "cart",
    })
    .select("id")
    .single();
  if (error) return null;
  await supabase.rpc("increment_orders_count", { user_uid: order.userId });
  return (data as { id: string } | null)?.id ?? null;
}

export async function getUserOrders(uid: string): Promise<unknown[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", uid)
    .order("placed_at", { ascending: false });
  if (!data) return [];
  return data.map((row) => ({
    ...row,
    userId: row.user_id,
    placedAt: row.placed_at ? { seconds: new Date(row.placed_at as string).getTime() / 1000 } : null,
    deliveredAt: row.delivered_at,
  }));
}

function mapOrder(row: Record<string, unknown>) {
  return {
    ...row,
    userId: row.user_id,
    orderType: (row.order_type as string) ?? "cart",
    placedAt: row.placed_at ? { seconds: new Date(row.placed_at as string).getTime() / 1000 } : null,
    deliveredAt: row.delivered_at,
  };
}

export function subscribeUserOrders(
  uid: string,
  callback: (orders: unknown[]) => void,
): () => void {
  if (!supabase) { callback([]); return () => {}; }

  const fetch = async () => {
    const { data } = await supabase!
      .from("orders")
      .select("*")
      .eq("user_id", uid)
      .order("placed_at", { ascending: false });
    callback((data ?? []).map((r) => mapOrder(r as Record<string, unknown>)));
  };

  fetch();

  const channel = supabase
    .channel(`orders-${uid}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${uid}` },
      () => fetch(),
    )
    .subscribe();

  return () => { supabase!.removeChannel(channel); };
}

// ─── Address management ───────────────────────────────────────────────────────

export async function saveUserAddress(
  uid: string,
  address: Omit<UserAddress, "id">,
): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("addresses").eq("uid", uid).single();
  const existing: UserAddress[] = (data as { addresses: UserAddress[] } | null)?.addresses ?? [];
  const id = `addr_${Date.now()}`;
  const updated = address.isDefault
    ? existing.map((a) => ({ ...a, isDefault: false }))
    : existing;
  const newAddr: UserAddress = { ...address, id };
  await supabase.from("profiles").update({ addresses: [...updated, newAddr] }).eq("uid", uid);
  return id;
}

export async function deleteUserAddress(uid: string, addressId: string): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.from("profiles").select("addresses").eq("uid", uid).single();
  const existing: UserAddress[] = (data as { addresses: UserAddress[] } | null)?.addresses ?? [];
  await supabase
    .from("profiles")
    .update({ addresses: existing.filter((a) => a.id !== addressId) })
    .eq("uid", uid);
}

export async function setDefaultAddress(uid: string, addressId: string): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.from("profiles").select("addresses").eq("uid", uid).single();
  const existing: UserAddress[] = (data as { addresses: UserAddress[] } | null)?.addresses ?? [];
  await supabase
    .from("profiles")
    .update({ addresses: existing.map((a) => ({ ...a, isDefault: a.id === addressId })) })
    .eq("uid", uid);
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export async function createSchedule(schedule: {
  userId: string;
  customer: string;
  phone: string;
  productId: string;
  productName: string;
  quantity: number;
  frequency: string;
  startDate: string;
  timeSlot: string;
  address: string;
  total: number;
}): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("schedules")
    .insert({
      user_id: schedule.userId,
      customer: schedule.customer,
      phone: schedule.phone,
      product_id: schedule.productId,
      product_name: schedule.productName,
      quantity: schedule.quantity,
      frequency: schedule.frequency,
      start_date: schedule.startDate,
      time_slot: schedule.timeSlot,
      address: schedule.address,
      total: schedule.total,
      status: "active",
    })
    .select("id")
    .single();
  if (error) return null;
  return (data as { id: string } | null)?.id ?? null;
}

export function subscribeUserSchedules(
  uid: string,
  callback: (schedules: unknown[]) => void,
): () => void {
  if (!supabase) { callback([]); return () => {}; }
  const fetch = async () => {
    const { data } = await supabase!
      .from("schedules")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    callback(data ?? []);
  };
  fetch();
  const ch = supabase
    .channel(`schedules-${uid}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "schedules", filter: `user_id=eq.${uid}` }, fetch)
    .subscribe();
  return () => { supabase!.removeChannel(ch); };
}

// ─── Water Log ────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function logWaterIntake(uid: string, amount: number): Promise<WaterLog | null> {
  if (!supabase) return null;
  const today = todayStr();

  const { data: raw } = await supabase!.from("profiles").select("water_log, streak, streak_last_date").eq("uid", uid).single();
  const row = raw as { water_log: WaterLog | null; streak: number; streak_last_date: string | null } | null;

  const existingLog: WaterLog = row?.water_log?.date === today
    ? row.water_log
    : { date: today, litres: 0, entries: [] };

  const newEntries = [...existingLog.entries, amount];
  const newLitres = +(existingLog.litres + amount).toFixed(3);
  const newLog: WaterLog = { date: today, litres: newLitres, entries: newEntries };

  // Streak logic: increment if first log of today and yesterday was logged
  let newStreak = row?.streak ?? 0;
  let newStreakDate = row?.streak_last_date ?? null;

  if (row?.water_log?.date !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    if (newStreakDate === yesterdayStr || newStreakDate === null) {
      newStreak = newStreak + 1;
    } else {
      newStreak = 1; // reset streak
    }
    newStreakDate = today;
  }

  await supabase!.from("profiles").update({
    water_log: newLog,
    streak: newStreak,
    streak_last_date: newStreakDate,
  }).eq("uid", uid);

  return newLog;
}

// ─── Active Plan ──────────────────────────────────────────────────────────────

export async function setUserActivePlan(uid: string, plan: ActivePlan | null): Promise<void> {
  if (!supabase) return;
  await supabase!.from("profiles").update({ active_plan: plan }).eq("uid", uid);
}

// Sync schedule records so the admin panel reflects plan pause/cancel immediately.
export async function setUserSchedulesStatus(
  uid: string,
  status: "active" | "paused" | "cancelled",
): Promise<void> {
  if (!supabase) return;
  const fromStatuses = status === "cancelled" ? ["active", "paused"] : ["active"];
  await supabase!
    .from("schedules")
    .update({ status })
    .eq("user_id", uid)
    .in("status", fromStatuses);
}

// ─── Coupons ──────────────────────────────────────────────────────────────────

export interface CouponResult {
  valid: boolean;
  discountType: "flat" | "percent";
  discountValue: number;
  discountAmount: number;
  code: string;
  error?: string;
}

export async function validateCoupon(code: string, orderTotal: number): Promise<CouponResult> {
  const fail = (error: string): CouponResult => ({ valid: false, discountType: "flat", discountValue: 0, discountAmount: 0, code, error });
  if (!supabase) return fail("Service unavailable");
  const { data } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .eq("active", true)
    .single();
  if (!data) return fail("Invalid or expired coupon");
  const row = data as { discount_type: string; discount_value: number; min_order: number; max_uses: number | null; used_count: number; expires_at: string | null };
  if (row.expires_at && new Date(row.expires_at) < new Date()) return fail("Coupon has expired");
  if (row.max_uses !== null && row.used_count >= row.max_uses) return fail("Coupon usage limit reached");
  if (orderTotal < row.min_order) return fail(`Minimum order ₹${row.min_order} required`);
  const discountAmount = row.discount_type === "percent"
    ? +(orderTotal * row.discount_value / 100).toFixed(2)
    : Math.min(row.discount_value, orderTotal);
  return { valid: true, discountType: row.discount_type as "flat" | "percent", discountValue: row.discount_value, discountAmount, code: code.toUpperCase().trim() };
}

export async function incrementCouponUsage(code: string): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.rpc("increment_coupon_usage", { coupon_code: code });
    if (!error) return;
    // RPC missing or failed — fall through to manual increment
  } catch {
    /* fallthrough */
  }
  try {
    const { data } = await supabase
      .from("coupons")
      .select("used_count")
      .eq("code", code)
      .single();
    if (data) {
      await supabase
        .from("coupons")
        .update({ used_count: (data as { used_count: number }).used_count + 1 })
        .eq("code", code);
    }
  } catch {
    /* ignore */
  }
}

// ─── Support Messages ─────────────────────────────────────────────────────────

export async function sendSupportMessage(msg: {
  userId: string; userName: string; userEmail: string; subject: string; message: string;
}): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("support_messages").insert({
    user_id: msg.userId, user_name: msg.userName, user_email: msg.userEmail,
    subject: msg.subject, message: msg.message,
  });
  return !error;
}

export function subscribeUserSupportMessages(
  userId: string,
  callback: (msgs: unknown[]) => void
): () => void {
  if (!supabase) { callback([]); return () => {}; }
  const fetch = async () => {
    const { data } = await supabase!.from("support_messages").select("*").eq("user_id", userId).order("created_at", { ascending: true });
    callback(data ?? []);
  };
  fetch();
  const ch = supabase.channel(`support-${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "support_messages", filter: `user_id=eq.${userId}` }, fetch)
    .subscribe();
  return () => { supabase!.removeChannel(ch); };
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string; userId: string; title: string; body: string;
  type: string; read: boolean; data: Record<string, unknown>; createdAt: string;
}

export function subscribeNotifications(
  userId: string,
  callback: (notifs: AppNotification[]) => void
): () => void {
  if (!supabase) { callback([]); return () => {}; }
  const fetch = async () => {
    const { data } = await supabase!.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
    callback((data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string, userId: r.user_id as string, title: r.title as string,
      body: r.body as string, type: r.type as string, read: r.read as boolean,
      data: (r.data ?? {}) as Record<string, unknown>, createdAt: r.created_at as string,
    })));
  };
  fetch();
  const ch = supabase.channel(`notif-${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, fetch)
    .subscribe();
  return () => { supabase!.removeChannel(ch); };
}

export async function markNotificationsRead(userId: string): Promise<void> {
  if (!supabase) return;
  await supabase!.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
}

/*
─────────────────────────────────────────────────────────────────────────────
SQL SCHEMA — run once in Supabase SQL editor (Dashboard → SQL editor)
─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  uid              TEXT PRIMARY KEY,
  name             TEXT NOT NULL DEFAULT '',
  phone            TEXT NOT NULL DEFAULT '',
  email            TEXT NOT NULL DEFAULT '',
  photo_url        TEXT NOT NULL DEFAULT '',
  membership_tier  TEXT NOT NULL DEFAULT 'standard',
  referral_code    TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  orders_count     INTEGER NOT NULL DEFAULT 0,
  litres_delivered INTEGER NOT NULL DEFAULT 0,
  streak           INTEGER NOT NULL DEFAULT 0,
  addresses        JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Products
CREATE TABLE IF NOT EXISTS public.products (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name         TEXT NOT NULL DEFAULT '',
  size         TEXT DEFAULT '',
  unit         TEXT DEFAULT 'Bottle',
  price        NUMERIC DEFAULT 0,
  mrp          NUMERIC,
  category     TEXT DEFAULT 'individual',
  description  TEXT DEFAULT '',
  badge        TEXT,
  popular      BOOLEAN DEFAULT false,
  active       BOOLEAN DEFAULT true,
  stock        INTEGER DEFAULT 100,
  sold         INTEGER DEFAULT 0,
  "imageUrl"   TEXT DEFAULT '',
  "deliveryType" TEXT DEFAULT 'All',
  rating       NUMERIC,
  "reviewCount" INTEGER
);

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name    TEXT NOT NULL,
  icon    TEXT DEFAULT '',
  active  BOOLEAN DEFAULT true,
  "order" INTEGER DEFAULT 0
);

-- Subscription plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  description         TEXT DEFAULT '',
  price_per_month     NUMERIC DEFAULT 0,
  delivery_frequency  TEXT DEFAULT '',
  features            JSONB NOT NULL DEFAULT '[]'::jsonb,
  active              BOOLEAN DEFAULT true,
  popular             BOOLEAN DEFAULT false
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id      TEXT NOT NULL REFERENCES public.profiles(uid),
  customer     TEXT DEFAULT '',
  phone        TEXT DEFAULT '',
  items        TEXT DEFAULT '',
  total        NUMERIC DEFAULT 0,
  payment      TEXT DEFAULT 'cod',
  address      TEXT DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'pending',
  placed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  driver       TEXT,
  delivered_at TIMESTAMPTZ
);

-- Schedules
CREATE TABLE IF NOT EXISTS public.schedules (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id      TEXT NOT NULL REFERENCES public.profiles(uid),
  customer     TEXT DEFAULT '',
  phone        TEXT DEFAULT '',
  product_id   TEXT DEFAULT '',
  product_name TEXT DEFAULT '',
  quantity     INTEGER DEFAULT 1,
  frequency    TEXT DEFAULT '',
  start_date   TEXT DEFAULT '',
  time_slot    TEXT DEFAULT '',
  address      TEXT DEFAULT '',
  total        NUMERIC DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Content (single 'home' row)
CREATE TABLE IF NOT EXISTS public.content (
  id   TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Helper RPC: increment orders count
CREATE OR REPLACE FUNCTION public.increment_orders_count(user_uid TEXT)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.profiles SET orders_count = orders_count + 1 WHERE uid = user_uid;
$$;

-- Row Level Security
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content         ENABLE ROW LEVEL SECURITY;

-- Profiles: users read/write own row
CREATE POLICY "profiles_self" ON public.profiles
  USING (auth.uid()::text = uid) WITH CHECK (auth.uid()::text = uid);

-- Products/Categories/Plans/Content: public read
CREATE POLICY "products_read"  ON public.products        FOR SELECT USING (true);
CREATE POLICY "cats_read"      ON public.categories      FOR SELECT USING (true);
CREATE POLICY "plans_read"     ON public.subscription_plans FOR SELECT USING (true);
CREATE POLICY "content_read"   ON public.content         FOR SELECT USING (true);

-- Orders/Schedules: user owns rows
CREATE POLICY "orders_self"    ON public.orders    USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "schedules_self" ON public.schedules USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- Drivers (admin-only)
CREATE TABLE IF NOT EXISTS public.drivers (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name             TEXT NOT NULL DEFAULT '',
  phone            TEXT DEFAULT '',
  vehicle          TEXT DEFAULT '',
  zone             TEXT DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'available',
  rating           NUMERIC DEFAULT 5,
  "deliveriesToday" INTEGER DEFAULT 0
);

-- Enable Realtime on all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content;

─────────────────────────────────────────────────────────────────────────────
*/
