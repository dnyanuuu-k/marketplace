"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Users,
  Search,
  Eye,
  ShieldCheck,
  Ban,
  AlertCircle,
  Loader2,
  ArrowUpDown,
  Filter,
  UserCog,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { ConfirmModal } from "@/components/shared/confirm-modal";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { apiFetch, apiPatch } from "@/lib/api-client";

interface UserData {
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
    isVerified: boolean;
    location: string | null;
  } | null;
}

interface UsersResponse {
  success: boolean;
  data: {
    data: UserData[];
    total: number;
    page: number;
    limit: number;
  };
}

export function ModUsersPage() {
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Detail sheet
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  // Action modals
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [reactivateModalOpen, setReactivateModalOpen] = useState(false);
  const [actionReason, setActionReason] = useState("");
  const [actionTarget, setActionTarget] = useState<UserData | null>(null);

  // Build query params
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy,
    sortOrder,
  });
  if (search) queryParams.set("search", search);
  if (roleFilter !== "all") queryParams.set("role", roleFilter);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);

  const { data, isLoading, isError, refetch } = useQuery<UsersResponse>({
    queryKey: ["mod-users", search, roleFilter, statusFilter, page, limit, sortBy, sortOrder],
    queryFn: async () => {
      return apiFetch(`/api/users?${queryParams}`);
    },
  });

  const users = data?.data?.data ?? [];

  // Status change mutation
  const statusMutation = useMutation({
    mutationFn: async ({
      userId,
      status,
      reason,
    }: {
      userId: string;
      status: string;
      reason: string;
    }) => {
      return apiPatch(`/api/users/${userId}/status`, { status, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-users"] });
      setSuspendModalOpen(false);
      setReactivateModalOpen(false);
      setActionTarget(null);
      setActionReason("");
      setDetailOpen(false);
    },
  });

  const handleRowClick = (user: UserData) => {
    setSelectedUser(user);
    setDetailOpen(true);
  };

  const handleSuspendClick = (user: UserData) => {
    setActionTarget(user);
    setActionReason("");
    setSuspendModalOpen(true);
  };

  const handleReactivateClick = (user: UserData) => {
    setActionTarget(user);
    setActionReason("");
    setReactivateModalOpen(true);
  };

  const handleConfirmSuspend = () => {
    if (actionTarget && actionReason.trim()) {
      statusMutation.mutate({
        userId: actionTarget.id,
        status: "SUSPENDED",
        reason: actionReason.trim(),
      });
    }
  };

  const handleConfirmReactivate = () => {
    if (actionTarget) {
      statusMutation.mutate({
        userId: actionTarget.id,
        status: "ACTIVE",
        reason: actionReason.trim() || "Account reactivated by moderator",
      });
    }
  };

  const handleSort = (field: string, direction: "asc" | "desc") => {
    setSortBy(field);
    setSortOrder(direction);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "active" as const;
      case "PENDING":
        return "pending" as const;
      case "SUSPENDED":
        return "suspended" as const;
      case "BANNED":
        return "banned" as const;
      default:
        return "pending" as const;
    }
  };

  // Table columns
  const columns: ColumnDef<UserData & Record<string, unknown>>[] = [
    {
      accessorKey: "name",
      header: "User",
      size: 280,
      cell: ({ row }) => {
        const user = row.original as unknown as UserData;
        return (
          <div className="flex items-center gap-3">
            <UserAvatar src={user.avatarUrl} name={user.name} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: "Role",
      size: 120,
      cell: ({ row }) => {
        const user = row.original as unknown as UserData;
        return (
          <Badge variant="secondary" className="text-[10px]">
            {user.role}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 130,
      cell: ({ row }) => {
        const user = row.original as unknown as UserData;
        return (
          <StatusBadge
            status={user.status}
            variant={getStatusVariant(user.status)}
            size="sm"
          />
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      size: 130,
      cell: ({ row }) => {
        const user = row.original as unknown as UserData;
        return (
          <span className="text-sm text-muted-foreground">
            {format(new Date(user.createdAt), "MMM d, yyyy")}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      size: 200,
      cell: ({ row }) => {
        const user = row.original as unknown as UserData;
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {user.status === "ACTIVE" && (
              <Button
                variant="outline"
                size="sm"
                className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-500/30 dark:hover:bg-orange-500/10 text-xs"
                onClick={() => handleSuspendClick(user)}
              >
                <Ban className="size-3 mr-1" />
                Suspend
              </Button>
            )}
            {user.status === "SUSPENDED" && (
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-500/30 dark:hover:bg-emerald-500/10 text-xs"
                onClick={() => handleReactivateClick(user)}
              >
                <ShieldCheck className="size-3 mr-1" />
                Reactivate
              </Button>
            )}
            {user.status === "PENDING" && (
              <span className="text-xs text-muted-foreground">Awaiting verification</span>
            )}
            {user.status === "BANNED" && (
              <span className="text-xs text-muted-foreground">Requires admin</span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Moderation</h1>
          <p className="text-muted-foreground mt-1">Review and manage user accounts (limited access)</p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Search */}
            <SearchInput
              placeholder="Search by name or email..."
              onSearch={(val) => {
                setSearch(val);
                setPage(1);
              }}
              className="w-full sm:w-auto sm:flex-1 sm:max-w-xs"
            />

            {/* Role Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Role:</span>
              <Select
                value={roleFilter}
                onValueChange={(val) => {
                  setRoleFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="AUTHOR">Author</SelectItem>
                  <SelectItem value="BUYER">Buyer</SelectItem>
                  <SelectItem value="MODERATOR">Moderator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Status:</span>
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="BANNED">Banned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={users as (UserData & Record<string, unknown>)[]}
          totalItems={data?.data?.total ?? 0}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          onSort={handleSort}
          isLoading={isLoading}
          onRowClick={(row) => handleRowClick(row as unknown as UserData)}
          emptyMessage="No users found matching your filters."
        />
      )}

      {/* User Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-md w-full overflow-y-auto">
          {selectedUser && (
            <>
              <SheetHeader>
                <SheetTitle>User Details</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                  <UserAvatar
                    src={selectedUser.avatarUrl}
                    name={selectedUser.name}
                    size="xl"
                  />
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold truncate">{selectedUser.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{selectedUser.email}</p>
                  </div>
                </div>

                <Separator />

                {/* Info Grid */}
                <div className="space-y-4">
                  {/* Role */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Role</span>
                    <Badge variant="secondary">{selectedUser.role}</Badge>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <StatusBadge
                      status={selectedUser.status}
                      variant={getStatusVariant(selectedUser.status)}
                      size="sm"
                    />
                  </div>

                  {/* Join Date */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Joined</span>
                    <span className="text-sm">
                      {format(new Date(selectedUser.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>

                  {/* Verification Status */}
                  {selectedUser.profile && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Verified</span>
                      {selectedUser.profile.isVerified ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                          <ShieldCheck className="size-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not Verified</Badge>
                      )}
                    </div>
                  )}

                  {/* Location */}
                  {selectedUser.profile?.location && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Location</span>
                      <span className="text-sm">{selectedUser.profile.location}</span>
                    </div>
                  )}
                </div>

                {/* Bio */}
                {selectedUser.profile?.bio && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-2">Bio</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {selectedUser.profile.bio}
                      </p>
                    </div>
                  </>
                )}

                {/* Skills */}
                {selectedUser.profile?.skills && selectedUser.profile.skills.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedUser.profile.skills.map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Moderator Notice */}
                <Separator />
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Moderator Access Notice
                  </p>
                  <p className="text-xs text-muted-foreground">
                    As a moderator, you have limited access. You can suspend and reactivate users, but cannot
                    permanently ban accounts or change user roles. Financial data and commission rates are not visible.
                  </p>
                </div>

                {/* Actions */}
                <Separator />
                <div className="space-y-2">
                  {selectedUser.status === "ACTIVE" && (
                    <Button
                      variant="outline"
                      className="w-full text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-500/30 dark:hover:bg-orange-500/10"
                      onClick={() => handleSuspendClick(selectedUser)}
                      disabled={statusMutation.isPending}
                    >
                      <Ban className="size-4 mr-2" />
                      Suspend User
                    </Button>
                  )}
                  {selectedUser.status === "SUSPENDED" && (
                    <Button
                      variant="outline"
                      className="w-full text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-500/30 dark:hover:bg-emerald-500/10"
                      onClick={() => handleReactivateClick(selectedUser)}
                      disabled={statusMutation.isPending}
                    >
                      <ShieldCheck className="size-4 mr-2" />
                      Reactivate User
                    </Button>
                  )}
                  {selectedUser.status === "PENDING" && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      This user is awaiting email verification.
                    </p>
                  )}
                  {selectedUser.status === "BANNED" && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Banned accounts require admin action to restore.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Suspend Confirmation Modal */}
      <ConfirmModal
        open={suspendModalOpen}
        onOpenChange={(open) => {
          setSuspendModalOpen(open);
          if (!open) setActionReason("");
        }}
        title="Suspend User"
        description={
          actionTarget
            ? `Are you sure you want to suspend ${actionTarget.name}? They will be notified and will not be able to access their account.`
            : "Are you sure you want to suspend this user?"
        }
        confirmLabel="Suspend User"
        severity="warning"
        onConfirm={handleConfirmSuspend}
        isLoading={statusMutation.isPending}
      >
        <div className="mt-3">
          <Textarea
            placeholder="Enter reason for suspension..."
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            rows={3}
            className="text-sm"
          />
        </div>
      </ConfirmModal>

      {/* Reactivate Confirmation Modal */}
      <ConfirmModal
        open={reactivateModalOpen}
        onOpenChange={(open) => {
          setReactivateModalOpen(open);
          if (!open) setActionReason("");
        }}
        title="Reactivate User"
        description={
          actionTarget
            ? `Are you sure you want to reactivate ${actionTarget.name}? Their account access will be restored.`
            : "Are you sure you want to reactivate this user?"
        }
        confirmLabel="Reactivate User"
        severity="default"
        onConfirm={handleConfirmReactivate}
        isLoading={statusMutation.isPending}
      >
        <div className="mt-3">
          <Textarea
            placeholder="Optional reason for reactivation..."
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            rows={3}
            className="text-sm"
          />
        </div>
      </ConfirmModal>
    </div>
  );
}

// Error State
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      icon={<AlertCircle className="size-12" />}
      title="Failed to load users"
      description="Something went wrong. Please try again."
      action={{ label: "Retry", onClick: onRetry }}
    />
  );
}
