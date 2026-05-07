// Firebase is CLIENT-ONLY. Never import this at SSR module-evaluation time.
// All exports are null-safe; the app degrades gracefully when unconfigured.

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import type { Auth, User, ConfirmationResult } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Only initialise on the browser, and only when real credentials exist
const isConfigured =
  typeof window !== "undefined" &&
  !!firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== "REPLACE_ME";

/** Export so consumers can skip auth gating entirely in demo mode */
export const isFirebaseConfigured = isConfigured;

let _app:  FirebaseApp | null = null;
let _auth: Auth | null        = null;
let _db:   Firestore | null   = null;

async function getFirebaseInstances() {
  if (!isConfigured) return { auth: null, db: null };
  if (_auth && _db)  return { auth: _auth, db: _db };

  const { getAuth }      = await import("firebase/auth");
  const { getFirestore } = await import("firebase/firestore");

  _app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  _auth = getAuth(_app);
  _db   = getFirestore(_app);
  return { auth: _auth, db: _db };
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export type { User, ConfirmationResult };

export async function getAuthInstance(): Promise<Auth | null> {
  const { auth } = await getFirebaseInstances();
  return auth;
}

export async function getDbInstance(): Promise<Firestore | null> {
  const { db } = await getFirebaseInstances();
  return db;
}

export async function signInWithGoogle(): Promise<void> {
  const { GoogleAuthProvider, signInWithRedirect } = await import("firebase/auth");
  const auth = await getAuthInstance();
  if (!auth) return;
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await signInWithRedirect(auth, provider);
}

export async function getGoogleRedirectResult() {
  const auth = await getAuthInstance();
  if (!auth) return null;
  const { getRedirectResult } = await import("firebase/auth");
  return getRedirectResult(auth);
}

let _recaptchaVerifier: unknown = null;

export async function sendOtp(phone: string): Promise<ConfirmationResult> {
  const auth = await getAuthInstance();
  if (!auth) throw new Error("Firebase not configured");
  const { RecaptchaVerifier, signInWithPhoneNumber } = await import("firebase/auth");
  if (_recaptchaVerifier) {
    (
      _recaptchaVerifier as { clear(): void }
    ).clear();
  }
  _recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "invisible",
    callback: () => {},
  });
  return signInWithPhoneNumber(auth, phone, _recaptchaVerifier as never);
}

export async function firebaseSignOut(): Promise<void> {
  const auth = await getAuthInstance();
  if (!auth) return;
  const { signOut } = await import("firebase/auth");
  await signOut(auth);
}

export function subscribeToAuthState(
  callback: (user: User | null) => void,
): () => void {
  if (!isConfigured) {
    // Do NOT call callback — keeps isFirebaseReady=false so app runs without auth gate
    return () => {};
  }
  let unsubscribe = () => {};
  getAuthInstance().then((auth) => {
    if (!auth) { callback(null); return; }
    import("firebase/auth").then(({ onAuthStateChanged }) => {
      unsubscribe = onAuthStateChanged(auth, callback);
    });
  });
  return () => unsubscribe();
}

// ─── Firestore user profile ───────────────────────────────────────────────────

export interface UserProfile {
  uid:             string;
  name:            string;
  phone:           string;
  email:           string;
  photoURL:        string;
  membershipTier:  "prime" | "standard";
  referralCode:    string;
  createdAt:       unknown;
  ordersCount:     number;
  litresDelivered: number;
  streak:          number;
}

export async function upsertUser(user: User): Promise<void> {
  const db = await getDbInstance();
  if (!db) return;
  const { doc, getDoc, setDoc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  const ref  = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const code = `AQUA${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    await setDoc(ref, {
      uid: user.uid, name: user.displayName || "", phone: user.phoneNumber || "",
      email: user.email || "", photoURL: user.photoURL || "",
      membershipTier: "standard", referralCode: code,
      createdAt: serverTimestamp(), ordersCount: 0, litresDelivered: 0, streak: 0,
    });
  } else {
    await updateDoc(ref, {
      name:     user.displayName || snap.data().name,
      phone:    user.phoneNumber || snap.data().phone,
      email:    user.email       || snap.data().email,
      photoURL: user.photoURL    || snap.data().photoURL,
    });
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = await getDbInstance();
  if (!db) return null;
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export function subscribeUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void,
): () => void {
  let unsubscribe = () => {};
  getDbInstance().then((db) => {
    if (!db) { callback(null); return; }
    import("firebase/firestore").then(({ doc, onSnapshot }) => {
      unsubscribe = onSnapshot(doc(db, "users", uid), (snap) =>
        callback(snap.exists() ? (snap.data() as UserProfile) : null),
      );
    });
  });
  return () => unsubscribe();
}


// ─── Shared catalog — real-time listeners ──────────────────────────────────────

export function subscribeProducts(callback: (docs: unknown[]) => void): () => void {
  let unsub = () => {};
  getDbInstance().then((db) => {
    if (!db) { callback([]); return; }
    import("firebase/firestore").then(({ collection, onSnapshot, query, where }) => {
      const q = query(collection(db, "products"), where("active", "==", true));
      unsub = onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => callback([]));
    });
  });
  return () => unsub();
}

export function subscribeCategories(callback: (docs: unknown[]) => void): () => void {
  let unsub = () => {};
  getDbInstance().then((db) => {
    if (!db) { callback([]); return; }
    import("firebase/firestore").then(({ collection, onSnapshot, query, where, orderBy }) => {
      const q = query(collection(db, "categories"), where("active", "==", true), orderBy("order"));
      unsub = onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => callback([]));
    });
  });
  return () => unsub();
}

export function subscribeSubscriptionPlans(callback: (docs: unknown[]) => void): () => void {
  let unsub = () => {};
  getDbInstance().then((db) => {
    if (!db) { callback([]); return; }
    import("firebase/firestore").then(({ collection, onSnapshot, query, where }) => {
      const q = query(collection(db, "subscriptionPlans"), where("active", "==", true));
      unsub = onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => callback([]));
    });
  });
  return () => unsub();
}

export function subscribeHomeContent(callback: (data: unknown | null) => void): () => void {
  let unsub = () => {};
  getDbInstance().then((db) => {
    if (!db) { callback(null); return; }
    import("firebase/firestore").then(({ doc, onSnapshot }) => {
      unsub = onSnapshot(doc(db, "content", "home"), (snap) => callback(snap.exists() ? snap.data() : null), () => callback(null));
    });
  });
  return () => unsub();
}

export async function placeOrder(order: {
  userId:   string;
  customer: string;
  phone:    string;
  items:    string;
  total:    number;
  payment:  string;
  address:  string;
}): Promise<string | null> {
  const db = await getDbInstance();
  if (!db) return null;
  const { collection, addDoc, serverTimestamp, doc, updateDoc, increment } = await import("firebase/firestore");
  const ref = await addDoc(collection(db, "orders"), {
    ...order,
    status:    "pending",
    placedAt:  serverTimestamp(),
    driver:    null,
    deliveredAt: null,
  });
  await updateDoc(doc(db, "users", order.userId), { ordersCount: increment(1) });
  return ref.id;
}

export async function getUserOrders(uid: string): Promise<unknown[]> {
  const db = await getDbInstance();
  if (!db) return [];
  const { collection, query, where, orderBy, getDocs } = await import("firebase/firestore");
  const q = query(collection(db, "orders"), where("userId", "==", uid), orderBy("placedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
