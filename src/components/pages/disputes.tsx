"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  ShieldAlert,
  AlertTriangle,
  Eye,
  Clock,
  CheckCircle2,
  FileText,
  Plus,
  X,
  Loader2,
  Link as LinkIcon,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { useNavigationStore } from "@/store/navigation";
import { useAuthStore } from "@/store/auth";
import { apiFetch, apiPost } from "@/lib/api-client";
import { toast } from "sonner";

interface DisputeTransaction {
  id: string;
  amount: number;
  description: string | null;
  status: string;
  buyer: { id: string; name: string; email: string; avatarUrl: string | null };
  seller: { id: string; name: string; email: string; avatarUrl: string | null };
}

interface Dispute {
  id: string;
  transactionId: string;
  openedById: string;
  reason: string;
  evidenceUrls: string[];
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED_REFUNDED" | "RESOLVED_DENIED";
  adminNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  transaction: DisputeTransaction;
  openedBy: { id: string; name: string; avatarUrl: string | null };
}

interface TransactionOption {
  id: string;
  amount: number;
  description: string | null;
  createdAt: string;
  seller: { id: string; name: string; avatarUrl: string | null };
}

// Status badge with color coding
function DisputeStatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
    OPEN: {
      color: "text-red-700 dark:text-red-400",
      bg: "bg-red-100 dark:bg-red-500/20",
      icon: <AlertTriangle className="size-3" />,
    },
    UNDER_REVIEW: {
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-500/20",
      icon: <Eye className="size-3" />,
    },
    RESOLVED_REFUNDED: {
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-500/20",
      icon: <CheckCircle2 className="size-3" />,
    },
    RESOLVED_DENIED: {
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-500/20",
      icon: <CheckCircle2 className="size-3" />,
    },
  };

  const c = config[status] || config.OPEN;
  const label = status === "RESOLVED_REFUNDED"
    ? "Resolved (Refunded)"
    : status === "RESOLVED_DENIED"
    ? "Resolved (Denied)"
    : status === "UNDER_REVIEW"
    ? "Under Review"
    : status;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${c.bg} ${c.color}`}>
      {c.icon}
      {label}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
    </div>
  );
}

export function DisputesPage() {
  const { navigate } = useNavigationStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("ALL");
  const [newDisputeOpen, setNewDisputeOpen] = useState(false);

  // New dispute form state
  const [selectedTransactionId, setSelectedTransactionId] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch disputes
  const { data, isLoading } = useQuery({
    queryKey: ["disputes", activeTab],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (activeTab !== "ALL") params.set("status", activeTab);
      const json = await apiFetch(`/api/disputes?${params}`);
      const payload = json.data ?? json;
      return {
        disputes: (payload.data ?? payload) as Dispute[],
        total: payload.total ?? (Array.isArray(payload) ? payload.length : 0),
      };
    },
  });

  // Fetch completed transactions for new dispute dialog
  const { data: transactionsData } = useQuery({
    queryKey: ["completed-transactions"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("status", "COMPLETED");
      params.set("limit", "50");
      const json = await apiFetch(`/api/transactions?${params}`);
      const payload = json.data ?? json;
      return (Array.isArray(payload) ? payload : payload.data ?? []) as TransactionOption[];
    },
    enabled: newDisputeOpen,
  });

  const disputes = data?.disputes ?? [];

  // Summary stats
  const openCount = disputes.filter((d) => d.status === "OPEN").length;
  const underReviewCount = disputes.filter((d) => d.status === "UNDER_REVIEW").length;
  const resolvedCount = disputes.filter((d) => d.status === "RESOLVED_REFUNDED" || d.status === "RESOLVED_DENIED").length;
  const totalValue = disputes.reduce((sum, d) => sum + d.transaction.amount, 0);

  const summaryCards = [
    {
      label: "Open",
      value: openCount,
      icon: AlertTriangle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-500/10",
    },
    {
      label: "Under Review",
      value: underReviewCount,
      icon: Eye,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Resolved",
      value: resolvedCount,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Total Value",
      value: `$${totalValue.toFixed(2)}`,
      icon: FileText,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-500/10",
    },
  ];

  // Create dispute mutation
  const createDisputeMutation = useMutation({
    mutationFn: async (payload: { transactionId: string; reason: string; evidenceUrls: string[] }) => {
      return apiPost("/api/disputes", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Dispute opened successfully!");
      resetNewDisputeForm();
      setNewDisputeOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to open dispute");
    },
  });

  const resetNewDisputeForm = () => {
    setSelectedTransactionId("");
    setDisputeReason("");
    setEvidenceUrls([]);
    setNewUrl("");
    setIsSubmitting(false);
  };

  const handleAddEvidenceUrl = () => {
    if (newUrl.trim()) {
      setEvidenceUrls([...evidenceUrls, newUrl.trim()]);
      setNewUrl("");
    }
  };

  const handleRemoveEvidenceUrl = (index: number) => {
    setEvidenceUrls(evidenceUrls.filter((_, i) => i !== index));
  };

  const handleSubmitDispute = () => {
    if (!selectedTransactionId || !disputeReason.trim()) return;
    createDisputeMutation.mutate({
      transactionId: selectedTransactionId,
      reason: disputeReason.trim(),
      evidenceUrls,
    });
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="size-6 text-rose-600 dark:text-rose-400" />
            Dispute Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your transaction disputes
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Button onClick={() => setNewDisputeOpen(true)}>
            <Plus className="size-4 mr-1" />
            Open New Dispute
          </Button>
        </motion.div>
      </div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {summaryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`size-10 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`size-5 ${card.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <p className="text-xl font-bold tracking-tight">
                        {typeof card.value === "number" ? card.value : card.value}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Tab Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="OPEN">Open</TabsTrigger>
            <TabsTrigger value="UNDER_REVIEW">Under Review</TabsTrigger>
            <TabsTrigger value="RESOLVED_REFUNDED">Resolved</TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Dispute Cards */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {disputes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <EmptyState
                icon={<ShieldAlert />}
                title="No disputes found"
                description={
                  activeTab !== "ALL"
                    ? "No disputes match the selected filter. Try a different tab."
                    : "You haven't opened any disputes yet. If you have an issue with a transaction, you can open a dispute."
                }
                action={
                  activeTab === "ALL"
                    ? {
                        label: "Open New Dispute",
                        onClick: () => setNewDisputeOpen(true),
                      }
                    : undefined
                }
              />
            </motion.div>
          ) : (
            disputes.map((dispute, idx) => (
              <motion.div
                key={dispute.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card className="hover:shadow-md transition-shadow group">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left: Dispute Info */}
                      <div className="flex-1 min-w-0 space-y-3">
                        {/* Status badge */}
                        <DisputeStatusBadge status={dispute.status} />

                        {/* Transaction description and amount */}
                        <div>
                          <p className="text-sm font-semibold text-foreground truncate">
                            {dispute.transaction.description || "Transaction"}
                          </p>
                          <p className="text-lg font-bold text-foreground">
                            ${dispute.transaction.amount.toFixed(2)}
                          </p>
                        </div>

                        {/* Reason */}
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {dispute.reason}
                        </p>

                        {/* Evidence count */}
                        {dispute.evidenceUrls && dispute.evidenceUrls.length > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <FileText className="size-3.5" />
                            <span>
                              {dispute.evidenceUrls.length} evidence{" "}
                              {dispute.evidenceUrls.length === 1 ? "file" : "files"}
                            </span>
                          </div>
                        )}

                        {/* Created date */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          <span>
                            Opened{" "}
                            {formatDistanceToNow(new Date(dispute.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Right: Seller info + View Details */}
                      <div className="flex flex-col items-end gap-3 shrink-0">
                        {/* Seller info */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Seller:</span>
                          <button
                            onClick={() =>
                              navigate("profile", { userId: dispute.transaction.seller.id })
                            }
                            className="flex items-center gap-2 hover:bg-muted/50 rounded-lg p-1.5 transition-colors"
                          >
                            <Avatar className="size-6">
                              {dispute.transaction.seller.avatarUrl ? (
                                <AvatarImage
                                  src={dispute.transaction.seller.avatarUrl}
                                  alt={dispute.transaction.seller.name}
                                />
                              ) : (
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                  {dispute.transaction.seller.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <span className="text-sm font-medium">
                              {dispute.transaction.seller.name}
                            </span>
                          </button>
                        </div>

                        {/* View Details Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate("transaction-detail", {
                              transactionId: dispute.transactionId,
                            })
                          }
                        >
                          View Details
                          <ChevronRight className="size-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* New Dispute Dialog */}
      <Dialog
        open={newDisputeOpen}
        onOpenChange={(v) => {
          if (!v) resetNewDisputeForm();
          setNewDisputeOpen(v);
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto custom-scroll">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-rose-600 dark:text-rose-400" />
              Open New Dispute
            </DialogTitle>
            <DialogDescription>
              Report an issue with a completed transaction. Our team will review your case.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Transaction Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Transaction <span className="text-red-500">*</span>
              </label>
              <Select
                value={selectedTransactionId}
                onValueChange={setSelectedTransactionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a completed transaction" />
                </SelectTrigger>
                <SelectContent>
                  {!transactionsData || transactionsData.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      No completed transactions available
                    </SelectItem>
                  ) : (
                    transactionsData.map((tx) => (
                      <SelectItem key={tx.id} value={tx.id}>
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[200px]">
                            {tx.description || "Transaction"}
                          </span>
                          <span className="text-muted-foreground">
                            ${tx.amount.toFixed(2)}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Reason <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Describe the issue with this transaction in detail..."
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Evidence URLs */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Evidence URLs</label>
              <p className="text-xs text-muted-foreground">
                Add links to screenshots, documents, or other evidence supporting your claim.
              </p>

              {/* Existing URLs */}
              {evidenceUrls.length > 0 && (
                <div className="space-y-2">
                  {evidenceUrls.map((url, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border"
                    >
                      <LinkIcon className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground truncate flex-1">
                        {url}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-6 p-0 shrink-0"
                        onClick={() => handleRemoveEvidenceUrl(index)}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add URL input */}
              <div className="flex gap-2">
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com/evidence"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddEvidenceUrl();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddEvidenceUrl}
                  disabled={!newUrl.trim()}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetNewDisputeForm();
                setNewDisputeOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitDispute}
              disabled={
                !selectedTransactionId ||
                !disputeReason.trim() ||
                createDisputeMutation.isPending
              }
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {createDisputeMutation.isPending ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <AlertTriangle className="size-4 mr-1" />
                  Open Dispute
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
