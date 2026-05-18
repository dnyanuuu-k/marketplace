"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Search, Flag, Eye, Trash2, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiPatch, apiDelete } from "@/lib/api-client";

// ---- Types ----
interface Review {
  id: string;
  transactionId: string;
  reviewerId: string;
  authorId: string;
  rating: number;
  comment: string;
  reply: string | null;
  repliedAt: string | null;
  flagged: boolean;
  createdAt: string;
  reviewer: { id: string; name: string; avatarUrl: string | null };
  author: { id: string; name: string; avatarUrl: string | null };
  transaction: { id: string; amount: number; description: string | null };
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

export function AdminReviewsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [ratingFilter, setRatingFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState<{ reviewId: string; reviewName: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  // Fetch reviews
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-reviews", search, flaggedOnly, ratingFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (flaggedOnly) params.set("flagged", "true");
      if (ratingFilter !== "all") params.set("rating", ratingFilter);
      if (search) params.set("search", search);

      return apiFetch(`/api/reviews?${params}`);
    },
  });

  // Delete review mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiDelete(`/api/reviews/${id}`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      setDeleteDialog(null);
      setDeleteReason("");
      toast({ title: "Review deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Clear flag mutation (PATCH the review)
  const clearFlagMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      return apiPatch(`/api/reviews/${reviewId}`, { flagged: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast({ title: "Flag cleared" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const reviews: Review[] = data?.data?.data || [];
  const total = data?.data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load reviews</p>
          <Button variant="outline" className="mt-2" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-reviews"] })}>
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
          <h1 className="text-2xl font-bold tracking-tight">Review Moderation</h1>
          <p className="text-muted-foreground mt-1">Monitor and moderate user reviews</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search reviews by comment..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select value={ratingFilter} onValueChange={(v) => { setRatingFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="5">5 Stars</SelectItem>
            <SelectItem value="4">4 Stars</SelectItem>
            <SelectItem value="3">3 Stars</SelectItem>
            <SelectItem value="2">2 Stars</SelectItem>
            <SelectItem value="1">1 Star</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch
            checked={flaggedOnly}
            onCheckedChange={(v) => { setFlaggedOnly(v); setPage(1); }}
          />
          <Label className="text-sm flex items-center gap-1">
            <Flag className="size-3" /> Flagged only
          </Label>
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-4">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Skeleton className="size-9 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          : reviews.length === 0
          ? (
            <div className="text-center py-12 text-muted-foreground">
              No reviews found
            </div>
          )
          : reviews.map((review) => (
              <Card key={review.id} className={review.flagged ? "border-amber-500/50" : ""}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="size-9 shrink-0">
                        {review.reviewer.avatarUrl ? (
                          <AvatarImage src={review.reviewer.avatarUrl} alt={review.reviewer.name} />
                        ) : null}
                        <AvatarFallback className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          {review.reviewer.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{review.reviewer.name}</span>
                          <span className="text-xs text-muted-foreground">→</span>
                          <span className="text-sm">{review.author.name}</span>
                          {review.transaction.description && (
                            <Badge variant="secondary" className="text-[10px]">
                              {review.transaction.description}
                            </Badge>
                          )}
                          {review.flagged && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              <Flag className="size-3 mr-1" />Flagged
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`size-3 ${
                                star <= review.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground/30"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-sm mt-2">{review.comment}</p>
                        {review.reply && (
                          <div className="mt-2 ml-4 pl-3 border-l-2 border-border">
                            <p className="text-xs text-muted-foreground mb-1">Author reply:</p>
                            <p className="text-sm">{review.reply}</p>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(review.createdAt)} · {formatCurrency(review.transaction.amount)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {review.flagged && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-emerald-600"
                          onClick={() => clearFlagMutation.mutate(review.id)}
                          disabled={clearFlagMutation.isPending}
                        >
                          <ShieldCheck className="size-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        onClick={() =>
                          setDeleteDialog({
                            reviewId: review.id,
                            reviewName: `Review by ${review.reviewer.name}`,
                          })
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

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

      {/* Delete Review Dialog */}
      <Dialog
        open={!!deleteDialog}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog(null);
            setDeleteReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
            <DialogDescription>
              Delete {deleteDialog?.reviewName}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason for deletion (required)</Label>
              <Textarea
                placeholder="Provide a reason..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialog(null); setDeleteReason(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteDialog && deleteReason.trim()) {
                  deleteMutation.mutate({ id: deleteDialog.reviewId, reason: deleteReason });
                }
              }}
              disabled={!deleteReason.trim() || deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
