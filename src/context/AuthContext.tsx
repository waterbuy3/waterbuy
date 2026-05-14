import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  subscribeToAuthState,
  upsertUser,
  subscribeUserProfile,
  getGoogleRedirectResult,
  firebaseSignOut,
  isFirebaseConfigured as FIREBASE_CONFIGURED,
  type User,
  type UserProfile,
} from "@/lib/firebase";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isFirebaseReady: boolean;
  isFirebaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: false,
  signOut: async () => {},
  isFirebaseReady: false,
  isFirebaseConfigured: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(FIREBASE_CONFIGURED);
  const [firebaseReady, setReady] = useState(false);
  const unsubProfileRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!FIREBASE_CONFIGURED) {
      setLoading(false);
      return;
    }

    getGoogleRedirectResult()
      .then(async (result) => {
        if (result?.user) await upsertUser(result.user);
      })
      .catch(() => {});

    const unsubAuth = subscribeToAuthState((firebaseUser) => {
      // Clean up previous profile subscription before subscribing to new user
      if (unsubProfileRef.current) {
        unsubProfileRef.current();
        unsubProfileRef.current = null;
      }

      setReady(true);
      setUser(firebaseUser);

      if (firebaseUser) {
        upsertUser(firebaseUser).catch(() => {});
        unsubProfileRef.current = subscribeUserProfile(firebaseUser.uid, (p) => {
          setProfile(p);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfileRef.current) {
        unsubProfileRef.current();
        unsubProfileRef.current = null;
      }
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signOut: firebaseSignOut,
        isFirebaseReady: firebaseReady,
        isFirebaseConfigured: FIREBASE_CONFIGURED,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
