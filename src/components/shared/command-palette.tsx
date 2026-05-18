"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ShoppingBag,
  DollarSign,
  Wallet,
  Briefcase,
  Star,
  MessageSquare,
  Settings,
  Users,
  Receipt,
  Banknote,
  Percent,
  AlertTriangle,
  Bell,
  FileText,
  ClipboardList,
  Search,
  ArrowRight,
  Clock,
  UserCircle,
  ShieldCheck,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useNavigationStore } from "@/store/navigation";
import { useAuthStore, type UserRole } from "@/store/auth";
import { apiFetch } from "@/lib/api-client";

interface SearchablePage {
  id: string;
  label: string;
  icon: React.ElementType;
  section: string;
  keywords?: string[];
}

interface AuthorResult {
  id: string;
  name: string;
  avatarUrl: string | null;
  profile: {
    bio: string | null;
    skills: string[];
    location: string | null;
    averageRating: number;
    totalSales: number;
  } | null;
}

const PAGES_BY_ROLE: Record<UserRole, SearchablePage[]> = {
  SUPER_ADMIN: [
    { id: "admin", label: "Admin Dashboard", icon: LayoutDashboard, section: "Navigation", keywords: ["overview", "home"] },
    { id: "admin/users", label: "Users", icon: Users, section: "Navigation", keywords: ["members", "accounts"] },
    { id: "admin/transactions", label: "Transactions", icon: Receipt, section: "Navigation", keywords: ["payments", "orders"] },
    { id: "admin/payouts", label: "Payouts", icon: Banknote, section: "Navigation", keywords: ["withdrawals", "payments"] },
    { id: "admin/commissions", label: "Commissions", icon: Percent, section: "Navigation", keywords: ["fees", "rates"] },
    { id: "admin/disputes", label: "Disputes", icon: AlertTriangle, section: "Navigation", keywords: ["conflicts", "issues"] },
    { id: "admin/reviews", label: "Reviews", icon: Star, section: "Navigation", keywords: ["feedback", "ratings"] },
    { id: "admin/notifications", label: "Notifications", icon: Bell, section: "Navigation", keywords: ["alerts", "messages"] },
    { id: "admin/settings", label: "Settings", icon: Settings, section: "Navigation", keywords: ["config", "preferences"] },
    { id: "admin/audit-log", label: "Audit Log", icon: FileText, section: "Navigation", keywords: ["history", "logs"] },
  ],
  MODERATOR: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Navigation", keywords: ["overview", "home"] },
    { id: "mod/applications", label: "Applications", icon: ClipboardList, section: "Navigation", keywords: ["approvals", "requests"] },
    { id: "mod/reviews", label: "Reviews", icon: Star, section: "Navigation", keywords: ["feedback", "ratings"] },
    { id: "mod/users", label: "Users", icon: Users, section: "Navigation", keywords: ["members", "accounts"] },
  ],
  AUTHOR: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Navigation", keywords: ["overview", "home"] },
    { id: "dashboard/earnings", label: "Earnings", icon: DollarSign, section: "Navigation", keywords: ["revenue", "income"] },
    { id: "dashboard/withdraw", label: "Withdraw", icon: Wallet, section: "Navigation", keywords: ["payout", "money"] },
    { id: "dashboard/portfolio", label: "Portfolio", icon: Briefcase, section: "Navigation", keywords: ["work", "projects"] },
    { id: "dashboard/reviews", label: "Reviews", icon: Star, section: "Navigation", keywords: ["feedback", "ratings"] },
    { id: "dashboard/messages", label: "Messages", icon: MessageSquare, section: "Navigation", keywords: ["chat", "conversations"] },
    { id: "dashboard/settings", label: "Settings", icon: Settings, section: "Navigation", keywords: ["config", "preferences", "profile"] },
  ],
  BUYER: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Navigation", keywords: ["overview", "home"] },
    { id: "dashboard/purchases", label: "Purchases", icon: ShoppingBag, section: "Navigation", keywords: ["orders", "transactions"] },
    { id: "dashboard/messages", label: "Messages", icon: MessageSquare, section: "Navigation", keywords: ["chat", "conversations"] },
    { id: "dashboard/reviews", label: "Reviews", icon: Star, section: "Navigation", keywords: ["feedback", "ratings"] },
    { id: "dashboard/settings", label: "Settings", icon: Settings, section: "Navigation", keywords: ["config", "preferences", "profile"] },
  ],
};

const QUICK_ACTIONS: SearchablePage[] = [
  { id: "browse", label: "Browse Creators", icon: Search, section: "Quick Actions", keywords: ["discover", "find", "authors"] },
  { id: "dashboard", label: "Go to Dashboard", icon: LayoutDashboard, section: "Quick Actions", keywords: ["home", "main"] },
  { id: "dashboard/settings", label: "Go to Settings", icon: Settings, section: "Quick Actions", keywords: ["preferences", "config"] },
];

const RECENT_SEARCHES_KEY = "marketplace-recent-searches";
const MAX_RECENT_SEARCHES = 5;

