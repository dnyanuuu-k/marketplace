"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Shield,
  Mail,
  Ban,
  Download,
  CheckCircle2,
  MoreHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  UserPlus,
  Activity,
  Clock,
  TrendingUp,
  FileDown,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiPatch } from "@/lib/api-client";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

// ---- Types ----
interface UserProfile {
  id: string;
  bio: string | null;
  skills: string[] | string;
  portfolioImages: string[] | string;
  socialLinks: Record<string, string> | string;
  location: string | null;
  coverImageUrl: string | null;
  isVerified: boolean;
  totalSales: number;
  averageRating: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatarUrl: string | null;
  emailVerified: string | null;
  stripeAccountId: string | null;
  commissionRate: number | null;
  createdAt: string;
  profile: UserProfile | null;
}

interface UserStats {
  userId: string;
  transactionCount: { asBuyer: number; asSeller: number; total: number };
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  openDisputes: number;
}

interface UsersAnalyticsSummary {
  summary: {
    totalUsers: number;
    totalAuthors: number;
    totalBuyers: number;
    newUsersInPeriod: number;
  };
  timeSeries: Array<{
    date: string;
    total: number;
    authors: number;
    buyers: number;
  }>;
}

// ---- Constants ----
const roleColors: Record<string, string> = {
  SUPER_ADMIN: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  MODERATOR: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  AUTHOR: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  BUYER: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  SUSPENDED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  BANNED: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const formatDateShort = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// ---- Main Component ----
export function AdminUsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  // User detail sheet
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState("overview");

  // Status change dialog
  const [statusDialog, setStatusDialog] = useState<{
    userId: string;
    userName: string;
    newStatus: string;
  } | null>(null);
  const [statusReason, setStatusReason] = useState("");

  // Bulk actions
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkDialog, setBulkDialog] = useState<{
    action: "suspend" | "ban" | "export";
    count: number;
  } | null>(null);

  // Query for users list
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users", search, roleFilter, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set("search", search);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      return apiFetch(`/api/users?${params}`);
    },
  });

  // Query for selected user details
  const { data: userDetail, isLoading: detailLoading } = useQuery<{
    success: boolean;
    data: User;
  }>({
    queryKey: ["admin-user", selectedUserId],
    queryFn: async () => {
      return apiFetch(`/api/users/${selectedUserId}`);
    },
    enabled: !!selectedUserId,
  });

  // Query for selected user stats
  const { data: userStats } = useQuery<{
    success: boolean;
    data: UserStats;
  }>({
    queryKey: ["admin-user-stats", selectedUserId],
    queryFn: async () => {
      return apiFetch(`/api/users/${selectedUserId}/stats`);
    },
    enabled: !!selectedUserId,
  });

  // Query for user analytics (summary + growth chart)
  const { data: usersAnalytics } = useQuery<{
    success: boolean;
    data: UsersAnalyticsSummary;
  }>({
    queryKey: ["analytics", "users-summary"],
    queryFn: async () => {
      return apiFetch("/api/analytics/users?period=30d");
    },
  });

  // Mutation for status change
  const statusMutation = useMutation({
    mutationFn: async ({
      userId,
      status,
      reason,
    }: {
      userId: string;
      status: string;
      reason: string;
    }) => {
      return apiPatch(`/api/users/${userId}/status`, { status, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user", selectedUserId] });
      setStatusDialog(null);
      setStatusReason("");
      toast({ title: "Status updated", description: "User status has been updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Bulk status mutation
  const bulkStatusMutation = useMutation({
    mutationFn: async ({ userIds, action }: { userIds: string[]; action: string }) => {
      const results = await Promise.allSettled(
        userIds.map((id) =>
          apiPatch(`/api/users/${id}/status`, {
            status: action === "suspend" ? "SUSPENDED" : "BANNED",
            reason: `Bulk ${action} action by admin`,
          })
        )
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      return { succeeded, total: userIds.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSelectedUserIds(new Set());
      setBulkDialog(null);
      toast({
        title: "Bulk action completed",
        description: `${result.succeeded} of ${result.total} users updated successfully.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const users = data?.data?.data || [];
  const total = data?.data?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const selectedUser = userDetail?.data;
  const stats = userStats?.data;
  const ua = usersAnalytics?.data;

  // Summary stats from analytics
  const totalUsersCount = ua?.summary.totalUsers ?? total;
  const activeCount = users.filter((u: User) => u.status === "ACTIVE").length;
  const suspendedCount = users.filter((u: User) => u.status === "SUSPENDED").length;
  const newThisMonth = ua?.summary.newUsersInPeriod ?? 0;

  // User growth chart data
  const growthChartData = useMemo(() => {
    if (!ua?.timeSeries) return [];
    return ua.timeSeries.map((d) => ({
      date: d.date,
      total: d.total,
    }));
  }, [ua]);

  // CSV export
  const exportCSV = useCallback(() => {
    const usersToExport = selectedUserIds.size > 0
      ? users.filter((u: User) => selectedUserIds.has(u.id))
      : users;
    if (usersToExport.length === 0) return;
    const headers = ["Name", "Email", "Role", "Status", "Joined"];
    const rows = usersToExport.map((u: User) => [
      u.name,
      u.email,
      u.role,
      u.status,
      formatDate(u.createdAt),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [users, selectedUserIds]);

  // Bulk selection handlers
  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map((u: User) => u.id)));
    }
  }, [users, selectedUserIds]);

  // Filter chips
  const activeFilters = useMemo(() => {
    const chips: Array<{ key: string; label: string; onClear: () => void }> = [];
    if (roleFilter !== "all") {
      chips.push({ key: "role", label: `Role: ${roleFilter}`, onClear: () => setRoleFilter("all") });
    }
    if (statusFilter !== "all") {
      chips.push({ key: "status", label: `Status: ${statusFilter}`, onClear: () => setStatusFilter("all") });
    }
    if (search) {
      chips.push({ key: "search", label: `Search: "${search}"`, onClear: () => setSearch("") });
    }
    return chips;
  }, [roleFilter, statusFilter, search]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load users</p>
          <Button variant="outline" className="mt-2" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-users"] })}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const chartTextColor = isDark ? "#94a3b8" : "#64748b";

  return (
    <div className="space-y-6">
      {/* Header with Growth Chart */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all platform users
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Mini User Growth Chart */}
          <Card className="hidden lg:flex items-center gap-3 px-4 py-2">
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">USER GROWTH</p>
              <p className="text-lg font-bold">{totalUsersCount.toLocaleString()}</p>
            </div>
            <div className="w-24 h-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthChartData}>
                  <defs>
                    <linearGradient id="userGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#14B8A6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#14B8A6"
                    strokeWidth={1.5}
                    fill="url(#userGrowthGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="size-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-teal-500/10 flex items-center justify-center">
                  <Users className="size-4 text-teal-500 dark:text-teal-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                  <p className="text-lg font-bold">{totalUsersCount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }}>
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <UserCheck className="size-4 text-emerald-500 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active</p>
                  <p className="text-lg font-bold">{activeCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }}>
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <UserX className="size-4 text-orange-500 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Suspended</p>
                  <p className="text-lg font-bold">{suspendedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.15 }}>
          <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <UserPlus className="size-4 text-violet-500 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">New This Month</p>
                  <p className="text-lg font-bold">{newThisMonth}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bulk Action Toolbar */}
      <AnimatePresence>
        {selectedUserIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                      {selectedUserIds.size} selected
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setBulkDialog({ action: "suspend", count: selectedUserIds.size })}
                    >
                      <Ban className="size-3 mr-1" /> Suspend
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => setBulkDialog({ action: "ban", count: selectedUserIds.size })}
                    >
                      <Trash2 className="size-3 mr-1" /> Ban
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={exportCSV}
                    >
                      <FileDown className="size-3 mr-1" /> Export Selected
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSelectedUserIds(new Set())}
                  >
                    <X className="size-3 mr-1" /> Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="BUYER">Buyers</SelectItem>
              <SelectItem value="AUTHOR">Authors</SelectItem>
              <SelectItem value="MODERATOR">Moderators</SelectItem>
              <SelectItem value="SUPER_ADMIN">Admins</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="BANNED">Banned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Active filters:</span>
            {activeFilters.map((chip) => (
              <Badge
                key={chip.key}
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors pr-1.5"
              >
                {chip.label}
                <button onClick={chip.onClear} className="ml-0.5 hover:bg-background/50 rounded-full p-0.5">
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground"
              onClick={() => {
                setSearch("");
                setRoleFilter("all");
                setStatusFilter("all");
                setPage(1);
              }}
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 w-10">
                    <input
                      type="checkbox"
                      className="rounded border-border"
                      checked={users.length > 0 && selectedUserIds.size === users.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">User</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4 hidden sm:table-cell">Role</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4 hidden md:table-cell">Joined</th>
                  <th className="text-right text-xs font-medium text-muted-foreground p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="p-4"><Skeleton className="size-4" /></td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Skeleton className="size-8 rounded-full" />
                            <div>
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-3 w-32 mt-1" />
                            </div>
                          </div>
                        </td>
                        <td className="p-4 hidden sm:table-cell">
                          <Skeleton className="h-5 w-16" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-5 w-16" />
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <Skeleton className="h-4 w-20" />
                        </td>
                        <td className="p-4 text-right">
                          <Skeleton className="h-8 w-8 ml-auto" />
                        </td>
                      </tr>
                    ))
                  : users.map((u: User) => (
                      <tr
                        key={u.id}
                        className={`border-b border-border last:border-0 hover:bg-accent/50 transition-colors ${
                          selectedUserIds.has(u.id) ? "bg-emerald-500/5" : ""
                        }`}
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            className="rounded border-border"
                            checked={selectedUserIds.has(u.id)}
                            onChange={() => toggleUserSelection(u.id)}
                          />
                        </td>
                        <td
                          className="p-4 cursor-pointer"
                          onClick={() => {
                            setSelectedUserId(u.id);
                            setDetailTab("overview");
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8">
                              {u.avatarUrl ? (
                                <AvatarImage src={u.avatarUrl} alt={u.name} />
                              ) : null}
                              <AvatarFallback className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                {u.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{u.name}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 hidden sm:table-cell">
                          <Badge variant="secondary" className={roleColors[u.role] || ""}>
                            {u.role.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary" className={statusColors[u.status] || ""}>
                            {u.status}
                          </Badge>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {formatDate(u.createdAt)}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { setSelectedUserId(u.id); setDetailTab("overview"); }}>
                                <Shield className="size-4 mr-2" />View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  setStatusDialog({
                                    userId: u.id,
                                    userName: u.name,
                                    newStatus: "SUSPENDED",
                                  })
                                }
                              >
                                <Ban className="size-4 mr-2" />Suspend
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  setStatusDialog({
                                    userId: u.id,
                                    userName: u.name,
                                    newStatus: "BANNED",
                                  })
                                }
                              >
                                <Ban className="size-4 mr-2" />Ban
                              </DropdownMenuItem>
                              {u.status !== "ACTIVE" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setStatusDialog({
                                      userId: u.id,
                                      userName: u.name,
                                      newStatus: "ACTIVE",
                                    })
                                  }
                                >
                                  <CheckCircle2 className="size-4 mr-2" />Reactivate
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Detail Sheet with Tabs */}
      <Sheet
        open={!!selectedUserId}
        onOpenChange={(open) => {
          if (!open) setSelectedUserId(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>User Details</SheetTitle>
            <SheetDescription>Full profile and account management</SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="space-y-4 mt-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : selectedUser ? (
            <div className="space-y-4 mt-4">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <Avatar className="size-16">
                  {selectedUser.avatarUrl ? (
                    <AvatarImage src={selectedUser.avatarUrl} alt={selectedUser.name} />
                  ) : null}
                  <AvatarFallback className="text-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {selectedUser.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className={roleColors[selectedUser.role] || ""}>
                      {selectedUser.role.replace("_", " ")}
                    </Badge>
                    <Badge variant="secondary" className={statusColors[selectedUser.status] || ""}>
                      {selectedUser.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Tabs */}
              <Tabs value={detailTab} onValueChange={setDetailTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
                  <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
                  <TabsTrigger value="actions" className="flex-1">Actions</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  {/* Stats */}
                  {stats && (
                    <div className="grid grid-cols-2 gap-3">
                      <Card>
                        <CardContent className="pt-3 pb-3 px-3">
                          <p className="text-[10px] text-muted-foreground font-medium">TRANSACTIONS</p>
                          <p className="text-lg font-bold">{stats.transactionCount.total}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-3 pb-3 px-3">
                          <p className="text-[10px] text-muted-foreground font-medium">EARNINGS</p>
                          <p className="text-lg font-bold">{formatCurrency(stats.totalEarnings)}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-3 pb-3 px-3">
                          <p className="text-[10px] text-muted-foreground font-medium">RATING</p>
                          <p className="text-lg font-bold">
                            {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "N/A"}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-3 pb-3 px-3">
                          <p className="text-[10px] text-muted-foreground font-medium">REVIEWS</p>
                          <p className="text-lg font-bold">{stats.totalReviews}</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Profile Info */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Profile Information</h4>
                    {selectedUser.profile && (
                      <>
                        {selectedUser.profile.bio && (
                          <div>
                            <p className="text-xs text-muted-foreground">Bio</p>
                            <p className="text-sm">{selectedUser.profile.bio}</p>
                          </div>
                        )}
                        {selectedUser.profile.location && (
                          <div>
                            <p className="text-xs text-muted-foreground">Location</p>
                            <p className="text-sm">{selectedUser.profile.location}</p>
                          </div>
                        )}
                        {Array.isArray(selectedUser.profile.skills) &&
                          selectedUser.profile.skills.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Skills</p>
                              <div className="flex flex-wrap gap-1">
                                {(selectedUser.profile.skills as string[]).map((skill: string) => (
                                  <Badge key={skill} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                      </>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Joined</p>
                      <p className="text-sm">{formatDate(selectedUser.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email Verified</p>
                      <p className="text-sm">
                        {selectedUser.emailVerified ? formatDate(selectedUser.emailVerified) : "Not verified"}
                      </p>
                    </div>
                    {selectedUser.commissionRate !== null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Custom Commission Rate</p>
                        <p className="text-sm">{(selectedUser.commissionRate * 100).toFixed(1)}%</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="space-y-4 mt-4">
                  {stats && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">Buyer Transactions</span>
                        <span className="text-sm font-medium">{stats.transactionCount.asBuyer}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">Seller Transactions</span>
                        <span className="text-sm font-medium">{stats.transactionCount.asSeller}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">Total Earnings</span>
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(stats.totalEarnings)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">Average Rating</span>
                        <span className="text-sm font-medium">
                          {stats.averageRating > 0 ? `${stats.averageRating.toFixed(1)} / 5` : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">Total Reviews</span>
                        <span className="text-sm font-medium">{stats.totalReviews}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-muted-foreground">Open Disputes</span>
                        <span className="text-sm font-medium text-rose-600 dark:text-rose-400">
                          {stats.openDisputes}
                        </span>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Account Timeline */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Account Timeline</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="size-6 rounded-full bg-emerald-500/10 flex items-center justify-center mt-0.5 shrink-0">
                          <UserPlus className="size-3 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Account Created</p>
                          <p className="text-xs text-muted-foreground">{formatDate(selectedUser.createdAt)}</p>
                        </div>
                      </div>
                      {selectedUser.emailVerified && (
                        <div className="flex items-start gap-3">
                          <div className="size-6 rounded-full bg-teal-500/10 flex items-center justify-center mt-0.5 shrink-0">
                            <CheckCircle2 className="size-3 text-teal-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Email Verified</p>
                            <p className="text-xs text-muted-foreground">{formatDate(selectedUser.emailVerified)}</p>
                          </div>
                        </div>
                      )}
                      {selectedUser.profile?.isVerified && (
                        <div className="flex items-start gap-3">
                          <div className="size-6 rounded-full bg-violet-500/10 flex items-center justify-center mt-0.5 shrink-0">
                            <Shield className="size-3 text-violet-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Account Verified</p>
                            <p className="text-xs text-muted-foreground">Profile has been verified</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="actions" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Account Actions</h4>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() =>
                          setStatusDialog({
                            userId: selectedUser.id,
                            userName: selectedUser.name,
                            newStatus: "SUSPENDED",
                          })
                        }
                        disabled={selectedUser.status === "SUSPENDED"}
                      >
                        <Ban className="size-4 mr-2" /> Suspend Account
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-destructive hover:text-destructive"
                        onClick={() =>
                          setStatusDialog({
                            userId: selectedUser.id,
                            userName: selectedUser.name,
                            newStatus: "BANNED",
                          })
                        }
                        disabled={selectedUser.status === "BANNED"}
                      >
                        <AlertTriangle className="size-4 mr-2" /> Ban Account
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-emerald-600 hover:text-emerald-600"
                        onClick={() =>
                          setStatusDialog({
                            userId: selectedUser.id,
                            userName: selectedUser.name,
                            newStatus: "ACTIVE",
                          })
                        }
                        disabled={selectedUser.status === "ACTIVE"}
                      >
                        <CheckCircle2 className="size-4 mr-2" /> Reactivate Account
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Communication</h4>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        setSelectedUserId(null);
                        // Could navigate to messages
                      }}
                    >
                      <Mail className="size-4 mr-2" /> Send Message
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Danger Zone</h4>
                    <p className="text-xs text-muted-foreground">
                      These actions are irreversible. Please be certain.
                    </p>
                    <Button
                      variant="destructive"
                      className="w-full justify-start"
                      onClick={() =>
                        setStatusDialog({
                          userId: selectedUser.id,
                          userName: selectedUser.name,
                          newStatus: "BANNED",
                        })
                      }
                      disabled={selectedUser.status === "BANNED"}
                    >
                      <Trash2 className="size-4 mr-2" /> Permanently Ban User
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Status Change Dialog */}
      <Dialog
        open={!!statusDialog}
        onOpenChange={(open) => {
          if (!open) {
            setStatusDialog(null);
            setStatusReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusDialog?.newStatus === "ACTIVE"
                ? "Reactivate User"
                : statusDialog?.newStatus === "SUSPENDED"
                ? "Suspend User"
                : "Ban User"}
            </DialogTitle>
            <DialogDescription>
              {statusDialog?.newStatus === "ACTIVE"
                ? `Reactivate ${statusDialog?.userName}'s account.`
                : `This action will ${statusDialog?.newStatus?.toLowerCase()} ${statusDialog?.userName}'s account.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                placeholder="Provide a reason for this action..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setStatusDialog(null);
                setStatusReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant={statusDialog?.newStatus === "ACTIVE" ? "default" : "destructive"}
              onClick={() => {
                if (statusDialog && statusReason.trim()) {
                  statusMutation.mutate({
                    userId: statusDialog.userId,
                    status: statusDialog.newStatus,
                    reason: statusReason,
                  });
                }
              }}
              disabled={!statusReason.trim() || statusMutation.isPending}
            >
              {statusMutation.isPending ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Confirm Dialog */}
      <Dialog
        open={!!bulkDialog}
        onOpenChange={(open) => {
          if (!open) setBulkDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Bulk {bulkDialog?.action === "suspend" ? "Suspend" : "Ban"} Users
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {bulkDialog?.action} {bulkDialog?.count} user{bulkDialog?.count !== 1 ? "s" : ""}? This action will {bulkDialog?.action === "suspend" ? "temporarily restrict" : "permanently revoke"} their access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                bulkStatusMutation.mutate({
                  userIds: Array.from(selectedUserIds),
                  action: bulkDialog?.action || "suspend",
                });
              }}
              disabled={bulkStatusMutation.isPending}
            >
              {bulkStatusMutation.isPending ? "Processing..." : `Confirm ${bulkDialog?.action}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
