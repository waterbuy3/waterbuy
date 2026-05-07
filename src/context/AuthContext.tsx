import {
  createContext, useContext, useEffect, useState, type ReactNode,
} from "react";
import {
  subscribeToAuthState, upsertUser, subscribeUserProfile,
  getGoogleRedirectResult, firebaseSignOut,
  isFirebaseConfigured as FIREBASE_CONFIGURED,
  type User, type UserProfile,
} from "@/lib/firebase";

interface AuthContextValue {
  user:                 User | null;
  profile:              UserProfile | null;
  loading:              boolean;
  signOut:              () => Promise<void>;
  isFirebaseReady:      boolean;
  isFirebaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user:                 null,
  profile:              null,
  loading:              false,
  signOut:              async () => {},
  isFirebaseReady:      false,
  isFirebaseConfigured: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,            setUser]    = useState<User | null>(null);
  const [profile,         setProfile] = useState<UserProfile | null>(null);
  // Only show a loading spinner when Firebase actually exists
  const [loading,         setLoading] = useState(FIREBASE_CONFIGURED);
  const [firebaseReady,   setReady]   = useState(false);

  useEffect(() => {
    // Demo mode — no Firebase credentials → skip auth entirely
    if (!FIREBASE_CONFIGURED) {
      setLoading(false);
      return;
    }

    // Handle Google redirect result (fires once after redirect back)
    getGoogleRedirectResult()
      .then(async (result) => { if (result?.user) await upsertUser(result.user); })
      .catch(() => {});

    const unsubAuth = subscribeToAuthState(async (firebaseUser) => {
      setReady(true);
      setUser(firebaseUser);

      if (firebaseUser) {
        await upsertUser(firebaseUser);
        const unsubProfile = subscribeUserProfile(firebaseUser.uid, (p) => {
          setProfile(p);
          setLoading(false);
        });
        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signOut:              firebaseSignOut,
      isFirebaseReady:      firebaseReady,
      isFirebaseConfigured: FIREBASE_CONFIGURED,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
