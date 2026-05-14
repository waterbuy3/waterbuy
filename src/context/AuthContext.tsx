import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  subscribeToAuthState,
  upsertUser,
  subscribeUserProfile,
  supabaseSignOut,
  isSupabaseConfigured,
  type User,
  type UserProfile,
} from "@/lib/supabase";

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
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [ready, setReady] = useState(false);
  const unsubProfileRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubAuth = subscribeToAuthState((supabaseUser) => {
      if (unsubProfileRef.current) {
        unsubProfileRef.current();
        unsubProfileRef.current = null;
      }

      setReady(true);
      setUser(supabaseUser);

      if (supabaseUser) {
        upsertUser(supabaseUser).catch(() => {});
        unsubProfileRef.current = subscribeUserProfile(supabaseUser.uid, (p) => {
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
        signOut: supabaseSignOut,
        isFirebaseReady: ready,
        isFirebaseConfigured: isSupabaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
