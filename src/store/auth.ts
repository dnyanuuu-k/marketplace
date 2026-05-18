import { create } from "zustand";

export type UserRole = "SUPER_ADMIN" | "MODERATOR" | "AUTHOR" | "BUYER";
export type UserStatus = "ACTIVE" | "PENDING" | "SUSPENDED" | "BANNED";

export interface UserProfile {
  id: string;
  bio: string | null;
  skills: string;
  portfolioImages: string;
  socialLinks: string;
  location: string | null;
  coverImageUrl: string | null;
  isVerified: boolean;
  totalSales: number;
  averageRating: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  emailVerified: string | null;
  stripeAccountId: string | null;
  commissionRate: number | null;
  profile: UserProfile | null;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      // Step 1: Call our custom login endpoint which sets the marketplace_session cookie
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "same-origin", // Ensure cookies are sent and received
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Login failed");
      }

      // Step 2: Verify the session was established by checking /api/auth/me
      await get().checkAuth();
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      // Call our custom logout endpoint to clear the session cookie
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      // Ignore errors
    }
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "same-origin", // Ensure cookies are sent
      });
      if (res.ok) {
        const data = await res.json();
        set({
          user: data.data.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  updateUser: (data: Partial<User>) => {
    const { user } = get();
    if (user) {
      set({ user: { ...user, ...data } });
    }
  },
}));
