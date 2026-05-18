"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Globe,
  Github,
  Twitter,
  Linkedin,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
  ImageIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ConfirmModal } from "@/components/shared/confirm-modal";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { SearchInput } from "@/components/shared/search-input";
import { apiFetch, apiPatch } from "@/lib/api-client";

interface AuthorApplication {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  createdAt: string;
  profile: {
    id: string;
    bio: string | null;
    skills: string[];
    portfolioImages: string[];
    socialLinks: Record<string, string>;
    location: string | null;
    coverImageUrl: string | null;
    isVerified: boolean;
  } | null;
}

interface ApplicationsResponse {
  success: boolean;
  data: {
    data: AuthorApplication[];
    total: number;
    page: number;
    limit: number;
  };
}

const SOCIAL_ICONS: Record<string, React.ElementType> = {
  website: Globe,
  github: Github,
  twitter: Twitter,
  linkedin: Linkedin,
};

export function ModApplicationsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedApp, setSelectedApp] = useState<AuthorApplication | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionTarget, setActionTarget] = useState<AuthorApplication | null>(null);

  // Fetch applications based on tab
  const { data, isLoading, isError, refetch } = useQuery<ApplicationsResponse>({
    queryKey: ["mod-applications", activeTab, search, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        role: "AUTHOR",
        status: activeTab,
        page: String(page),
        limit: "20",
      });
      if (search) params.set("search", search);
      return apiFetch(`/api/users?${params}`);
    },
  });

  // Fetch stats
  const { data: pendingData } = useQuery<ApplicationsResponse>({
    queryKey: ["mod-applications", "PENDING", "", 1],
    queryFn: async () => {
      const params = new URLSearchParams({ role: "AUTHOR", status: "PENDING", limit: "1" });
      return apiFetch(`/api/users?${params}`);
    },
  });

  const { data: approvedData } = useQuery<ApplicationsResponse>({
    queryKey: ["mod-applications", "ACTIVE", "", 1],
    queryFn: async () => {
      const params = new URLSearchParams({ role: "AUTHOR", status: "ACTIVE", limit: "1" });
      return apiFetch(`/api/users?${params}`);
    },
  });

  const { data: rejectedData } = useQuery<ApplicationsResponse>({
    queryKey: ["mod-applications", "SUSPENDED", "", 1],
    queryFn: async () => {
      const params = new URLSearchParams({ role: "AUTHOR", status: "SUSPENDED", limit: "1" });
      return apiFetch(`/api/users?${params}`);
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (app: AuthorApplication) => {
      // Set user status to ACTIVE
      return apiPatch(`/api/users/${app.id}/status`, { status: "ACTIVE", reason: "Author application approved" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-applications"] });
      setApproveModalOpen(false);
      setActionTarget(null);
      setDetailOpen(false);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ app, reason }: { app: AuthorApplication; reason: string }) => {
      return apiPatch(`/api/users/${app.id}/status`, { status: "SUSPENDED", reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-applications"] });
      setRejectModalOpen(false);
      setActionTarget(null);
      setRejectReason("");
      setDetailOpen(false);
    },
  });

  const applications = data?.data?.data ?? [];
  const totalPages = Math.ceil((data?.data?.total ?? 0) / 20);

  const handleViewApplication = (app: AuthorApplication) => {
    setSelectedApp(app);
    setDetailOpen(true);
  };

  const handleApproveClick = (app: AuthorApplication) => {
    setActionTarget(app);
    setApproveModalOpen(true);
  };

  const handleRejectClick = (app: AuthorApplication) => {
    setActionTarget(app);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const handleConfirmApprove = () => {
    if (actionTarget) {
      approveMutation.mutate(actionTarget);
    }
  };

  const handleConfirmReject = () => {
    if (actionTarget && rejectReason.trim()) {
      rejectMutation.mutate({ app: actionTarget, reason: rejectReason.trim() });
    }
  };

  const getSocialLinks = (links: Record<string, string> | undefined) => {
    if (!links || typeof links !== "object") return [];
    return Object.entries(links).filter(([, url]) => url && url.trim());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Author Applications</h1>
          <p className="text-muted-foreground mt-1">Review and process author applications</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Clock className="size-5" />}
          label="Pending Review"
          value={pendingData?.data?.total ?? 0}
          trend="neutral"
        />
        <StatCard
          icon={<CheckCircle2 className="size-5" />}
          label="Approved"
          value={approvedData?.data?.total ?? 0}
          trend="up"
        />
        <StatCard
          icon={<XCircle className="size-5" />}
          label="Rejected"
          value={rejectedData?.data?.total ?? 0}
          trend="down"
        />
      </div>

      {/* Tabs + Search */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="PENDING" className="gap-1.5">
              <Clock className="size-3.5" />
              Pending
              {pendingData?.data?.total ? (
                <Badge variant="secondary" className="ml-1 size-5 p-0 text-[10px] flex items-center justify-center">
                  {pendingData.data.total}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="ACTIVE" className="gap-1.5">
              <CheckCircle2 className="size-3.5" />
              Approved
            </TabsTrigger>
            <TabsTrigger value="SUSPENDED" className="gap-1.5">
              <XCircle className="size-3.5" />
              Rejected
            </TabsTrigger>
          </TabsList>
          <SearchInput
            placeholder="Search by name or email..."
            onSearch={(val) => { setSearch(val); setPage(1); }}
            className="max-w-xs"
          />
        </div>

        {/* Tab Content */}
        {["PENDING", "ACTIVE", "SUSPENDED"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4 space-y-4">
            {isLoading ? (
              <LoadingSkeleton />
            ) : isError ? (
              <ErrorState onRetry={() => refetch()} />
            ) : applications.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="size-12" />}
                title={
                  tab === "PENDING"
                    ? "No pending applications"
                    : tab === "ACTIVE"
                      ? "No approved applications"
                      : "No rejected applications"
                }
                description={
                  tab === "PENDING"
                    ? "All author applications have been reviewed."
                    : "No applications match your current filters."
                }
              />
            ) : (
              <>
                <div className="space-y-4">
                  {applications.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      application={app}
                      tab={tab}
                      onView={() => handleViewApplication(app)}
                      onApprove={() => handleApproveClick(app)}
                      onReject={() => handleRejectClick(app)}
                    />
                  ))}
                </div>

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
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Application Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
          {selectedApp && (
            <>
              <SheetHeader>
                <SheetTitle>Application Details</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                  <UserAvatar
                    src={selectedApp.avatarUrl}
                    name={selectedApp.name}
                    size="xl"
                  />
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold truncate">{selectedApp.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{selectedApp.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge
                        status={selectedApp.status}
                        variant={
                          selectedApp.status === "ACTIVE"
                            ? "active"
                            : selectedApp.status === "PENDING"
                              ? "pending"
                              : "suspended"
                        }
                        size="sm"
                      />
                      <span className="text-xs text-muted-foreground">
                        Applied {format(new Date(selectedApp.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Bio */}
                {selectedApp.profile?.bio && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Bio</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedApp.profile.bio}
                    </p>
                  </div>
                )}

                {/* Location */}
                {selectedApp.profile?.location && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Location</h4>
                    <p className="text-sm text-muted-foreground">{selectedApp.profile.location}</p>
                  </div>
                )}

                {/* Skills */}
                {selectedApp.profile?.skills && selectedApp.profile.skills.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedApp.profile.skills.map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Links */}
                {getSocialLinks(selectedApp.profile?.socialLinks).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Social Links</h4>
                    <div className="space-y-2">
                      {getSocialLinks(selectedApp.profile?.socialLinks).map(([platform, url]) => {
                        const Icon = SOCIAL_ICONS[platform] || ExternalLink;
                        return (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                            <Icon className="size-4" />
                            <span className="capitalize">{platform}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Portfolio Images */}
                {selectedApp.profile?.portfolioImages &&
                  selectedApp.profile.portfolioImages.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Portfolio</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedApp.profile.portfolioImages.map((img, i) => (
                          <div
                            key={i}
                            className="aspect-video rounded-lg border bg-muted/50 overflow-hidden"
                          >
                            <img
                              src={img}
                              alt={`Portfolio ${i + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                                (e.target as HTMLImageElement).parentElement!.innerHTML =
                                  '<div class="flex items-center justify-center h-full text-muted-foreground"><svg class="size-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Verified Status */}
                {selectedApp.profile && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Verification</h4>
                    <div className="flex items-center gap-2">
                      {selectedApp.profile.isVerified ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                          <CheckCircle2 className="size-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not Verified</Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {selectedApp.status === "PENDING" && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => {
                          setActionTarget(selectedApp);
                          setApproveModalOpen(true);
                        }}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        {approveMutation.isPending ? (
                          <Loader2 className="size-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-4 mr-2" />
                        )}
                        Approve Application
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                        onClick={() => {
                          setActionTarget(selectedApp);
                          setRejectReason("");
                          setRejectModalOpen(true);
                        }}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        {rejectMutation.isPending ? (
                          <Loader2 className="size-4 mr-2 animate-spin" />
                        ) : (
                          <XCircle className="size-4 mr-2" />
                        )}
                        Reject Application
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Approve Confirmation Modal */}
      <ConfirmModal
        open={approveModalOpen}
        onOpenChange={setApproveModalOpen}
        title="Approve Author Application"
        description={
          actionTarget
            ? `Are you sure you want to approve ${actionTarget.name}? This will activate their account and mark their profile as verified.`
            : "Are you sure you want to approve this application?"
        }
        confirmLabel="Approve"
        severity="default"
        onConfirm={handleConfirmApprove}
        isLoading={approveMutation.isPending}
      />

      {/* Reject Confirmation Modal */}
      <ConfirmModal
        open={rejectModalOpen}
        onOpenChange={(open) => {
          setRejectModalOpen(open);
          if (!open) setRejectReason("");
        }}
        title="Reject Author Application"
        description="Please provide a reason for rejecting this application. The applicant will be notified."
        confirmLabel="Reject Application"
        severity="danger"
        onConfirm={handleConfirmReject}
        isLoading={rejectMutation.isPending}
      >
        <div className="mt-3">
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="text-sm"
          />
        </div>
      </ConfirmModal>
    </div>
  );
}

// Application Card Component
function ApplicationCard({
  application,
  tab,
  onView,
  onApprove,
  onReject,
}: {
  application: AuthorApplication;
  tab: string;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const skills = application.profile?.skills ?? [];
  const socialLinks = application.profile?.socialLinks ?? {};

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          {/* Left: Avatar + Info */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <UserAvatar
              src={application.avatarUrl}
              name={application.name}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold">{application.name}</span>
                <StatusBadge
                  status={application.status}
                  variant={
                    application.status === "ACTIVE"
                      ? "active"
                      : application.status === "PENDING"
                        ? "pending"
                        : "suspended"
                  }
                  size="sm"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{application.email}</p>

              {/* Bio preview */}
              {application.profile?.bio && (
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                  {application.profile.bio}
                </p>
              )}

              {/* Skills chips */}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {skills.slice(0, 5).map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {skill}
                    </Badge>
                  ))}
                  {skills.length > 5 && (
                    <Badge variant="secondary" className="text-[10px]">
                      +{skills.length - 5}
                    </Badge>
                  )}
                </div>
              )}

              {/* Social links */}
              {Object.keys(socialLinks).filter((k) => socialLinks[k]).length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  {Object.entries(socialLinks)
                    .filter(([, url]) => url && url.trim())
                    .slice(0, 4)
                    .map(([platform, url]) => {
                      const Icon = SOCIAL_ICONS[platform] || ExternalLink;
                      return (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Icon className="size-3.5" />
                        </a>
                      );
                    })}
                </div>
              )}

              {/* Applied date */}
              <p className="text-xs text-muted-foreground mt-2">
                Applied {format(new Date(application.createdAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={onView}>
              <Eye className="size-4 mr-1" />
              View
            </Button>
            {tab === "PENDING" && (
              <>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={onApprove}
                >
                  <CheckCircle2 className="size-4 mr-1" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                  onClick={onReject}
                >
                  <XCircle className="size-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <Skeleton className="size-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
                <Skeleton className="h-3 w-full" />
                <div className="flex gap-1">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-14" />
                </div>
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
      title="Failed to load applications"
      description="Something went wrong. Please try again."
      action={{ label: "Retry", onClick: onRetry }}
    />
  );
}
