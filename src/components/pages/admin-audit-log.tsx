"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api-client";

// ---- Types ----
interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  targetId: string | null;
  targetType: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

// ---- Constants ----
const actionColors: Record<string, string> = {
  USER_STATUS_UPDATE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  USER_ROLE_UPDATE: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  SETTINGS_UPDATE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  DISPUTE_RESOLVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  PAYOUT_APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  PAYOUT_DENIED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  PAYOUT_CREATED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  TRANSACTION_STATUS_UPDATE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  NOTIFICATION_BROADCAST: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  REVIEW_REMOVED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const formatTimestamp = (d: string) =>
  new Date(d).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function AdminAuditLogPage() {
  // Filters
  const [actionFilter, setActionFilter] = useState("all");
  const [actorSearch, setActorSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Fetch audit logs
  const { data, isLoading, error } = useQuery({
    queryKey: ["audit-logs", actionFilter, actorSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (actorSearch) params.set("actor", actorSearch);

      return apiFetch(`/api/audit-logs?${params}`);
    },
  });

  const logs: AuditLogEntry[] = data?.data?.data || [];
  const total = data?.data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load audit logs</p>
          <Button
            variant="outline"
            className="mt-2"
            onClick={() => window.location.reload()}
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
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground mt-1">
            Track all administrative actions and system events
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            if (!data?.data?.data) return;
            const headers = ["Timestamp", "Actor", "Action", "Target", "Type"];
            const rows = logs.map((log) => [
              formatTimestamp(log.createdAt),
              log.actor.name,
              log.action,
              log.targetId || "",
              log.targetType || "",
            ]);
            const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "audit-log-export.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="size-4 mr-2" />
          Export Log
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by actor name..."
            className="pl-9"
            value={actorSearch}
            onChange={(e) => {
              setActorSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={actionFilter}
          onValueChange={(v) => {
            setActionFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Action Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="USER">User Actions</SelectItem>
            <SelectItem value="PAYOUT">Payout Actions</SelectItem>
            <SelectItem value="SETTINGS">Settings Changes</SelectItem>
            <SelectItem value="DISPUTE">Dispute Actions</SelectItem>
            <SelectItem value="TRANSACTION">Transaction Actions</SelectItem>
            <SelectItem value="NOTIFICATION">Notifications</SelectItem>
            <SelectItem value="REVIEW">Review Actions</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Log Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-8 p-4"></th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Timestamp</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Actor</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4">Action</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4 hidden sm:table-cell">Target</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-4 hidden md:table-cell">Type</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="p-4"><Skeleton className="size-4" /></td>
                        <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                        <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                        <td className="p-4"><Skeleton className="h-5 w-28" /></td>
                        <td className="p-4 hidden sm:table-cell"><Skeleton className="h-4 w-20" /></td>
                        <td className="p-4 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
                      </tr>
                    ))
                  : logs.map((log) => (
                      <React.Fragment key={log.id}>
                        <tr
                          className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => toggleRow(log.id)}
                        >
                          <td className="p-4">
                            {expandedRows.has(log.id) ? (
                              <ChevronDown className="size-4 text-muted-foreground" />
                            ) : (
                              <ChevronRightIcon className="size-4 text-muted-foreground" />
                            )}
                          </td>
                          <td className="p-4">
                            <span className="text-xs font-mono text-muted-foreground">
                              {formatTimestamp(log.createdAt)}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-sm">{log.actor.name}</span>
                          </td>
                          <td className="p-4">
                            <Badge
                              variant="secondary"
                              className={actionColors[log.action] || ""}
                            >
                              {log.action.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="p-4 hidden sm:table-cell">
                            <span className="text-sm font-mono">
                              {log.targetId ? log.targetId.slice(-8) : "—"}
                            </span>
                          </td>
                          <td className="p-4 hidden md:table-cell">
                            <span className="text-xs text-muted-foreground">
                              {log.targetType || "—"}
                            </span>
                          </td>
                        </tr>
                        {expandedRows.has(log.id) && (
                          <tr className="border-b border-border bg-muted/30">
                            <td colSpan={6} className="p-4">
                              <div className="ml-8 space-y-2">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  Metadata
                                </h4>
                                {log.metadata ? (
                                  <pre className="text-xs bg-background rounded-lg p-3 overflow-x-auto max-w-full">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                ) : (
                                  <p className="text-xs text-muted-foreground">No metadata available</p>
                                )}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">Actor ID:</span>{" "}
                                    <span className="font-mono">{log.actorId.slice(-8)}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Actor Email:</span>{" "}
                                    {log.actor.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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
    </div>
  );
}
