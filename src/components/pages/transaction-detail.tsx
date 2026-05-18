"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Receipt,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Star,
  ShieldAlert,
  User,
  DollarSign,
  Percent,
  ExternalLink,
  MessageSquare,
  Copy,
  Loader2,
  CircleDot,
  CircleCheck,
  CircleX,
  ShoppingBag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/status-badge";
import { useNavigationStore } from "@/store/navigation";
import { useAuthStore } from "@/store/auth";
import { apiFetch, apiPatch, apiPost } from "@/lib/api-client";
import { toast } from "sonner";

interface TransactionParty {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface TransactionReview {
  id: string;
  rating: number;
  comment: string;
  reply: string | null;
  createdAt: string;
}

interface TransactionDispute {
  id: string;
  reason: string;
  status: string;
  adminNote: string | null;
  evidenceUrls: string;
  createdAt: string;
  resolvedAt: string | null;
}

interface CommissionLog {
  id: string;
  rate: number;
  commissionAmount: number;
  createdAt: string;
}

interface TransactionDetail {
  id: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  commissionAmount: number;
  netAmount: number;
  status: "PENDING" | "COMPLETED" | "DISPUTED" | "REFUNDED";
  description: string | null;
  createdAt: string;
  updatedAt: string;
  buyer: TransactionParty;
  seller: TransactionParty;
  review: TransactionReview | null;
  dispute: TransactionDispute | null;
  commissionLog: CommissionLog | null;
}

// Timeline step component
function TimelineStep({
  icon,
  label,
  date,
  description,
  isActive,
  isLast,
}: {
  icon: React.ReactNode;
  label: string;
  date?: string;
  description: string;
  isActive: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-3">
      {/* Icon + Line */}
      <div className="flex flex-col items-center">
        <div
          className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
            isActive
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/30"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {icon}
        </div>
        {!isLast && (
          <div
            className={`w-0.5 flex-1 min-h-6 my-1 ${
              isActive ? "bg-emerald-500/30" : "bg-border"
            }`}
          />
        )}
      </div>

      {/* Content */}
      <div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
        <p className={`text-sm font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
        {date && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(date), "MMM d, yyyy 'at' h:mm a")}
          </p>
        )}
      </div>
    </div>
  );
}

// Commission breakdown bar
function CommissionBar({
  gross,
  commission,
  net,
}: {
  gross: number;
  commission: number;
  net: number;
}) {
  if (gross <= 0) return null;
  const commissionPct = (commission / gross) * 100;
  const netPct = (net / gross) * 100;

  return (
    <div className="space-y-3">
      <div className="flex h-3 rounded-full overflow-hidden bg-muted">
        <div
          className="bg-emerald-500 transition-all duration-500"
          style={{ width: `${netPct}%` }}
          title={`Net: $${net.toFixed(2)}`}
        />
        <div
          className="bg-rose-500 transition-all duration-500"
          style={{ width: `${commissionPct}%` }}
          title={`Commission: $${commission.toFixed(2)}`}
        />
      </div>
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Net to Seller</span>
          <span className="font-medium">${net.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-full bg-rose-500" />
          <span className="text-muted-foreground">Commission</span>
          <span className="font-medium">${commission.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-9" />
        <div>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-48" />
    </div>
  );
}

export function TransactionDetailPage() {
  const { pageParams, navigate, goBack } = useNavigationStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const transactionId = pageParams?.transactionId as string;

  // Admin status override state
  const [adminStatus, setAdminStatus] = useState("");
  const [adminReason, setAdminReason] = useState("");
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // Review state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Dispute state
  const [disputeReason, setDisputeReason] = useState("");
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

  // Fetch transaction detail
  const { data, isLoading, error } = useQuery({
    queryKey: ["transaction-detail", transactionId],
    queryFn: async () => {
      const json = await apiFetch(`/api/transactions/${transactionId}`);
      return (json.data ?? json) as TransactionDetail;
    },
    enabled: !!transactionId,
  });

  const tx = data;

  // Admin status override mutation
  const statusOverrideMutation = useMutation({
    mutationFn: async (payload: { status: string; reason: string }) => {
      return apiPatch(`/api/transactions/${transactionId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transaction-detail", transactionId] });
      toast.success("Transaction status updated");
      setAdminStatus("");
      setAdminReason("");
      setIsSubmittingOverride(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update status");
      setIsSubmittingOverride(false);
    },
  });

  // Submit review mutation
  const reviewMutation = useMutation({
    mutationFn: async (payload: { transactionId: string; rating: number; comment: string }) => {
      return apiPost("/api/reviews", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transaction-detail", transactionId] });
      toast.success("Review submitted successfully!");
      setReviewComment("");
      setReviewRating(5);
      setIsSubmittingReview(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to submit review");
      setIsSubmittingReview(false);
    },
  });

  // Open dispute mutation
  const disputeMutation = useMutation({
    mutationFn: async (payload: { transactionId: string; reason: string }) => {
      return apiPost("/api/disputes", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transaction-detail", transactionId] });
      toast.success("Dispute opened successfully!");
      setDisputeReason("");
      setIsSubmittingDispute(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to open dispute");
      setIsSubmittingDispute(false);
    },
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !tx) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={goBack} className="gap-2">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <Receipt className="size-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Transaction Not Found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {error?.message || "The transaction you're looking for doesn't exist or you don't have access to it."}
            </p>
            <Button variant="outline" className="mt-4" onClick={goBack}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine current user role in this transaction
  const isBuyer = user?.id === tx.buyerId;
  const isSeller = user?.id === tx.sellerId;
  const isAdmin = user?.role === "SUPER_ADMIN";

  // Commission rate
  const commissionRate = tx.commissionLog?.rate ?? (tx.amount > 0 ? (tx.commissionAmount / tx.amount) * 100 : 0);

  // Determine timeline steps based on transaction status
  const timelineSteps: Array<{
    icon: React.ReactNode;
    label: string;
    date?: string;
    description: string;
    isActive: boolean;
  }> = [
    {
      icon: <CircleDot className="size-4" />,
      label: "Created",
      date: tx.createdAt,
      description: "Transaction was initiated",
      isActive: true,
    },
    {
      icon: <Clock className="size-4" />,
      label: "Pending",
      date: tx.status !== "PENDING" ? tx.createdAt : undefined,
      description:
        tx.status === "PENDING"
          ? "Awaiting completion"
          : "Payment was being processed",
      isActive: tx.status !== "PENDING",
    },
  ];

  if (tx.status === "COMPLETED") {
    timelineSteps.push({
      icon: <CircleCheck className="size-4" />,
      label: "Completed",
      date: tx.updatedAt,
      description: "Transaction completed successfully",
      isActive: true,
    });
  } else if (tx.status === "DISPUTED") {
    timelineSteps.push(
      {
        icon: <CircleCheck className="size-4" />,
        label: "Completed",
        date: tx.updatedAt,
        description: "Transaction was completed",
        isActive: true,
      },
      {
        icon: <AlertTriangle className="size-4" />,
        label: "Disputed",
        date: tx.dispute?.createdAt,
        description: tx.dispute?.reason || "A dispute was opened",
        isActive: true,
      }
    );
    if (tx.dispute?.resolvedAt) {
      timelineSteps.push({
        icon: <CircleCheck className="size-4" />,
        label: "Resolved",
        date: tx.dispute.resolvedAt,
        description: tx.dispute.adminNote || "Dispute was resolved",
        isActive: true,
      });
    }
  } else if (tx.status === "REFUNDED") {
    timelineSteps.push(
      {
        icon: <CircleCheck className="size-4" />,
        label: "Completed",
        date: tx.updatedAt,
        description: "Transaction was completed",
        isActive: true,
      },
      {
        icon: <RotateCcw className="size-4" />,
        label: "Refunded",
        date: tx.updatedAt,
        description: "Transaction was refunded",
        isActive: true,
      }
    );
  }

  // Status display config
  const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
    PENDING: {
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-500/20",
      icon: <Clock className="size-6" />,
    },
    COMPLETED: {
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-500/20",
      icon: <CheckCircle2 className="size-6" />,
    },
    DISPUTED: {
      color: "text-red-700 dark:text-red-400",
      bg: "bg-red-100 dark:bg-red-500/20",
      icon: <AlertTriangle className="size-6" />,
    },
    REFUNDED: {
      color: "text-cyan-700 dark:text-cyan-400",
      bg: "bg-cyan-100 dark:bg-cyan-500/20",
      icon: <RotateCcw className="size-6" />,
    },
  };

  const sConfig = statusConfig[tx.status] || statusConfig.PENDING;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Button variant="ghost" onClick={goBack} className="gap-2">
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </motion.div>

      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="overflow-hidden">
          <div className={`p-6 ${sConfig.bg}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`size-14 rounded-xl flex items-center justify-center ${sConfig.bg} ring-1 ring-current/10`}>
                  {sConfig.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={tx.status} size="md" />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    ${tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </h1>
                  {tx.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {tx.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Transaction ID</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(tx.id);
                    toast.success("Transaction ID copied!");
                  }}
                  className="text-sm font-mono text-foreground hover:underline flex items-center gap-1"
                >
                  {tx.id.slice(0, 12)}...
                  <Copy className="size-3" />
                </button>
                <p className="text-xs text-muted-foreground mt-1">
                  Created {format(new Date(tx.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="size-4" />
                Transaction Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {timelineSteps.map((step, idx) => (
                  <TimelineStep
                    key={idx}
                    icon={step.icon}
                    label={step.label}
                    date={step.date}
                    description={step.description}
                    isActive={step.isActive}
                    isLast={idx === timelineSteps.length - 1}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Parties Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="size-4" />
                Parties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Buyer */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <Avatar className="size-10">
                  {tx.buyer.avatarUrl ? (
                    <AvatarImage src={tx.buyer.avatarUrl} alt={tx.buyer.name} />
                  ) : (
                    <AvatarFallback className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                      {tx.buyer.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{tx.buyer.name}</p>
                    <Badge variant="secondary" className="text-[10px] bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400 px-1.5 py-0">
                      Buyer
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{tx.buyer.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("profile", { userId: tx.buyer.id })}
                >
                  <ExternalLink className="size-4" />
                </Button>
              </div>

              {/* Seller */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <Avatar className="size-10">
                  {tx.seller.avatarUrl ? (
                    <AvatarImage src={tx.seller.avatarUrl} alt={tx.seller.name} />
                  ) : (
                    <AvatarFallback className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {tx.seller.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{tx.seller.name}</p>
                    <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 px-1.5 py-0">
                      Seller
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{tx.seller.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("profile", { userId: tx.seller.id })}
                >
                  <ExternalLink className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Commission Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="size-4" />
              Commission Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Gross Amount
                </p>
                <p className="text-2xl font-bold">${tx.amount.toFixed(2)}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-rose-500/5 dark:bg-rose-500/10">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Platform Commission
                </p>
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  ${tx.commissionAmount.toFixed(2)}
                </p>
                <p className="text-xs text-rose-500 mt-1">
                  <Percent className="size-3 inline mr-0.5" />
                  {commissionRate.toFixed(1)}% rate
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-emerald-500/5 dark:bg-emerald-500/10">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Net to Seller
                </p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  ${tx.netAmount.toFixed(2)}
                </p>
              </div>
            </div>
            <CommissionBar
              gross={tx.amount}
              commission={tx.commissionAmount}
              net={tx.netAmount}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Linked Items Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Review */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="size-4" />
                Review
              </CardTitle>
              <CardDescription>
                {tx.review ? "Review left for this transaction" : "No review yet"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tx.review ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`size-4 ${
                            star <= tx.review!.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">
                      {tx.review.rating}.0
                    </span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    {tx.review.comment}
                  </p>
                  {tx.review.reply && (
                    <div className="ml-4 pl-4 border-l-2 border-emerald-500/30 space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">
                        Seller Reply
                      </p>
                      <p className="text-sm text-foreground">
                        {tx.review.reply}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(tx.review.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  No review has been left for this transaction.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Dispute */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="size-4" />
                Dispute
              </CardTitle>
              <CardDescription>
                {tx.dispute ? "Dispute details" : "No dispute opened"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tx.dispute ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={tx.dispute.status} variant="disputed" size="sm" />
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    {tx.dispute.reason}
                  </p>
                  {tx.dispute.adminNote && (
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Admin Note
                      </p>
                      <p className="text-sm">{tx.dispute.adminNote}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Opened{" "}
                    {formatDistanceToNow(new Date(tx.dispute.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  No dispute has been opened for this transaction.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Actions Section (Role-dependent) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {/* BUYER Actions */}
            {isBuyer && (
              <div className="space-y-6">
                {/* Open Dispute */}
                {tx.status === "COMPLETED" && !tx.dispute && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Having an Issue?
                    </h4>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Textarea
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="Describe the issue with this transaction..."
                        rows={2}
                        className="resize-none flex-1"
                      />
                      <Button
                        variant="destructive"
                        onClick={() => {
                          if (!disputeReason.trim()) return;
                          setIsSubmittingDispute(true);
                          disputeMutation.mutate({
                            transactionId: tx.id,
                            reason: disputeReason.trim(),
                          });
                        }}
                        disabled={!disputeReason.trim() || isSubmittingDispute}
                        className="sm:self-end"
                      >
                        {isSubmittingDispute ? (
                          <Loader2 className="size-4 mr-1 animate-spin" />
                        ) : (
                          <AlertTriangle className="size-4 mr-1" />
                        )}
                        Open Dispute
                      </Button>
                    </div>
                  </div>
                )}

                {/* Leave Review */}
                {tx.status === "COMPLETED" && !tx.review && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Leave a Review
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">Rating:</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className="p-0.5 transition-transform hover:scale-110"
                            >
                              <Star
                                className={`size-6 ${
                                  star <= reviewRating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                        <span className="text-sm font-medium">{reviewRating}.0</span>
                      </div>
                      <Textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Share your experience with this transaction..."
                        rows={3}
                        className="resize-none"
                      />
                      <Button
                        onClick={() => {
                          if (!reviewComment.trim()) return;
                          setIsSubmittingReview(true);
                          reviewMutation.mutate({
                            transactionId: tx.id,
                            rating: reviewRating,
                            comment: reviewComment.trim(),
                          });
                        }}
                        disabled={!reviewComment.trim() || isSubmittingReview}
                      >
                        {isSubmittingReview ? (
                          <Loader2 className="size-4 mr-1 animate-spin" />
                        ) : (
                          <Star className="size-4 mr-1" />
                        )}
                        Submit Review
                      </Button>
                    </div>
                  </div>
                )}

                {/* Message seller */}
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate("dashboard/messages", { authorId: tx.seller.id })
                  }
                >
                  <MessageSquare className="size-4 mr-1" />
                  Message Seller
                </Button>
              </div>
            )}

            {/* AUTHOR Actions */}
            {isSeller && (
              <div className="space-y-4">
                <Button
                  variant="outline"
                  onClick={() => navigate("dashboard/earnings")}
                >
                  <DollarSign className="size-4 mr-1" />
                  View Earnings
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate("dashboard/messages", { authorId: tx.buyer.id })
                  }
                >
                  <MessageSquare className="size-4 mr-1" />
                  Message Buyer
                </Button>
              </div>
            )}

            {/* ADMIN Actions */}
            {isAdmin && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Admin: Status Override
                </h4>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={adminStatus} onValueChange={setAdminStatus}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="DISPUTED">Disputed</SelectItem>
                      <SelectItem value="REFUNDED">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={adminReason}
                    onChange={(e) => setAdminReason(e.target.value)}
                    placeholder="Reason for status change..."
                    rows={1}
                    className="resize-none flex-1"
                  />
                  <Button
                    onClick={() => {
                      if (!adminStatus || !adminReason.trim()) {
                        toast.error("Please select a status and provide a reason");
                        return;
                      }
                      setIsSubmittingOverride(true);
                      statusOverrideMutation.mutate({
                        status: adminStatus,
                        reason: adminReason.trim(),
                      });
                    }}
                    disabled={!adminStatus || !adminReason.trim() || isSubmittingOverride}
                    className="sm:self-end"
                  >
                    {isSubmittingOverride ? (
                      <Loader2 className="size-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4 mr-1" />
                    )}
                    Override
                  </Button>
                </div>
              </div>
            )}

            {/* If neither buyer, seller, nor admin (shouldn't happen) */}
            {!isBuyer && !isSeller && !isAdmin && (
              <p className="text-sm text-muted-foreground">
                No actions available for this transaction.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
