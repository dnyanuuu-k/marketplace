"use client";

import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Receipt,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiPatch } from "@/lib/api-client";

// ---- Types ----
interface TransactionUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface CommissionLog {
  id: string;
  transactionId: string;
  rate: number;
  commissionAmount: number;
  createdAt: string;
}

interface Transaction {
  id: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  commissionAmount: number;
  netAmount: number;
  status: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  buyer: TransactionUser;
  seller: TransactionUser;
  commissionLog: CommissionLog | null;
  review?: { id: string; rating: number; comment: string } | null;
  dispute?: { id: string; reason: string; status: string } | null;
}

// ---- Constants ----
const statusColors: Record<string, string> = {
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  DISPUTED: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  REFUNDED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400",
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

// ---- Main Component ----
export function AdminTransactionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Detail dialog
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [statusOverride, setStatusOverride] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  // Fetch transactions
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-transactions", search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) {
        params.set("userId", search);
      }

      return apiFetch(`/api/transactions?${params}`);
    },
  });

  // Fetch transaction detail
  const { data: txDetail } = useQuery<{
    success: boolean;
    data: Transaction;
  }>({
    queryKey: ["admin-transaction", selectedTxId],
    queryFn: async () => {
      return apiFetch(`/api/transactions/${selectedTxId}`);
    },
    enabled: !!selectedTxId,
  });

  // Override status mutation
  const overrideMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: string;
      reason: string;
    }) => {
      return apiPatch(`/api/transactions/${id}`, { status, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-transaction", selectedTxId] });
      setSelectedTxId(null);
      setStatusOverride("");
      setOverrideReason("");
      toast({ title: "Status updated", description: "Transaction status has been overridden." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // CSV export
  const exportCSV = useCallback(() => {
    if (!data?.data?.data) return;
    const headers = ["ID", "Buyer", "Seller", "Amount", "Commission", "Net", "Status", "Date"];
    const rows = data.data.data.map((tx: Transaction) => [
      tx.id.slice(-8),
      tx.buyer.name,
      tx.seller.name,
      tx.amount,
      tx.commissionAmount,
      tx.netAmount,
      tx.status,
      formatDate(tx.createdAt),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const transactions = data?.data?.data || [];
  const total = data?.data?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const detail = txDetail?.data;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load transactions</p>
          <Button variant="outline" className="mt-2" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-transactions"] })}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage all platform transactions
          </p>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="size-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {formatCurrency(
                transactions.reduce((s: number, t: Transaction) => s + t.amount, 0)
              )}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Commissions Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {formatCurrency(
                transactions.reduce((s: number, t: Transaction) => s + t.commissionAmount, 0)
              )}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {transactions.length > 0
                ? formatCurrency(
                    transactions.reduce((s: number, t: Transaction) => s + t.amount, 0) /
                      transactions.length
                  )
                : "$0.00"}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by user ID..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
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
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="DISPUTED">Disputed</SelectItem>
            <SelectItem value="REFUNDED">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">ID</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Buyer</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4 hidden sm:table-cell">Seller</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Amount</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4 hidden md:table-cell">Commission</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4 hidden md:table-cell">Net</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4 hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                        <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                        <td className="p-4 hidden sm:table-cell"><Skeleton className="h-4 w-20" /></td>
                        <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                        <td className="p-4 hidden md:table-cell"><Skeleton className="h-4 w-16" /></td>
                        <td className="p-4 hidden md:table-cell"><Skeleton className="h-4 w-16" /></td>
                        <td className="p-4"><Skeleton className="h-5 w-16" /></td>
                        <td className="p-4 hidden lg:table-cell"><Skeleton className="h-4 w-20" /></td>
                      </tr>
                    ))
                  : transactions.map((tx: Transaction) => (
                      <tr
                        key={tx.id}
                        className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedTxId(tx.id)}
                      >
                        <td className="p-4">
                          <span className="text-sm font-mono">{tx.id.slice(-8)}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm">{tx.buyer.name}</span>
                        </td>
                        <td className="p-4 hidden sm:table-cell">
                          <span className="text-sm">{tx.seller.name}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(tx.amount)}
                          </span>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(tx.commissionAmount)}
                          </span>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <span className="text-sm">
                            {formatCurrency(tx.netAmount)}
                          </span>
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary" className={statusColors[tx.status] || ""}>
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="p-4 hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {formatDate(tx.createdAt)}
                          </span>
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
                <span className="text-sm px-2">{page} / {totalPages}</span>
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

      {/* Transaction Detail Dialog */}
      <Dialog
        open={!!selectedTxId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTxId(null);
            setStatusOverride("");
            setOverrideReason("");
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Detail</DialogTitle>
            <DialogDescription>
              Full transaction information and admin controls
            </DialogDescription>
          </DialogHeader>

          {detail ? (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Transaction ID</p>
                  <p className="text-sm font-mono text-foreground">{detail.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="secondary" className={statusColors[detail.status] || ""}>
                    {detail.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Buyer</p>
                  <p className="text-sm text-foreground">{detail.buyer.name} ({detail.buyer.email})</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Seller</p>
                  <p className="text-sm text-foreground">{detail.seller.name} ({detail.seller.email})</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(detail.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm text-foreground">{formatDate(detail.createdAt)}</p>
                </div>
              </div>

              {detail.description && (
                <div>
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm text-foreground">{detail.description}</p>
                </div>
              )}

              <Separator />

              {/* Commission Breakdown */}
              {detail.commissionLog && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-foreground">Commission Breakdown</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Rate</p>
                      <p className="text-sm font-medium text-foreground">
                        {(detail.commissionLog.rate * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Commission</p>
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(detail.commissionLog.commissionAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Net to Seller</p>
                      <p className="text-sm font-medium text-foreground">{formatCurrency(detail.netAmount)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Linked Review */}
              {detail.review && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-foreground">Linked Review</h4>
                    <div className="bg-muted/50 dark:bg-muted/30 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">Rating: {detail.review.rating}/5</span>
                      </div>
                      <p className="text-sm mt-1 text-foreground">{detail.review.comment}</p>
                    </div>
                  </div>
                </>
              )}

              {/* Linked Dispute */}
              {detail.dispute && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-foreground">Linked Dispute</h4>
                    <div className="bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <p className="text-sm text-foreground"><span className="font-medium">Reason:</span> {detail.dispute.reason}</p>
                      <Badge variant="secondary" className="mt-1">{detail.dispute.status}</Badge>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Admin Override Status */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-foreground">Override Transaction Status</h4>
                <div className="space-y-3">
                  <Select value={statusOverride} onValueChange={setStatusOverride}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="DISPUTED">Disputed</SelectItem>
                      <SelectItem value="REFUNDED">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Reason for override..."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                  />
                  <Button
                    size="sm"
                    disabled={!statusOverride || !overrideReason.trim() || overrideMutation.isPending}
                    onClick={() => {
                      if (selectedTxId && statusOverride) {
                        overrideMutation.mutate({
                          id: selectedTxId,
                          status: statusOverride,
                          reason: overrideReason,
                        });
                      }
                    }}
                  >
                    {overrideMutation.isPending ? "Updating..." : "Override Status"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Skeleton className="h-[200px] w-full" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
