"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  Download,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiPatch } from "@/lib/api-client";

// ---- Types ----
interface Payout {
  id: string;
  userId: string;
  amount: number;
  method: string;
  status: string;
  adminNote: string | null;
  processedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    role: string;
  };
}

// ---- Constants ----
const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  DENIED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

// ---- Main Component ----
export function AdminPayoutsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState("pending");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Action dialog
  const [actionDialog, setActionDialog] = useState<{
    payoutId: string;
    action: "APPROVED" | "DENIED";
    userName: string;
    amount: number;
  } | null>(null);
  const [adminNote, setAdminNote] = useState("");

  // Fetch payouts
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-payouts", tab, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (tab === "pending") params.set("status", "PENDING");
      else if (tab === "history") {
        // All non-pending
      }

      return apiFetch(`/api/payouts?${params}`);
    },
  });

  const payouts: Payout[] = data?.data?.data || [];
  const total = data?.data?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const summary = data?.data?.summary;

  // Payout action mutation
  const actionMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      adminNote: note,
    }: {
      id: string;
      status: string;
      adminNote: string;
    }) => {
      return apiPatch(`/api/payouts/${id}`, { status, adminNote: note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
      setActionDialog(null);
      setAdminNote("");
      toast({ title: "Payout updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load payouts</p>
          <Button
            variant="outline"
            className="mt-2"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-payouts"] })}
          >
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
          <h1 className="text-2xl font-bold tracking-tight">Payouts</h1>
          <p className="text-muted-foreground mt-1">Manage author withdrawal requests</p>
        </div>
        <Button variant="outline" onClick={() => {
          if (!payouts.length) return;
          const headers = ["ID", "Author", "Amount", "Method", "Status", "Date"];
          const rows = payouts.map((p) => [
            p.id.slice(-8),
            p.user.name,
            p.amount,
            p.method,
            p.status,
            formatDate(p.createdAt),
          ]);
          const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "payouts-export.csv";
          a.click();
          URL.revokeObjectURL(url);
        }}>
          <Download className="size-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-amber-600">
              {formatCurrency(summary?.totalPending || 0)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.pendingCount || 0} requests
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-emerald-600">
              {formatCurrency(summary?.totalPaidThisMonth || 0)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{total}</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="history">All History</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-10 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))
            : payouts.length === 0
            ? (
              <div className="text-center py-12 text-muted-foreground">
                {tab === "pending" ? "No pending payouts" : "No payout history"}
              </div>
            )
            : payouts.map((payout) => (
                <Card key={payout.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10 shrink-0">
                          {payout.user.avatarUrl ? (
                            <AvatarImage src={payout.user.avatarUrl} alt={payout.user.name} />
                          ) : null}
                          <AvatarFallback className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            {payout.user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{payout.user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {payout.method.replace("_", " ")} · {formatDate(payout.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          {formatCurrency(payout.amount)}
                        </span>
                        <Badge variant="secondary" className={statusColors[payout.status] || ""}>
                          {payout.status}
                        </Badge>
                        {payout.status === "PENDING" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600"
                              onClick={() =>
                                setActionDialog({
                                  payoutId: payout.id,
                                  action: "APPROVED",
                                  userName: payout.user.name,
                                  amount: payout.amount,
                                })
                              }
                            >
                              <CheckCircle2 className="size-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() =>
                                setActionDialog({
                                  payoutId: payout.id,
                                  action: "DENIED",
                                  userName: payout.user.name,
                                  amount: payout.amount,
                                })
                              }
                            >
                              <XCircle className="size-4 mr-1" />
                              Deny
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    {payout.adminNote && (
                      <div className="mt-2 text-xs text-muted-foreground ml-13">
                        Admin note: {payout.adminNote}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Payout Action Dialog */}
      <Dialog
        open={!!actionDialog}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog(null);
            setAdminNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.action === "APPROVED" ? "Approve Payout" : "Deny Payout"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.action === "APPROVED"
                ? `Approve ${formatCurrency(actionDialog?.amount || 0)} payout for ${actionDialog?.userName}`
                : `Deny payout request from ${actionDialog?.userName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Admin Note (optional)</Label>
              <Textarea
                placeholder="Add a note..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog(null);
                setAdminNote("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog?.action === "APPROVED" ? "default" : "destructive"}
              onClick={() => {
                if (actionDialog) {
                  actionMutation.mutate({
                    id: actionDialog.payoutId,
                    status: actionDialog.action,
                    adminNote,
                  });
                }
              }}
              disabled={actionMutation.isPending}
            >
              {actionMutation.isPending ? "Processing..." : actionDialog?.action === "APPROVED" ? "Approve" : "Deny"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
