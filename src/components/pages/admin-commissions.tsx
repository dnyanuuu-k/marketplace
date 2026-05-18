"use client";

import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Percent,
  Download,
  Save,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

export function AdminCommissionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const limit = 20;

  // Add override dialog
  const [showAddOverride, setShowAddOverride] = useState(false);
  const [overrideUserId, setOverrideUserId] = useState("");
  const [overrideRate, setOverrideRate] = useState("");

  // Default commission rate
  const [defaultRate, setDefaultRate] = useState("");

  // Fetch settings
  const { data: settings } = useQuery<{
    success: boolean;
    data: Record<string, string>;
  }>({
    queryKey: ["settings"],
    queryFn: async () => {
      return apiFetch("/api/settings");
    },
  });

  // Fetch commission logs
  const { data: commissionData, isLoading } = useQuery({
    queryKey: ["commissions", page],
    queryFn: async () => {
      return apiFetch(`/api/commissions?page=${page}&limit=${limit}`);
    },
  });

  // Fetch users with custom commission rates
  const { data: overrideUsers } = useQuery({
    queryKey: ["users-commission-overrides"],
    queryFn: async () => {
      const data = await apiFetch("/api/users?limit=100");
      return data.data?.data?.filter((u: { commissionRate: number | null }) => u.commissionRate !== null) || [];
    },
  });

  // Update default commission rate
  const saveRateMutation = useMutation({
    mutationFn: async (rate: string) => {
      return apiPatch("/api/settings", {
        settings: [{ key: "defaultCommissionRate", value: rate }],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: "Commission rate updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Set user commission override
  const setOverrideMutation = useMutation({
    mutationFn: async ({ userId, rate }: { userId: string; rate: number }) => {
      return apiPatch(`/api/users/${userId}`, { commissionRate: rate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-commission-overrides"] });
      setShowAddOverride(false);
      setOverrideUserId("");
      setOverrideRate("");
      toast({ title: "Commission override set" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Remove override
  const removeOverrideMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiPatch(`/api/users/${userId}`, { commissionRate: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-commission-overrides"] });
      toast({ title: "Override removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // CSV export
  const exportCSV = useCallback(() => {
    if (!commissionData?.data?.data) return;
    const headers = ["Transaction ID", "Author", "Rate", "Amount", "Date"];
    const rows = commissionData.data.data.map(
      (c: { transactionId: string; transaction: { seller: { name: string } }; rate: number; commissionAmount: number; createdAt: string }) => [
        c.transactionId.slice(-8),
        c.transaction.seller.name,
        `${(c.rate * 100).toFixed(1)}%`,
        c.commissionAmount,
        formatDate(c.createdAt),
      ]
    );
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "commissions-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [commissionData]);

  const currentRate = settings?.data?.defaultCommissionRate
    ? (parseFloat(settings.data.defaultCommissionRate) * 100).toFixed(1)
    : "10.0";

  const commissions = commissionData?.data?.data || [];
  const total = commissionData?.data?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const summary = commissionData?.data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Commissions</h1>
          <p className="text-muted-foreground mt-1">Track platform commission earnings</p>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="size-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Commissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-foreground">
              {formatCurrency(summary?.totalCommission || 0)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-foreground">
              {formatCurrency(summary?.thisMonthCommission || 0)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-foreground">
              {summary?.averageRate ? (summary.averageRate * 100).toFixed(1) : currentRate}%
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Global Commission Setting */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">Default Commission Rate</CardTitle>
          <CardDescription>
            Set the default platform commission percentage applied to all transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="space-y-2 w-32">
              <Label>Rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={defaultRate || currentRate}
                onChange={(e) => setDefaultRate(e.target.value)}
                className="bg-background"
              />
            </div>
            <Button
              onClick={() => {
                const rate = parseFloat(defaultRate || currentRate);
                if (!isNaN(rate) && rate >= 0 && rate <= 100) {
                  saveRateMutation.mutate(String(rate / 100));
                }
              }}
              disabled={saveRateMutation.isPending}
            >
              <Save className="size-4 mr-2" />
              {saveRateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Per-User Override Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base text-foreground">Per-User Commission Overrides</CardTitle>
            <CardDescription>Users with custom commission rates</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowAddOverride(true)}>
            <Plus className="size-4 mr-1" /> Add Override
          </Button>
        </CardHeader>
        <CardContent>
          {!overrideUsers || overrideUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No custom commission overrides
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">User</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Email</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Rate</th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {overrideUsers.map((u: { id: string; name: string; email: string; commissionRate: number }) => (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-accent/50 dark:hover:bg-accent/30 transition-colors">
                      <td className="p-3 text-sm font-medium text-foreground">{u.name}</td>
                      <td className="p-3 text-sm text-muted-foreground">{u.email}</td>
                      <td className="p-3">
                        <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">
                          {(u.commissionRate * 100).toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeOverrideMutation.mutate(u.id)}
                          disabled={removeOverrideMutation.isPending}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commission Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">Commission Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Transaction</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4 hidden sm:table-cell">Author</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Rate</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Amount</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4 hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                        <td className="p-4 hidden sm:table-cell"><Skeleton className="h-4 w-20" /></td>
                        <td className="p-4"><Skeleton className="h-5 w-12" /></td>
                        <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                        <td className="p-4 hidden md:table-cell"><Skeleton className="h-4 w-20" /></td>
                      </tr>
                    ))
                  : commissions.map(
                      (c: {
                        id: string;
                        transactionId: string;
                        transaction: { seller: { name: string } };
                        rate: number;
                        commissionAmount: number;
                        createdAt: string;
                      }) => (
                        <tr
                          key={c.id}
                          className="border-b border-border last:border-0 hover:bg-accent/50 dark:hover:bg-accent/30 transition-colors"
                        >
                          <td className="p-4">
                            <span className="text-sm font-mono text-foreground">{c.transactionId.slice(-8)}</span>
                          </td>
                          <td className="p-4 hidden sm:table-cell">
                            <span className="text-sm text-foreground">{c.transaction.seller.name}</span>
                          </td>
                          <td className="p-4">
                            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">
                              {(c.rate * 100).toFixed(1)}%
                            </Badge>
                          </td>
                          <td className="p-4">
                            <span className="text-sm font-medium text-foreground">{formatCurrency(c.commissionAmount)}</span>
                          </td>
                          <td className="p-4 hidden md:table-cell">
                            <span className="text-sm text-muted-foreground">{formatDate(c.createdAt)}</span>
                          </td>
                        </tr>
                      )
                    )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Override Dialog */}
      <Dialog open={showAddOverride} onOpenChange={setShowAddOverride}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Commission Override</DialogTitle>
            <DialogDescription>Set a custom commission rate for a specific user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>User ID</Label>
              <Input
                placeholder="Enter user ID..."
                value={overrideUserId}
                onChange={(e) => setOverrideUserId(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Commission Rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="e.g., 8.5"
                value={overrideRate}
                onChange={(e) => setOverrideRate(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddOverride(false)}>Cancel</Button>
            <Button
              onClick={() => {
                const rate = parseFloat(overrideRate);
                if (overrideUserId && !isNaN(rate) && rate >= 0 && rate <= 100) {
                  setOverrideMutation.mutate({ userId: overrideUserId, rate: rate / 100 });
                }
              }}
              disabled={!overrideUserId || !overrideRate || setOverrideMutation.isPending}
            >
              {setOverrideMutation.isPending ? "Saving..." : "Set Override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
