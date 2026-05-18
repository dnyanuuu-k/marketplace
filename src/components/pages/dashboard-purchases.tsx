"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingBag,
  Search,
  Eye,
  Star,
  AlertTriangle,
  X,
  Loader2,
  Plus,
  Copy,
  ExternalLink,
  MessageSquare,
  ChevronRight,
  Receipt,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { StarRating } from "@/components/shared/review-card";
import { useAuthStore } from "@/store/auth";
import { useNavigationStore } from "@/store/navigation";
import { apiFetch, apiPost } from "@/lib/api-client";
import { toast } from "sonner";

interface Transaction {
  id: string;
  amount: number;
  commissionAmount: number;
  netAmount: number;
  status: "PENDING" | "COMPLETED" | "DISPUTED" | "REFUNDED";
  description: string | null;
  createdAt: string;
  buyer: { id: string; name: string; avatarUrl: string | null };
  seller: { id: string; name: string; avatarUrl: string | null };
  review?: { id: string; rating: number; comment: string } | null;
  dispute?: { id: string; reason: string; status: string } | null;
}

interface AuthorOption {
  id: string;
  name: string;
  avatarUrl: string | null;
  averageRating: number;
  skills: string[];
}

function TransactionDetailSheet({
  tx,
  open,
  onOpenChange,
  onReviewSubmit,
  onDisputeSubmit,
  isSubmittingReview,
  isSubmittingDispute,
  reviewSubmitted,
  disputeSubmitted,
  reviewRating,
  setReviewRating,
  reviewComment,
  setReviewComment,
  disputeReason,
  setDisputeReason,
  navigate,
}: {
  tx: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewSubmit: () => void;
  onDisputeSubmit: () => void;
  isSubmittingReview: boolean;
  isSubmittingDispute: boolean;
  reviewSubmitted: boolean;
  disputeSubmitted: boolean;
  reviewRating: number;
  setReviewRating: (r: number) => void;
  reviewComment: string;
  setReviewComment: (c: string) => void;
  disputeReason: string;
  setDisputeReason: (r: string) => void;
  navigate: (page: string, params?: Record<string, string>) => void;
}) {
  if (!tx) return null;

  const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
    PENDING: {
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30",
      icon: <Receipt className="size-5 text-amber-600 dark:text-amber-400" />,
    },
    COMPLETED: {
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30",
      icon: <ShoppingBag className="size-5 text-emerald-600 dark:text-emerald-400" />,
    },
    DISPUTED: {
      color: "text-red-700 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30",
      icon: <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />,
    },
    REFUNDED: {
      color: "text-sky-700 dark:text-sky-400",
      bg: "bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30",
      icon: <TrendingDown className="size-5 text-sky-600 dark:text-sky-400" />,
    },
  };

  const config = statusConfig[tx.status] || statusConfig.PENDING;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pr-6">
          <SheetTitle className="flex items-center gap-2">
            Transaction Details
            <StatusBadge status={tx.status} size="sm" />
          </SheetTitle>
          <SheetDescription className="font-mono text-xs">
            {tx.id}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          {/* Status Banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border ${config.bg}`}
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-white/50 dark:bg-black/20 flex items-center justify-center shrink-0">
                {config.icon}
              </div>
              <div>
                <p className={`font-semibold ${config.color}`}>
                  {tx.status === "PENDING" && "Payment Pending"}
                  {tx.status === "COMPLETED" && "Transaction Completed"}
                  {tx.status === "DISPUTED" && "Under Dispute"}
                  {tx.status === "REFUNDED" && "Refunded"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(tx.createdAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Financial Details */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Payment Breakdown
                </h4>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-lg font-bold">${tx.amount.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Platform Fee</span>
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    -${tx.commissionAmount.toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Net to Seller</span>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    ${tx.netAmount.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Seller Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Seller
                </h4>
                <button
                  onClick={() => {
                    onOpenChange(false);
                    navigate("profile", { userId: tx.seller.id });
                  }}
                  className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <Avatar className="size-10">
                    {tx.seller.avatarUrl ? (
                      <AvatarImage src={tx.seller.avatarUrl} />
                    ) : (
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {tx.seller.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{tx.seller.name}</p>
                    <p className="text-xs text-muted-foreground">View profile</p>
                  </div>
                  <ExternalLink className="size-4 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Description */}
          {tx.description && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Description
                  </h4>
                  <p className="text-sm leading-relaxed">{tx.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Existing Review */}
          {tx.review && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-amber-200/50 dark:border-amber-500/20">
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Your Review
                  </h4>
                  <div className="flex items-center gap-2">
                    <StarRating rating={tx.review.rating} size="md" />
                    <span className="text-sm font-medium">{tx.review.rating}.0</span>
                  </div>
                  <p className="text-sm leading-relaxed">{tx.review.comment}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Review Section for COMPLETED */}
          {tx.status === "COMPLETED" && !tx.review && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-4 space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Leave a Review
                  </h4>
                  {reviewSubmitted ? (
                    <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-center">
                      <Star className="size-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                      <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                        Review submitted successfully!
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Thank you for your feedback</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
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
                        size="sm"
                        onClick={onReviewSubmit}
                        disabled={!reviewComment.trim() || isSubmittingReview}
                        className="w-full"
                      >
                        {isSubmittingReview ? (
                          <Loader2 className="size-4 mr-1 animate-spin" />
                        ) : (
                          <Star className="size-4 mr-1" />
                        )}
                        Submit Review
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Dispute Section */}
          {tx.status === "COMPLETED" && !tx.dispute && !disputeSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card className="border-dashed">
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Having an Issue?
                  </h4>
                  <div className="space-y-3">
                    <Textarea
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="Describe the issue with this transaction..."
                      rows={2}
                      className="resize-none"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={onDisputeSubmit}
                      disabled={!disputeReason.trim() || isSubmittingDispute}
                      className="w-full"
                    >
                      {isSubmittingDispute ? (
                        <Loader2 className="size-4 mr-1 animate-spin" />
                      ) : (
                        <AlertTriangle className="size-4 mr-1" />
                      )}
                      Open Dispute
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {disputeSubmitted && tx.status === "COMPLETED" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
                <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 mb-2" />
                <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                  Dispute opened successfully
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  We&apos;ll review your case and get back to you.
                </p>
              </div>
            </motion.div>
          )}

          {tx.dispute && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-red-200 dark:border-red-500/30">
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider">
                    Dispute Status
                  </h4>
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status={tx.dispute.status} size="sm" variant="disputed" />
                  </div>
                  <p className="text-sm leading-relaxed">{tx.dispute.reason}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-2"
          >
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                navigator.clipboard.writeText(tx.id);
                toast.success("Transaction ID copied!");
              }}
            >
              <Copy className="size-4 mr-1" />
              Copy ID
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onOpenChange(false);
                navigate("dashboard/messages", { authorId: tx.seller.id });
              }}
            >
              <MessageSquare className="size-4 mr-1" />
              Message
            </Button>
          </motion.div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function NewTransactionDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [authorSearch, setAuthorSearch] = useState("");
  const [selectedAuthor, setSelectedAuthor] = useState<AuthorOption | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search authors
  const { data: authorsData } = useQuery({
    queryKey: ["search-authors", authorSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "10");
      if (authorSearch) params.set("search", authorSearch);
      params.set("role", "AUTHOR");
      const json = await apiFetch(`/api/users?${params}`);
      const result = json.data as { data: AuthorOption[]; total: number } | AuthorOption[];
      return (Array.isArray(result) ? result : (result.data || [])) as AuthorOption[];
    },
    enabled: open,
  });

  const authors = authorsData || [];

  const handleSubmit = async () => {
    if (!selectedAuthor || !amount) return;
    setIsSubmitting(true);
    try {
      await apiPost("/api/transactions", {
        sellerId: selectedAuthor.id,
        amount: parseFloat(amount),
        description: description.trim() || undefined,
      });
      toast.success("Transaction created successfully!");
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAuthorSearch("");
    setSelectedAuthor(null);
    setAmount("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Transaction</DialogTitle>
          <DialogDescription>
            Initiate a purchase from a creator
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Author Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Creator</label>
            {selectedAuthor ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <Avatar className="size-8">
                  {selectedAuthor.avatarUrl ? (
                    <AvatarImage src={selectedAuthor.avatarUrl} />
                  ) : (
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {selectedAuthor.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedAuthor.name}</p>
                  <div className="flex items-center gap-1">
                    <Star className="size-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs text-muted-foreground">
                      {selectedAuthor.averageRating.toFixed(1)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedAuthor(null)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search creators by name..."
                    value={authorSearch}
                    onChange={(e) => setAuthorSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {authors.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border custom-scroll">
                    {authors.map((author) => (
                      <button
                        key={author.id}
                        onClick={() => {
                          setSelectedAuthor(author);
                          setAuthorSearch("");
                        }}
                        className="flex items-center gap-3 w-full p-2.5 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-0"
                      >
                        <Avatar className="size-7">
                          {author.avatarUrl ? (
                            <AvatarImage src={author.avatarUrl} />
                          ) : (
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {author.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{author.name}</p>
                          <div className="flex items-center gap-1">
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                            <span className="text-xs text-muted-foreground">
                              {author.averageRating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                $
              </span>
              <Input
                type="number"
                min="1"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this transaction for?"
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Commission preview */}
          {amount && parseFloat(amount) > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 border text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span>${parseFloat(amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform Fee (10%)</span>
                <span className="text-red-600 dark:text-red-400">
                  -${(parseFloat(amount) * 0.1).toFixed(2)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Seller receives</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  ${(parseFloat(amount) * 0.9).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!selectedAuthor || !amount || parseFloat(amount) <= 0 || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="size-4 mr-1 animate-spin" />
            ) : (
              <Wallet className="size-4 mr-1" />
            )}
            Create Transaction
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DashboardPurchasesPage() {
  const { user } = useAuthStore();
  const { navigate } = useNavigationStore();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newTxOpen, setNewTxOpen] = useState(false);

  // Review form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Dispute form state
  const [disputeReason, setDisputeReason] = useState("");
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["purchases", statusFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search) params.set("userId", search);
      params.set("limit", "50");
      const json = await apiFetch(`/api/transactions?${params}`);
      const result = json.data as { data: Transaction[]; total: number } | Transaction[];
      return (Array.isArray(result) ? result : (result.data || [])) as Transaction[];
    },
  });

  const filteredData = data?.filter((tx) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      tx.description?.toLowerCase().includes(q) ||
      tx.seller.name.toLowerCase().includes(q) ||
      tx.id.toLowerCase().includes(q)
    );
  });

  const handleRowClick = (tx: Transaction) => {
    navigate("transaction-detail", { transactionId: tx.id });
  };

  const handleSubmitReview = async () => {
    if (!selectedTx || !reviewComment.trim()) return;
    setIsSubmittingReview(true);
    try {
      await apiPost("/api/reviews", {
        transactionId: selectedTx.id,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviewSubmitted(true);
      refetch();
    } catch {
      // Handle error
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleSubmitDispute = async () => {
    if (!selectedTx || !disputeReason.trim()) return;
    setIsSubmittingDispute(true);
    try {
      await apiPost("/api/disputes", {
        transactionId: selectedTx.id,
        reason: disputeReason.trim(),
      });
      setDisputeSubmitted(true);
      refetch();
    } catch {
      // Handle error
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-44" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchases</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your digital purchases
          </p>
        </div>
        <Button onClick={() => setNewTxOpen(true)}>
          <Plus className="size-4 mr-1" />
          New Transaction
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by description or seller..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="DISPUTED">Disputed</SelectItem>
            <SelectItem value="REFUNDED">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transaction Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
          <CardDescription>
            {filteredData?.length || 0} transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!filteredData || filteredData.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag />}
              title="No purchases found"
              description={
                search || statusFilter !== "ALL"
                  ? "Try adjusting your filters"
                  : "You haven't made any purchases yet"
              }
              action={
                !search && statusFilter === "ALL"
                  ? {
                      label: "Browse Projects",
                      onClick: () => navigate("browse-projects"),
                    }
                  : undefined
              }
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">
                        Description
                      </th>
                      <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">
                        Seller
                      </th>
                      <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground">
                        Amount
                      </th>
                      <th className="text-center py-3 px-2 text-xs font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground">
                        Date
                      </th>
                      <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((tx, idx) => (
                      <motion.tr
                        key={tx.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleRowClick(tx)}
                      >
                        <td className="py-3 px-2">
                          <p className="text-sm font-medium">
                            {tx.description || "Transaction"}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {tx.id.slice(0, 8)}...
                          </p>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-6">
                              {tx.seller.avatarUrl ? (
                                <AvatarImage src={tx.seller.avatarUrl} />
                              ) : (
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                  {tx.seller.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <span className="text-sm">{tx.seller.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right text-sm font-medium">
                          ${tx.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <StatusBadge status={tx.status} size="sm" />
                        </td>
                        <td className="py-3 px-2 text-right text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(tx.createdAt), {
                            addSuffix: true,
                          })}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(tx);
                            }}
                          >
                            <Eye className="size-4" />
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden space-y-3">
                {filteredData.map((tx, idx) => (
                  <motion.button
                    key={tx.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => handleRowClick(tx)}
                    className="w-full flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
                          tx.status === "COMPLETED"
                            ? "bg-emerald-500/10"
                            : tx.status === "PENDING"
                            ? "bg-amber-500/10"
                            : tx.status === "DISPUTED"
                            ? "bg-red-500/10"
                            : "bg-sky-500/10"
                        }`}
                      >
                        <ShoppingBag
                          className={`size-5 ${
                            tx.status === "COMPLETED"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : tx.status === "PENDING"
                              ? "text-amber-600 dark:text-amber-400"
                              : tx.status === "DISPUTED"
                              ? "text-red-600 dark:text-red-400"
                              : "text-sky-600 dark:text-sky-400"
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {tx.description || "Transaction"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          by {tx.seller.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-medium">${tx.amount.toFixed(2)}</p>
                        <StatusBadge status={tx.status} size="sm" />
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Transaction Detail Sheet */}
      <TransactionDetailSheet
        tx={selectedTx}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onReviewSubmit={handleSubmitReview}
        onDisputeSubmit={handleSubmitDispute}
        isSubmittingReview={isSubmittingReview}
        isSubmittingDispute={isSubmittingDispute}
        reviewSubmitted={reviewSubmitted}
        disputeSubmitted={disputeSubmitted}
        reviewRating={reviewRating}
        setReviewRating={setReviewRating}
        reviewComment={reviewComment}
        setReviewComment={setReviewComment}
        disputeReason={disputeReason}
        setDisputeReason={setDisputeReason}
        navigate={navigate}
      />

      {/* New Transaction Dialog */}
      <NewTransactionDialog
        open={newTxOpen}
        onOpenChange={setNewTxOpen}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        }}
      />
    </div>
  );
}
