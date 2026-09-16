import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface MockUser {
  name: string;
  email: string;
  specialty: string;
  organization: string;
  avatarUrl?: string | null;
}

interface MockAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: MockUser | null;
  supabaseUser: User | null;
  login: (name?: string, email?: string) => void;
  logout: () => void;
  toggleAuth: () => void;
  updateUser: (data: Partial<MockUser>) => void;
}

const MockAuthContext = createContext<MockAuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  supabaseUser: null,
  login: () => {},
  logout: () => {},
  toggleAuth: () => {},
  updateUser: () => {},
});

export const useMockAuth = () => useContext(MockAuthContext);

/** Map a Supabase User to our internal MockUser shape */
const toMockUser = (u: User): MockUser => {
  const firstName = u.user_metadata?.first_name || "";
  const lastName = u.user_metadata?.last_name || "";
  const fullName = u.user_metadata?.full_name || u.email || "Usuario";
  
  return {
    name: (firstName || lastName) ? `${firstName} ${lastName}`.trim() : fullName,
    email: u.email || "",
    specialty: u.user_metadata?.specialty || "",
    organization: u.user_metadata?.organization || "",
    avatarUrl: null,
  };
};

export const MockAuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<MockUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);

  // --- Sync with Supabase session on mount and on every auth event ---
  useEffect(() => {
    // --- Helper to silently generate keys if missing ---
    const autoGenerateKeys = async (sessionAuth: any) => {
      try {
        const { data } = await (supabase as any).from('crypto_identities')
          .select('public_key')
          .eq('user_id', sessionAuth.user.id);
          
        if (!data || data.length === 0) {
          const apiUrl = import.meta.env.VITE_API_URL;
          await fetch(`${apiUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${sessionAuth.access_token}` }
          });
        }
      } catch (e) {
        console.error("Auto keygen error:", e);
      }
    };

    // 1. Check for an existing session immediately (handles F5 / tab change)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        const mu = toMockUser(session.user);
        
        autoGenerateKeys(session);

        // Fetch extra profile data
        (supabase as any).from('profiles')
          .select('avatar_url')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data }: any) => {
            setUser({ ...mu, avatarUrl: data?.avatar_url });
          });

        setIsAuthenticated(true);
      }
      // Mark loading done AFTER we know the real auth state
      setIsLoading(false);
    });

    // 2. Subscribe to future auth state changes (login, logout, token refresh…)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        const mu = toMockUser(session.user);
        
        autoGenerateKeys(session);

        // Fetch extra profile data
        (supabase as any).from('profiles')
          .select('avatar_url')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data }: any) => {
            setUser({ ...mu, avatarUrl: data?.avatar_url });
          });

        setIsAuthenticated(true);
      } else {
        setSupabaseUser(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Kept for dev toggle / backward compat ---
  const login = (name?: string, email?: string) => {
    setUser({
      name: name || "Usuario Dev",
      email: email || "dev@dilithium.dev",
      specialty: "Dev",
      organization: "Dev",
    });
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange will clear state automatically
  };

  const toggleAuth = () => {
    if (isAuthenticated) logout();
    else login();
  };

  const updateUser = (data: Partial<MockUser>) => {
    setUser(prev => prev ? ({ ...prev, ...data }) : null);
  };

  return (
    <MockAuthContext.Provider value={{ isAuthenticated, isLoading, user, supabaseUser, login, logout, toggleAuth, updateUser }}>
      {children}
    </MockAuthContext.Provider>
  );
};
