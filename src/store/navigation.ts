import { create } from "zustand";

export interface NavigationState {
  currentPage: string;
  pageParams: Record<string, unknown>;
  history: string[];
  navigate: (page: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
}

export const PUBLIC_PAGES = [
  "landing",
  "login",
  "register",
  "onboarding",
  "browse",
  "browse-projects",
  "profile",
  "forgot-password",
  "reset-password",
  "verify-email",
  "project-detail",
];

export const DASHBOARD_PAGES = [
  "dashboard",
  "dashboard/analytics",
  "dashboard/purchases",
  "dashboard/earnings",
  "dashboard/withdraw",
  "dashboard/portfolio",
  "dashboard/reviews",
  "dashboard/messages",
  "dashboard/settings",
  "dashboard/wishlist",
  "dashboard/tracking",
  "dashboard/my-projects",
  "disputes",
  "transaction-detail",
  "notifications",
  "activity",
  "saved-authors",
  "help",
  "support",
];

export const ADMIN_PAGES = [
  "admin",
  "admin/users",
  "admin/transactions",
  "admin/payouts",
  "admin/commissions",
  "admin/disputes",
  "admin/reviews",
  "admin/notifications",
  "admin/settings",
  "admin/audit-log",
];

export const MOD_PAGES = [
  "mod/applications",
  "mod/reviews",
  "mod/users",
];

export const ALL_PAGES = [
  ...PUBLIC_PAGES,
  ...DASHBOARD_PAGES,
  ...ADMIN_PAGES,
  ...MOD_PAGES,
  "browse-projects",
  "project-detail",
];

export function isPublicPage(page: string): boolean {
  if (page === "landing" || page === "login" || page === "register" || page === "browse" || page === "browse-projects" || page === "project-detail" || page === "forgot-password" || page === "reset-password" || page === "verify-email") return true;
  return false;
}

export function isAuthRequiredPage(page: string): boolean {
  return !isPublicPage(page);
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  currentPage: "landing",
  pageParams: {},
  history: ["landing"],

  navigate: (page: string, params: Record<string, unknown> = {}) => {
    const { currentPage, history } = get();
    if (currentPage === page && Object.keys(params).length === 0) return;
    set({
      currentPage: page,
      pageParams: params,
      history: [...history, page],
    });
  },

  goBack: () => {
    const { history } = get();
    if (history.length <= 1) return;
    const newHistory = history.slice(0, -1);
    const previousPage = newHistory[newHistory.length - 1];
    set({
      currentPage: previousPage,
      history: newHistory,
      pageParams: {},
    });
  },
}));
