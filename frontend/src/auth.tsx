import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { http, setToken } from "./api";
import { User } from "./types";

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);
const KEY = "wardrobe_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const me = await http.get<User>("/api/auth/me");
      setUser(me);
    } catch {
      setUser(null);
      setToken(null);
      await AsyncStorage.removeItem(KEY);
    }
  }

  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem(KEY);
      if (t) {
        setToken(t);
        await refresh();
      }
      setLoading(false);
    })();
  }, []);

  async function saveSession(accessToken: string) {
    setToken(accessToken);
    await AsyncStorage.setItem(KEY, accessToken);
    await refresh();
  }

  async function login(email: string, password: string) {
    const res = await http.post<{ access_token: string }>("/api/auth/login", {
      email,
      password,
    });
    await saveSession(res.access_token);
  }

  async function register(email: string, username: string, password: string) {
    const res = await http.post<{ access_token: string }>(
      "/api/auth/register",
      { email, username, password }
    );
    await saveSession(res.access_token);
  }

  async function logout() {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem(KEY);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 必須在 AuthProvider 內");
  return ctx;
}