function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(query: string) {
  try {
    const current = getRecentSearches();
    const filtered = current.filter((s) => s !== query);
    const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

function removeRecentSearch(query: string) {
  try {
    const current = getRecentSearches();
    const updated = current.filter((s) => s !== query);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const { navigate } = useNavigationStore();
  const { user } = useAuthStore();
  const [query, setQuery] = React.useState("");

  const role = user?.role || "BUYER";
  const navPages = PAGES_BY_ROLE[role];

  // Add admin pages for admin users who might also have quick access
  const settingsPages: SearchablePage[] =
    role === "SUPER_ADMIN"
      ? [{ id: "admin/settings", label: "Platform Settings", icon: ShieldCheck, section: "Settings", keywords: ["platform", "config", "admin"] }]
      : [];

  // Fetch authors when query has text
  const { data: authorsData } = useQuery({
    queryKey: ["command-palette-authors", query],
    queryFn: async () => {
      const json = await apiFetch(
        `/api/public/authors/browse?search=${encodeURIComponent(query)}&limit=5`
      );
      return json as { data: AuthorResult[] };
    },
    enabled: query.length >= 2,
    staleTime: 30_000,
  });

  const authors = authorsData?.data || [];

  // Recent searches (only shown when query is empty)
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
      setQuery("");
    }
  }, [open]);

  const handleSelect = React.useCallback(
    (callback: () => void) => {
      onOpenChange(false);
      callback();
    },
    [onOpenChange]
  );

  const handleNavigate = React.useCallback(
    (pageId: string) => {
      onOpenChange(false);
      navigate(pageId);
    },
    [onOpenChange, navigate]
  );

  const handleAuthorSelect = React.useCallback(
    (authorId: string, authorName: string) => {
      addRecentSearch(authorName);
      onOpenChange(false);
      navigate("profile", { authorId });
    },
    [onOpenChange, navigate]
  );

  const handleRecentSearchSelect = React.useCallback(
    (searchTerm: string) => {
      setQuery(searchTerm);
    },
    []
  );

  const handleRemoveRecentSearch = React.useCallback(
    (searchTerm: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      removeRecentSearch(searchTerm);
      setRecentSearches(getRecentSearches());
    },
    []
  );

  // Determine if any nav item matches the query for filtering
  const filteredNavPages = query
    ? navPages.filter(
        (page) =>
          page.label.toLowerCase().includes(query.toLowerCase()) ||
          page.id.toLowerCase().includes(query.toLowerCase()) ||
          page.keywords?.some((k) => k.includes(query.toLowerCase()))
      )
    : navPages;

  const filteredQuickActions = query
    ? QUICK_ACTIONS.filter(
        (action) =>
          action.label.toLowerCase().includes(query.toLowerCase()) ||
          action.keywords?.some((k) => k.includes(query.toLowerCase()))
      )
    : QUICK_ACTIONS;

  const filteredSettings = query
    ? settingsPages.filter(
        (s) =>
          s.label.toLowerCase().includes(query.toLowerCase()) ||
          s.keywords?.some((k) => k.includes(query.toLowerCase()))
      )
    : settingsPages;

  const hasResults =
    filteredNavPages.length > 0 ||
    filteredQuickActions.length > 0 ||
    filteredSettings.length > 0 ||
    (query.length >= 2 && authors.length > 0) ||
    (!query && recentSearches.length > 0);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command Palette"
      description="Search pages, creators, and actions"
    >
      <CommandInput
        placeholder="Search pages, creators, actions..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-4">
            <Search className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No results found</p>
          </div>
        </CommandEmpty>

        {/* Recent searches - only when query is empty */}
        {!query && recentSearches.length > 0 && (
          <CommandGroup heading="Recent">
            {recentSearches.map((search) => (
              <CommandItem
                key={search}
                value={`recent-${search}`}
                onSelect={() => handleRecentSearchSelect(search)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  <span>{search}</span>
                </div>
                <button
                  onClick={(e) => handleRemoveRecentSearch(search, e)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                >
                  <span className="text-xs">Remove</span>
                </button>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Quick Actions */}
        {filteredQuickActions.length > 0 && (
          <CommandGroup heading="Quick Actions">
            {filteredQuickActions.map((action) => {
              const Icon = action.icon;
              return (
                <CommandItem
                  key={action.id}
                  value={`action-${action.label}`}
                  onSelect={() => handleNavigate(action.id)}
                >
                  <Icon className="size-4" />
                  <span>{action.label}</span>
                  <ArrowRight className="size-3 ml-auto text-muted-foreground" />
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Navigation pages */}
        {filteredNavPages.length > 0 && (
          <CommandGroup heading="Pages">
            {filteredNavPages.map((page) => {
              const Icon = page.icon;
              return (
                <CommandItem
                  key={page.id}
                  value={`page-${page.label}`}
                  onSelect={() => handleNavigate(page.id)}
                >
                  <Icon className="size-4" />
                  <span>{page.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Settings (admin only) */}
        {filteredSettings.length > 0 && (
          <CommandGroup heading="Settings">
            {filteredSettings.map((page) => {
              const Icon = page.icon;
              return (
                <CommandItem
                  key={page.id}
                  value={`settings-${page.label}`}
                  onSelect={() => handleNavigate(page.id)}
                >
                  <Icon className="size-4" />
                  <span>{page.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Author results */}
        {query.length >= 2 && authors.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Creators">
              {authors.map((author) => (
                <CommandItem
                  key={author.id}
                  value={`author-${author.name}`}
                  onSelect={() => handleAuthorSelect(author.id, author.name)}
                >
                  <UserCircle className="size-4" />
                  <div className="flex flex-col">
                    <span className="text-sm">{author.name}</span>
                    {author.profile?.location && (
                      <span className="text-xs text-muted-foreground">
                        {author.profile.location}
                      </span>
                    )}
                  </div>
                  {author.profile?.averageRating !== undefined &&
                    author.profile.averageRating > 0 && (
                      <span className="ml-auto text-xs text-amber-600 dark:text-amber-400">
                        ★ {author.profile.averageRating.toFixed(1)}
                      </span>
                    )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>

      {/* Footer */}
      <div className="flex items-center justify-between border-t px-4 py-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">↵</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">esc</kbd>
            Close
          </span>
        </div>
      </div>
    </CommandDialog>
  );
}

/**
 * Hook that manages the command palette open state and keyboard shortcut.
 */
export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen, onOpenChange: setOpen };
}
