"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Send, Eye, Users, UserCheck, User as UserIcon } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiPost } from "@/lib/api-client";

// ---- Types ----
interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  recipientRole: string | null;
  createdById: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const typeColors: Record<string, string> = {
  system: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  announcement: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  promotion: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const roleLabels: Record<string, string> = {
  ALL: "All Users",
  AUTHOR: "Authors Only",
  BUYER: "Buyers Only",
  MODERATOR: "Moderators Only",
  SUPER_ADMIN: "Admins Only",
};

export function AdminNotificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("system");
  const [recipientRole, setRecipientRole] = useState("ALL");

  // Preview mode
  const [showPreview, setShowPreview] = useState(false);

  // Fetch recent announcements
  const { data, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      return apiFetch("/api/notifications/broadcast");
    },
  });

  // Broadcast mutation
  const broadcastMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      message: string;
      type: string;
      recipientRole: string;
    }) => {
      return apiPost("/api/notifications/broadcast", data);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setTitle("");
      setMessage("");
      setType("system");
      setRecipientRole("ALL");
      setShowPreview(false);
      toast({
        title: "Notification sent",
        description: `Sent to ${result.data?.recipientCount || 0} users`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const announcements: Announcement[] = data?.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">Send and manage platform notifications</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
        {/* Compose Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="size-4" /> Compose Notification
            </CardTitle>
            <CardDescription>Send a notification to platform users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Notification title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Write your notification message..."
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Recipients</Label>
                <Select value={recipientRole} onValueChange={setRecipientRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Users</SelectItem>
                    <SelectItem value="AUTHOR">Authors Only</SelectItem>
                    <SelectItem value="BUYER">Buyers Only</SelectItem>
                    <SelectItem value="MODERATOR">Moderators Only</SelectItem>
                    <SelectItem value="SUPER_ADMIN">Admins Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="promotion">Promotion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Preview */}
            {showPreview && (title || message) && (
              <div className="border border-border rounded-lg p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-2">Preview</p>
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <Bell className="size-4 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{title || "Untitled"}</p>
                    <p className="text-sm text-muted-foreground">{message || "No message"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      To: {roleLabels[recipientRole]} · Type: {type}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="size-4 mr-1" />
                {showPreview ? "Hide Preview" : "Preview"}
              </Button>
              <Button
                onClick={() => {
                  broadcastMutation.mutate({ title, message, type, recipientRole });
                }}
                disabled={!title.trim() || !message.trim() || broadcastMutation.isPending}
              >
                <Send className="size-4 mr-2" />
                {broadcastMutation.isPending ? "Sending..." : "Send Notification"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Sent */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Sent</CardTitle>
            <CardDescription>Recently sent platform notifications</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))}
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No notifications sent yet
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto custom-scroll space-y-3">
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="flex items-start justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{ann.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {ann.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${typeColors[ann.type] || ""}`}
                        >
                          {ann.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {roleLabels[ann.recipientRole || "ALL"]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        By {ann.createdBy.name} · {formatDate(ann.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
