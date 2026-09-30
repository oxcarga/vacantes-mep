"use client";

import {
  applyActionCode,
  createUserWithEmailAndPassword,
  isSignInWithEmailLink,
  onAuthStateChanged,
  onIdTokenChanged,
  sendEmailVerification,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ensureUserProfile } from "@/app/actions";
import { getClientAuth, isFirebaseConfigured } from "./firebase";
import type { AccountRole } from "./roles";

const EMAIL_LINK_KEY = "gomepEmailForSignIn";
const PROFILE_KEY = "gomepPendingProfile";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  role: AccountRole | null;
  verified: boolean;
  register: (input: {
    email: string;
    password: string;
    phone: string;
    name: string;
  }) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<User>;
  requestMagicLink: (email: string) => Promise<void>;
  completeEmailLink: (href: string) => Promise<"signin" | "none">;
  verifyEmailCode: (code: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshRole: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function missingFields(input: {
  email: string;
  password: string;
  phone: string;
  name: string;
}) {
  const missing: string[] = [];
  if (!input.email.trim()) missing.push("correo");
  if (!input.password.trim()) missing.push("contraseña");
  if (!input.phone.trim()) missing.push("teléfono");
  if (!input.name.trim()) missing.push("nombre");
  return missing;
}

async function persistProfile(user: User) {
  const raw = window.sessionStorage.getItem(PROFILE_KEY);
  const pending = raw ? (JSON.parse(raw) as { name?: string; phone?: string }) : {};
  const name = pending.name || user.displayName || user.email || "Docente";
  const phone = pending.phone || "";
  if (!phone) return;
  const token = await user.getIdToken();
  await ensureUserProfile(token, { name, phone });
  window.sessionStorage.removeItem(PROFILE_KEY);
  await user.getIdToken(true);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AccountRole | null>(null);
  const [verified, setVerified] = useState(false);
  const configured = isFirebaseConfigured();

  async function loadClaims(next: User | null) {
    if (!next) {
      setRole(null);
      setVerified(false);
      return;
    }
    let result = await next.getIdTokenResult();
    // reload() flips User.emailVerified before Firestore's ID token does.
    // Listeners must wait for the refreshed claim or rules deny the list.
    if (next.emailVerified && result.claims.email_verified !== true) {
      await next.getIdToken(true);
      result = await next.getIdTokenResult();
    }
    setVerified(result.claims.email_verified === true);
    const claim = result.claims.role;
    setRole(claim === "admin" || claim === "docente" ? claim : "docente");
  }

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const auth = getClientAuth();
    const unsubAuth = onAuthStateChanged(auth, async (next) => {
      setUser(next);
      await loadClaims(next);
      setLoading(false);
    });
    const unsubToken = onIdTokenChanged(auth, async (next) => {
      setUser(next);
      await loadClaims(next);
    });
    return () => {
      unsubAuth();
      unsubToken();
    };
  }, [configured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured,
      role,
      verified,
      async register(input) {
        const missing = missingFields(input);
        if (missing.length > 0) {
          throw new Error(`Falta ${missing.join(", ")}`);
        }
        const auth = getClientAuth();
        window.sessionStorage.setItem(
          PROFILE_KEY,
          JSON.stringify({ name: input.name.trim(), phone: input.phone.trim() }),
        );
        const credential = await createUserWithEmailAndPassword(
          auth,
          input.email.trim(),
          input.password,
        );
        await persistProfile(credential.user);
        await sendEmailVerification(credential.user, {
          url: `${window.location.origin}/verificar`,
        });
      },
      async signInWithPassword(email, password) {
        const credential = await signInWithEmailAndPassword(
          getClientAuth(),
          email.trim(),
          password,
        );
        await persistProfile(credential.user);
        return credential.user;
      },
      async requestMagicLink(email) {
        const trimmed = email.trim();
        window.localStorage.setItem(EMAIL_LINK_KEY, trimmed);
        await sendSignInLinkToEmail(getClientAuth(), trimmed, {
          url: `${window.location.origin}/auth/complete`,
          handleCodeInApp: true,
        });
      },
      async completeEmailLink(href) {
        const auth = getClientAuth();
        const url = new URL(href, window.location.origin);
        const isLink =
          url.searchParams.get("mode") === "signIn" ||
          isSignInWithEmailLink(auth, href);
        if (!isLink) return "none";
        const email =
          window.localStorage.getItem(EMAIL_LINK_KEY) ||
          window.prompt("Confirme su correo") ||
          url.searchParams.get("email") ||
          auth.currentUser?.email ||
          "";
        const credential = await signInWithEmailLink(auth, email, href);
        window.localStorage.removeItem(EMAIL_LINK_KEY);
        await persistProfile(credential.user);
        return "signin";
      },
      async verifyEmailCode(code) {
        const auth = getClientAuth();
        await applyActionCode(auth, code);
        await auth.currentUser?.reload();
        await auth.currentUser?.getIdToken(true);
        const current = auth.currentUser;
        setUser(current);
        await loadClaims(current);
      },
      async signOutUser() {
        await signOut(getClientAuth());
      },
      async refreshRole() {
        const current = getClientAuth().currentUser;
        if (!current) return;
        await current.getIdToken(true);
        await loadClaims(current);
      },
    }),
    [user, loading, configured, role, verified],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
