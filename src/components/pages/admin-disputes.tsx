"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

// ---- Types ----
interface DisputeUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface DisputeTransaction {
  id: string;
  amount: number;
  description: string | null;
  buyer: { id: string; name: string; email: string; avatarUrl: string | null };
  seller: { id: string; name: string; email: string; avatarUrl: string | null };
}

interface Dispute {
  id: string;
  transactionId: string;
  openedById: string;
  reason: string;
  evidenceUrls: string[];
  status: string;
  adminNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  transaction: DisputeTransaction;
  openedBy: DisputeUser;
}

// ---- Constants ----
const statusColors: Record<string, string> = {
  OPEN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  UNDER_REVIEW: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  RESOLVED_REFUNDED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  RESOLVED_DENIED: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
};

const statusLabels: Record<string, string> = {
  OPEN: "Open",
  UNDER_REVIEW: "Under Review",
  RESOLVED_REFUNDED: "Refunded",
  RESOLVED_DENIED: "Denied",
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

// ---- Main Component ----
export function AdminDisputesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusTab, setStatusTab] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Detail dialog
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);

  // Resolve dialog
  const [resolveDialog, setResolveDialog] = useState<{
    disputeId: string;
    resolution: "RESOLVED_REFUNDED" | "RESOLVED_DENIED";
  } | null>(null);
  const [adminNote, setAdminNote] = useState("");

  // Mark under review dialog
  const [reviewNote, setReviewNote] = useState("");

  // Fetch disputes
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-disputes", statusTab, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (statusTab !== "all") params.set("status", statusTab);

      return apiFetch(`/api/disputes?${params}`);
    },
  });

  // Resolve dispute mutation
  const resolveMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      adminNote: note,
    }: {
      id: string;
      status: string;
      adminNote: string;
    }) => {
      return apiPatch(`/api/disputes/${id}/resolve`, { status, adminNote: note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      setResolveDialog(null);
      setAdminNote("");
      setSelectedDispute(null);
      toast({ title: "Dispute resolved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const disputes: Dispute[] = data?.data?.data || [];
  const total = data?.data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load disputes</p>
          <Button variant="outline" className="mt-2" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-disputes"] })}>
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
          <h1 className="text-2xl font-bold tracking-tight">Disputes</h1>
          <p className="text-muted-foreground mt-1">Review and resolve transaction disputes</p>
        </div>
      </div>

      {/* Status Tabs */}
      <Tabs value={statusTab} onValueChange={(v) => { setStatusTab(v); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="OPEN">Open</TabsTrigger>
          <TabsTrigger value="UNDER_REVIEW">Under Review</TabsTrigger>
          <TabsTrigger value="RESOLVED_REFUNDED">Resolved (Refunded)</TabsTrigger>
          <TabsTrigger value="RESOLVED_DENIED">Resolved (Denied)</TabsTrigger>
        </TabsList>

        <TabsContent value={statusTab} className="mt-4 space-y-4">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Skeleton className="size-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-64" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            : disputes.length === 0
            ? (
              <div className="text-center py-12 text-muted-foreground">
                No disputes found
              </div>
            )
            : disputes.map((dispute) => (
                <Card key={dispute.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="size-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                          <AlertTriangle className="size-5 text-red-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-mono">{dispute.id.slice(-8)}</span>
                            <Badge variant="secondary" className={statusColors[dispute.status]}>
                              {statusLabels[dispute.status]}
                            </Badge>
                          </div>
                          <p className="text-sm mt-1">{dispute.reason}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Opened by {dispute.openedBy.name} · {dispute.transaction.id.slice(-8)} ·{" "}
                            {formatCurrency(dispute.transaction.amount)} · {formatDate(dispute.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {dispute.status === "OPEN" || dispute.status === "UNDER_REVIEW" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600"
                              onClick={() =>
                                setResolveDialog({
                                  disputeId: dispute.id,
                                  resolution: "RESOLVED_REFUNDED",
                                })
                              }
                            >
                              <CheckCircle2 className="size-4 mr-1" />
                              Refund
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() =>
                                setResolveDialog({
                                  disputeId: dispute.id,
                                  resolution: "RESOLVED_DENIED",
                                })
                              }
                            >
                              <XCircle className="size-4 mr-1" />
                              Deny
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedDispute(dispute)}
                          >
                            <Eye className="size-4 mr-1" />
                            View
                          </Button>
                        )}
                      </div>
                    </div>
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

      {/* Resolve Dispute Dialog */}
      <Dialog
        open={!!resolveDialog}
        onOpenChange={(open) => {
          if (!open) {
            setResolveDialog(null);
            setAdminNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {resolveDialog?.resolution === "RESOLVED_REFUNDED"
                ? "Resolve: Issue Refund"
                : "Resolve: Deny Dispute"}
            </DialogTitle>
            <DialogDescription>
              {resolveDialog?.resolution === "RESOLVED_REFUNDED"
                ? "The buyer will receive a refund for this transaction."
                : "The dispute will be denied and the transaction will remain completed."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Admin Note (required)</Label>
              <Textarea
                placeholder="Document the reason for this decision..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResolveDialog(null); setAdminNote(""); }}>
              Cancel
            </Button>
            <Button
              variant={resolveDialog?.resolution === "RESOLVED_REFUNDED" ? "default" : "destructive"}
              onClick={() => {
                if (resolveDialog && adminNote.trim()) {
                  resolveMutation.mutate({
                    id: resolveDialog.disputeId,
                    status: resolveDialog.resolution,
                    adminNote,
                  });
                }
              }}
              disabled={!adminNote.trim() || resolveMutation.isPending}
            >
              {resolveMutation.isPending ? "Processing..." : "Confirm Resolution"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Detail Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={(open) => { if (!open) setSelectedDispute(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dispute Detail</DialogTitle>
            <DialogDescription>Full dispute information and resolution details</DialogDescription>
          </DialogHeader>
          {selectedDispute && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Dispute ID</p>
                  <p className="text-sm font-mono">{selectedDispute.id.slice(-8)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="secondary" className={statusColors[selectedDispute.status]}>
                    {statusLabels[selectedDispute.status]}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Opened By</p>
                  <p className="text-sm">{selectedDispute.openedBy.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date Opened</p>
                  <p className="text-sm">{formatDate(selectedDispute.createdAt)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Reason</p>
                <p className="text-sm">{selectedDispute.reason}</p>
              </div>

              {selectedDispute.evidenceUrls && selectedDispute.evidenceUrls.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Evidence</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDispute.evidenceUrls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-500 hover:underline"
                      >
                        Evidence {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-1">Transaction Details</p>
                <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                  <p><span className="text-muted-foreground">ID:</span> {selectedDispute.transaction.id.slice(-8)}</p>
                  <p><span className="text-muted-foreground">Amount:</span> {formatCurrency(selectedDispute.transaction.amount)}</p>
                  <p><span className="text-muted-foreground">Buyer:</span> {selectedDispute.transaction.buyer.name}</p>
                  <p><span className="text-muted-foreground">Seller:</span> {selectedDispute.transaction.seller.name}</p>
                </div>
              </div>

              {selectedDispute.adminNote && (
                <div>
                  <p className="text-xs text-muted-foreground">Admin Note</p>
                  <p className="text-sm">{selectedDispute.adminNote}</p>
                </div>
              )}

              {selectedDispute.resolvedAt && (
                <div>
                  <p className="text-xs text-muted-foreground">Resolved At</p>
                  <p className="text-sm">{formatDate(selectedDispute.resolvedAt)}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
