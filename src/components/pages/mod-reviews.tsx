"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Star,
  Flag,
  Trash2,
  ShieldCheck,
  AlertCircle,
  Filter,
  ArrowUpDown,
  Eye,
  MessageSquare,
  Loader2,
  ExternalLink,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ConfirmModal } from "@/components/shared/confirm-modal";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { SearchInput } from "@/components/shared/search-input";
import { ReviewCard, StarRating } from "@/components/shared/review-card";
import { useNavigationStore } from "@/store/navigation";
import { apiFetch, apiPatch, apiDelete } from "@/lib/api-client";

interface ReviewData {
  id: string;
  rating: number;
  comment: string;
  reply: string | null;
  repliedAt: string | null;
  flagged: boolean;
  createdAt: string;
  transactionId: string;
  reviewerId: string;
  authorId: string;
  reviewer: { id: string; name: string; avatarUrl: string | null };
  author: { id: string; name: string; avatarUrl: string | null };
  transaction: { id: string; amount: number; description: string | null } | null;
}

interface ReviewsResponse {
  success: boolean;
  data: {
    data: ReviewData[];
    total: number;
    page: number;
    limit: number;
  };
}

type SortOption = "newest" | "oldest" | "highest" | "lowest";

export function ModReviewsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigationStore((s) => s.navigate);

  // Filters
  const [flaggedOnly, setFlaggedOnly] = useState(true);
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);

  // Modals
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ReviewData | null>(null);

  // Detail sheet
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailReview, setDetailReview] = useState<ReviewData | null>(null);

  // Build query params
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: "20",
  });
  if (flaggedOnly) queryParams.set("flagged", "true");
  if (ratingFilter !== "all") queryParams.set("rating", ratingFilter);
  if (search) queryParams.set("search", search);

  // Sort is handled client-side via ordering param
  const sortOrder = sort === "oldest" ? "asc" : "desc";
  queryParams.set("sortOrder", sortOrder);

  const { data, isLoading, isError, refetch } = useQuery<ReviewsResponse>({
    queryKey: ["mod-reviews", flaggedOnly, ratingFilter, search, sort, page],
    queryFn: async () => {
      return apiFetch(`/api/reviews?${queryParams}`);
    },
  });

  // Stats queries
  const { data: flaggedStats } = useQuery<ReviewsResponse>({
    queryKey: ["mod-reviews-flagged-count"],
    queryFn: async () => {
      return apiFetch(`/api/reviews?flagged=true&limit=1`);
    },
  });

  const { data: totalStats } = useQuery<ReviewsResponse>({
    queryKey: ["mod-reviews-total-count"],
    queryFn: async () => {
      return apiFetch(`/api/reviews?limit=1`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ reviewId, reason }: { reviewId: string; reason: string }) => {
      return apiDelete(`/api/reviews/${reviewId}`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["mod-reviews-flagged-count"] });
      queryClient.invalidateQueries({ queryKey: ["mod-reviews-total-count"] });
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      setDeleteReason("");
      setDetailOpen(false);
    },
  });

  // Clear flag mutation
  const clearFlagMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      return apiPatch(`/api/reviews/${reviewId}`, { flagged: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["mod-reviews-flagged-count"] });
      setDetailOpen(false);
    },
  });

  const reviews = data?.data?.data ?? [];
  const totalReviews = totalStats?.data?.total ?? 0;
  const flaggedCount = flaggedStats?.data?.total ?? 0;
  const flaggedPercent = totalReviews > 0 ? ((flaggedCount / totalReviews) * 100).toFixed(1) : "0";

  // Client-side sort for rating sorts
  const sortedReviews = React.useMemo(() => {
    if (sort === "highest") return [...reviews].sort((a, b) => b.rating - a.rating);
    if (sort === "lowest") return [...reviews].sort((a, b) => a.rating - b.rating);
    return reviews;
  }, [reviews, sort]);

  const totalPages = Math.ceil((data?.data?.total ?? 0) / 20);

  const handleDeleteClick = (review: ReviewData) => {
    setDeleteTarget(review);
    setDeleteReason("");
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget && deleteReason.trim()) {
      deleteMutation.mutate({ reviewId: deleteTarget.id, reason: deleteReason.trim() });
    }
  };

  const handleViewDetail = (review: ReviewData) => {
    setDetailReview(review);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Review Moderation</h1>
          <p className="text-muted-foreground mt-1">Review and moderate flagged content</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Flag className="size-5" />}
          label="Flagged Reviews"
          value={flaggedCount}
          trend={flaggedCount > 0 ? "down" : "neutral"}
        />
        <StatCard
          icon={<Star className="size-5" />}
          label="Total Reviews"
          value={totalReviews}
          trend="neutral"
        />
        <StatCard
          icon={<AlertCircle className="size-5" />}
          label="Flagged Percentage"
          value={`${flaggedPercent}%`}
          trend={parseFloat(flaggedPercent) > 5 ? "down" : "neutral"}
        />
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Flagged Only Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="flagged-only"
                checked={flaggedOnly}
                onCheckedChange={(checked) => {
                  setFlaggedOnly(checked);
                  setPage(1);
                }}
              />
              <Label htmlFor="flagged-only" className="text-sm font-medium">
                Flagged only
              </Label>
            </div>

            {/* Rating Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rating:</span>
              <Select
                value={ratingFilter}
                onValueChange={(val) => {
                  setRatingFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="size-4 text-muted-foreground" />
              <Select
                value={sort}
                onValueChange={(val) => setSort(val as SortOption)}
              >
                <SelectTrigger className="h-8 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="highest">Highest Rating</SelectItem>
                  <SelectItem value="lowest">Lowest Rating</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <SearchInput
              placeholder="Search by comment..."
              onSearch={(val) => {
                setSearch(val);
                setPage(1);
              }}
              className="w-full sm:w-auto sm:flex-1 sm:max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : sortedReviews.length === 0 ? (
        <EmptyState
          icon={<Star className="size-12" />}
          title="No reviews found"
          description={
            flaggedOnly
              ? "There are no flagged reviews to moderate."
              : "No reviews match your current filters."
          }
          action={
            flaggedOnly
              ? {
                  label: "Show all reviews",
                  onClick: () => setFlaggedOnly(false),
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {sortedReviews.map((review) => (
            <ModeratedReviewCard
              key={review.id}
              review={review}
              onClearFlag={() => clearFlagMutation.mutate(review.id)}
              isClearingFlag={clearFlagMutation.isPending}
              onDelete={() => handleDeleteClick(review)}
              onViewDetail={() => handleViewDetail(review)}
              onViewAuthorProfile={(authorId) => navigate("profile", { userId: authorId })}
            />
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Review Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
          {detailReview && (
            <>
              <SheetHeader>
                <SheetTitle>Review Details</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Rating */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Rating</h4>
                  <StarRating rating={detailReview.rating} size="md" />
                </div>

                {/* Reviewer */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Reviewer</h4>
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      src={detailReview.reviewer.avatarUrl}
                      name={detailReview.reviewer.name}
                      size="sm"
                    />
                    <span className="text-sm">{detailReview.reviewer.name}</span>
                  </div>
                </div>

                {/* Author being reviewed */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Author Being Reviewed</h4>
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      src={detailReview.author.avatarUrl}
                      name={detailReview.author.name}
                      size="sm"
                    />
                    <span className="text-sm">{detailReview.author.name}</span>
                  </div>
                </div>

                <Separator />

                {/* Comment */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Comment</h4>
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {detailReview.comment}
                  </p>
                </div>

                {/* Author Reply */}
                {detailReview.reply && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Author Reply</h4>
                    <div className="pl-4 border-l-2 border-primary/20 bg-muted/30 rounded-r-lg p-3">
                      <p className="text-sm text-foreground/80">{detailReview.reply}</p>
                      {detailReview.repliedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Replied {format(new Date(detailReview.repliedAt), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Transaction Context */}
                {detailReview.transaction && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-2">Transaction Context</h4>
                      <Card>
                        <CardContent className="p-3 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Amount</span>
                            <span className="font-medium">${detailReview.transaction.amount.toFixed(2)}</span>
                          </div>
                          {detailReview.transaction.description && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Description</span>
                              <span className="font-medium text-right max-w-[200px] truncate">
                                {detailReview.transaction.description}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Transaction ID</span>
                            <span className="font-mono text-xs">{detailReview.transaction.id}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}

                {/* Meta */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Created {format(new Date(detailReview.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                  {detailReview.flagged && (
                    <Badge className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 text-[10px] ml-2">
                      <Flag className="size-3 mr-1" />
                      Flagged
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <Separator />
                <div className="flex items-center gap-3">
                  {detailReview.flagged && (
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => clearFlagMutation.mutate(detailReview.id)}
                      disabled={clearFlagMutation.isPending || deleteMutation.isPending}
                    >
                      {clearFlagMutation.isPending ? (
                        <Loader2 className="size-4 mr-2 animate-spin" />
                      ) : (
                        <ShieldCheck className="size-4 mr-2" />
                      )}
                      Clear Flag
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                    onClick={() => {
                      setDeleteTarget(detailReview);
                      setDeleteReason("");
                      setDeleteModalOpen(true);
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-4 mr-2" />
                    Delete Review
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteModalOpen}
        onOpenChange={(open) => {
          setDeleteModalOpen(open);
          if (!open) setDeleteReason("");
        }}
        title="Delete Review"
        description="This action cannot be undone. The review will be permanently removed and both parties will be notified."
        confirmLabel="Delete Review"
        severity="danger"
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
      >
        <div className="mt-3">
          <Textarea
            placeholder="Enter reason for deletion..."
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            rows={3}
            className="text-sm"
          />
        </div>
      </ConfirmModal>
    </div>
  );
}

// Moderated Review Card Component
function ModeratedReviewCard({
  review,
  onClearFlag,
  isClearingFlag,
  onDelete,
  onViewDetail,
  onViewAuthorProfile,
}: {
  review: ReviewData;
  onClearFlag: () => void;
  isClearingFlag: boolean;
  onDelete: () => void;
  onViewDetail: () => void;
  onViewAuthorProfile: (authorId: string) => void;
}) {
  return (
    <Card
      className={`overflow-hidden transition-shadow hover:shadow-md ${
        review.flagged ? "border-red-200 dark:border-red-500/30" : ""
      }`}
    >
      <CardContent className="p-4 sm:p-6 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <UserAvatar
              src={review.reviewer.avatarUrl}
              name={review.reviewer.name}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{review.reviewer.name}</span>
                <span className="text-xs text-muted-foreground">→</span>
                <button
                  className="text-sm text-primary hover:underline"
                  onClick={() => onViewAuthorProfile(review.author.id)}
                >
                  {review.author.name}
                </button>
                {review.flagged && (
                  <Badge className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 text-[10px]">
                    <Flag className="size-3 mr-1" />
                    Flagged
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <StarRating rating={review.rating} />
                <span className="text-xs text-muted-foreground">
                  {format(new Date(review.createdAt), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onViewDetail}
              title="View details"
            >
              <Eye className="size-4" />
            </Button>
            {review.flagged && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-emerald-600 hover:text-emerald-700"
                onClick={onClearFlag}
                disabled={isClearingFlag}
                title="Clear flag"
              >
                {isClearingFlag ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ShieldCheck className="size-4" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={onDelete}
              title="Delete review"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        {/* Comment */}
        <p className="text-sm text-foreground/90 leading-relaxed pl-11">
          {review.comment}
        </p>

        {/* Author Reply */}
        {review.reply && (
          <div className="ml-11 pl-4 border-l-2 border-primary/20 bg-muted/30 rounded-r-lg p-3">
            <p className="text-xs font-medium text-primary mb-1">Author Reply</p>
            <p className="text-sm text-foreground/80">{review.reply}</p>
          </div>
        )}

        {/* Transaction context */}
        {review.transaction && (
          <div className="ml-11 text-xs text-muted-foreground">
            Transaction: ${review.transaction.amount.toFixed(2)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 sm:p-6 space-y-3">
            <div className="flex items-start gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Error State
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      icon={<AlertCircle className="size-12" />}
      title="Failed to load reviews"
      description="Something went wrong. Please try again."
      action={{ label: "Retry", onClick: onRetry }}
    />
  );
}
