"use client";

import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Eye,
  ShoppingCart,
  Star,
  MoreHorizontal,
  Pencil,
  Trash2,
  Play,
  Pause,
  ExternalLink,
  Package,
  CheckCircle2,
  FileEdit,
  Archive,
  DollarSign,
  Loader2,
  LayoutGrid,
  List,
  X,
  Link as LinkIcon,
  Tag,
  Image as ImageIcon,
  FileText,
  Code,
  Palette,
  PenTool,
  Megaphone,
  Video,
  Music,
  BarChart3,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigationStore } from "@/store/navigation";
import { apiGet, apiPost, apiPatch } from "@/lib/api-client";
import { toast } from "sonner";

// ── Types ──

type ProjectStatus = "DRAFT" | "PUBLISHED" | "PAUSED" | "ARCHIVED";

interface Project {
  id: string;
  authorId: string;
  title: string;
  description: string;
  shortDescription: string | null;
  category: string;
  status: ProjectStatus;
  price: number;
  thumbnailUrl: string | null;
  images: string | string[];
  tags: string | string[];
  features: string | string[];
  demoUrl: string | null;
  totalSales: number;
  totalViews: number;
  averageRating: number;
  reviewCount: number;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  salesCount?: number;
  _count?: { transactions: number };
}

interface ProjectsResponse {
  data: Project[];
  total: number;
  page: number;
  limit: number;
}

interface FormData {
  title: string;
  description: string;
  shortDescription: string;
  category: string;
  price: string;
  tags: string;
  features: string;
  demoUrl: string;
  thumbnailUrl: string;
  status: ProjectStatus;
}

// ── Constants ──

const CATEGORIES = [
  { value: "DESIGN", label: "Design", icon: Palette },
  { value: "DEVELOPMENT", label: "Development", icon: Code },
  { value: "WRITING", label: "Writing", icon: PenTool },
  { value: "MARKETING", label: "Marketing", icon: Megaphone },
  { value: "VIDEO", label: "Video", icon: Video },
  { value: "MUSIC", label: "Music", icon: Music },
  { value: "ANALYTICS", label: "Analytics", icon: BarChart3 },
  { value: "OTHER", label: "Other", icon: HelpCircle },
] as const;

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; color: string; bgColor: string; darkBgColor: string }
> = {
  PUBLISHED: {
    label: "Published",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-100",
    darkBgColor: "dark:bg-emerald-500/20",
  },
  DRAFT: {
    label: "Draft",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100",
    darkBgColor: "dark:bg-amber-500/20",
  },
  PAUSED: {
    label: "Paused",
    color: "text-sky-700 dark:text-sky-400",
    bgColor: "bg-sky-100",
    darkBgColor: "dark:bg-sky-500/20",
  },
  ARCHIVED: {
    label: "Archived",
    color: "text-zinc-700 dark:text-zinc-400",
    bgColor: "bg-zinc-100",
    darkBgColor: "dark:bg-zinc-500/20",
  },
};

const EMPTY_FORM: FormData = {
  title: "",
  description: "",
  shortDescription: "",
  category: "",
  price: "",
  tags: "",
  features: "",
  demoUrl: "",
  thumbnailUrl: "",
  status: "DRAFT",
};

// Gradient backgrounds for missing thumbnails
const CARD_GRADIENTS = [
  "from-emerald-500/20 to-teal-500/20",
  "from-amber-500/20 to-orange-500/20",
  "from-violet-500/20 to-purple-500/20",
  "from-cyan-500/20 to-sky-500/20",
  "from-rose-500/20 to-pink-500/20",
  "from-teal-500/20 to-cyan-500/20",
];

// ── Helpers ──

function parseJsonArrayField(value: string | string[] | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getCategoryIcon(category: string) {
  const cat = CATEGORIES.find((c) => c.value === category);
  return cat ? cat.icon : HelpCircle;
}

function CategoryIconDisplay({ category, className }: { category: string; className?: string }) {
  switch (category) {
    case "DESIGN": return <Palette className={className} />;
    case "DEVELOPMENT": return <Code className={className} />;
    case "WRITING": return <PenTool className={className} />;
    case "MARKETING": return <Megaphone className={className} />;
    case "VIDEO": return <Video className={className} />;
    case "MUSIC": return <Music className={className} />;
    case "ANALYTICS": return <BarChart3 className={className} />;
    default: return <HelpCircle className={className} />;
  }
}

function getCategoryLabel(category: string) {
  const cat = CATEGORIES.find((c) => c.value === category);
  return cat ? cat.label : category;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Skeleton Loader ──

function SkeletonCards() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-20" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-72" />
        ))}
      </div>
    </div>
  );
}

// ── Main Component ──

export function DashboardMyProjectsPage() {
  const queryClient = useQueryClient();
  const { navigate } = useNavigationStore();

  // State
  const [activeTab, setActiveTab] = useState<"ALL" | ProjectStatus>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const limit = 12;

  // ── Queries ──

  const queryParams = new URLSearchParams();
  if (activeTab !== "ALL") queryParams.set("status", activeTab);
  if (search) queryParams.set("search", search);
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));

  const { data, isLoading } = useQuery({
    queryKey: ["my-projects", activeTab, search, page],
    queryFn: async () => {
      const json = await apiGet<{ data: ProjectsResponse }>(
        `/api/projects/my?${queryParams.toString()}`
      );
      return json.data;
    },
  });

  const projects = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // ── Mutations ──

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const json = await apiPost<{ data: Project }>("/api/projects", body);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
      toast.success("Project created successfully!");
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create project");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      const json = await apiPatch<{ data: Project }>(`/api/projects/${id}`, body);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
      toast.success("Project updated successfully!");
      setEditingProject(null);
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update project");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (project: Project) => {
      await apiPatch(`/api/projects/${project.id}`, { status: "ARCHIVED" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
      toast.success("Project archived successfully");
      setDeletingProject(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to archive project");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ project, newStatus }: { project: Project; newStatus: ProjectStatus }) => {
      await apiPatch(`/api/projects/${project.id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
      toast.success("Project status updated");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update status");
    },
  });

  // ── Form Handlers ──

  const resetForm = useCallback(() => {
    setFormData(EMPTY_FORM);
  }, []);

  const openCreateDialog = useCallback(() => {
    resetForm();
    setShowCreateDialog(true);
  }, [resetForm]);

  const openEditDialog = useCallback((project: Project) => {
    const tags = parseJsonArrayField(project.tags);
    const features = parseJsonArrayField(project.features);

    setFormData({
      title: project.title,
      description: project.description,
      shortDescription: project.shortDescription || "",
      category: project.category,
      price: String(project.price),
      tags: tags.join(", "),
      features: features.join("\n"),
      demoUrl: project.demoUrl || "",
      thumbnailUrl: project.thumbnailUrl || "",
      status: project.status,
    });
    setEditingProject(project);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (!formData.category) {
      toast.error("Category is required");
      return;
    }
    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      toast.error("Price must be a positive number");
      return;
    }

    const tags = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const features = formData.features
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    const body: Record<string, unknown> = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      shortDescription: formData.shortDescription.trim() || undefined,
      category: formData.category,
      price,
      tags,
      features,
      demoUrl: formData.demoUrl.trim() || undefined,
      thumbnailUrl: formData.thumbnailUrl.trim() || undefined,
    };

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, body });
    } else {
      body.status = formData.status;
      createMutation.mutate(body);
    }
  }, [formData, editingProject, createMutation, updateMutation]);

  const handleToggleStatus = useCallback(
    (project: Project) => {
      let newStatus: ProjectStatus;
      switch (project.status) {
        case "PUBLISHED":
          newStatus = "PAUSED";
          break;
        case "PAUSED":
          newStatus = "PUBLISHED";
          break;
        case "DRAFT":
          newStatus = "PUBLISHED";
          break;
        case "ARCHIVED":
          newStatus = "DRAFT";
          break;
        default:
          newStatus = "DRAFT";
      }
      toggleStatusMutation.mutate({ project, newStatus });
    },
    [toggleStatusMutation]
  );

  const handleDelete = useCallback(() => {
    if (deletingProject) {
      deleteMutation.mutate(deletingProject);
    }
  }, [deletingProject, deleteMutation]);

  // ── Stats ──

  const allProjectsForStats = useQuery({
    queryKey: ["my-projects-stats"],
    queryFn: async () => {
      const json = await apiGet<{ data: ProjectsResponse }>("/api/projects/my?limit=1000");
      return json.data;
    },
  });

  const statsProjects = allProjectsForStats.data?.data || [];
  const statsTotalProjects = allProjectsForStats.data?.total || 0;
  const statsPublished = statsProjects.filter((p) => p.status === "PUBLISHED").length;
  const statsDrafts = statsProjects.filter((p) => p.status === "DRAFT").length;
  const statsRevenue = statsProjects.reduce(
    (acc, p) => acc + (p.totalSales || 0) * (p.price || 0),
    0
  );

  // ── Render ──

  if (isLoading) {
    return <SkeletonCards />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Projects</h1>
          <p className="text-muted-foreground mt-1">
            Create, manage, and track your digital projects
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
        >
          <Plus className="size-4 mr-1.5" />
          Create New Project
        </Button>
      </motion.div>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Package className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">{statsTotalProjects}</p>
                <p className="text-xs text-muted-foreground">Total Projects</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">{statsPublished}</p>
                <p className="text-xs text-muted-foreground">Published</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <FileEdit className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">{statsDrafts}</p>
                <p className="text-xs text-muted-foreground">Drafts</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                <DollarSign className="size-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">
                  {formatCurrency(statsRevenue)}
                </p>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Search + Filter Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  className="pl-9 h-9"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <Tabs
                value={activeTab}
                onValueChange={(v) => {
                  setActiveTab(v as "ALL" | ProjectStatus);
                  setPage(1);
                }}
              >
                <TabsList className="h-9">
                  <TabsTrigger value="ALL" className="text-xs px-3 h-7">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="PUBLISHED" className="text-xs px-3 h-7">
                    Published
                  </TabsTrigger>
                  <TabsTrigger value="DRAFT" className="text-xs px-3 h-7">
                    Draft
                  </TabsTrigger>
                  <TabsTrigger value="PAUSED" className="text-xs px-3 h-7">
                    Paused
                  </TabsTrigger>
                  <TabsTrigger value="ARCHIVED" className="text-xs px-3 h-7">
                    Archived
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* View Mode Toggle */}
              <div className="flex items-center border border-border rounded-md p-0.5 shrink-0">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="size-3.5" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode("list")}
                >
                  <List className="size-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Projects Grid/List */}
      {projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="size-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                  <Package className="size-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {search || activeTab !== "ALL"
                    ? "No projects match your filters"
                    : "No projects yet"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                  {search || activeTab !== "ALL"
                    ? "Try adjusting your search or filter criteria"
                    : "Create your first project and start selling your digital products to the marketplace"}
                </p>
                {!search && activeTab === "ALL" && (
                  <Button
                    onClick={openCreateDialog}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Plus className="size-4 mr-1.5" />
                    Create Your First Project
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${viewMode}-${page}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  : "space-y-3"
              }
            >
              {projects.map((project, index) =>
                viewMode === "grid" ? (
                  <ProjectCardGrid
                    key={project.id}
                    project={project}
                    index={index}
                    onEdit={openEditDialog}
                    onView={(p) => navigate("project-detail", { projectId: p.id })}
                    onToggleStatus={handleToggleStatus}
                    onDelete={setDeletingProject}
                    isTogglingStatus={toggleStatusMutation.isPending}
                  />
                ) : (
                  <ProjectCardList
                    key={project.id}
                    project={project}
                    index={index}
                    onEdit={openEditDialog}
                    onView={(p) => navigate("project-detail", { projectId: p.id })}
                    onToggleStatus={handleToggleStatus}
                    onDelete={setDeletingProject}
                    isTogglingStatus={toggleStatusMutation.isPending}
                  />
                )
              )}
            </motion.div>
          </AnimatePresence>

          {/* Pagination */}
          {totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-between"
            >
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}{" "}
                projects
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      className={`h-8 w-8 p-0 ${
                        page === pageNum
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : ""
                      }`}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreateDialog || !!editingProject}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingProject(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingProject ? "Edit Project" : "Create New Project"}
            </DialogTitle>
            <DialogDescription>
              {editingProject
                ? "Update your project details below"
                : "Fill in the details to create a new project"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g. Premium Dashboard UI Kit"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Short Description */}
            <div className="space-y-2">
              <Label htmlFor="shortDescription" className="text-sm font-medium">
                Short Description
              </Label>
              <Input
                id="shortDescription"
                placeholder="Brief summary of your project (max 500 chars)"
                maxLength={500}
                value={formData.shortDescription}
                onChange={(e) =>
                  setFormData({ ...formData, shortDescription: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                {formData.shortDescription.length}/500 characters
              </p>
            </div>

            {/* Full Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Full Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe your project in detail. What does it include? Who is it for?"
                rows={5}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <Separator />

            {/* Category + Price Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="size-4 text-muted-foreground" />
                            {cat.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <Label htmlFor="price" className="text-sm font-medium">
                  Price (USD) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="29.99"
                    className="pl-9"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags" className="text-sm font-medium">
                <div className="flex items-center gap-1.5">
                  <Tag className="size-3.5" />
                  Tags
                </div>
              </Label>
              <Input
                id="tags"
                placeholder="Comma separated: react, dashboard, ui-kit"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Separate tags with commas
              </p>
            </div>

            {/* Features */}
            <div className="space-y-2">
              <Label htmlFor="features" className="text-sm font-medium">
                <div className="flex items-center gap-1.5">
                  <FileText className="size-3.5" />
                  Features
                </div>
              </Label>
              <Textarea
                id="features"
                placeholder={"One feature per line:\nResponsive design\nDark mode support\n50+ components"}
                rows={4}
                value={formData.features}
                onChange={(e) =>
                  setFormData({ ...formData, features: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                One feature per line
              </p>
            </div>

            <Separator />

            {/* URLs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Demo URL */}
              <div className="space-y-2">
                <Label htmlFor="demoUrl" className="text-sm font-medium">
                  <div className="flex items-center gap-1.5">
                    <LinkIcon className="size-3.5" />
                    Demo URL
                  </div>
                </Label>
                <Input
                  id="demoUrl"
                  placeholder="https://demo.example.com"
                  value={formData.demoUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, demoUrl: e.target.value })
                  }
                />
              </div>

              {/* Thumbnail URL */}
              <div className="space-y-2">
                <Label htmlFor="thumbnailUrl" className="text-sm font-medium">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="size-3.5" />
                    Thumbnail URL
                  </div>
                </Label>
                <Input
                  id="thumbnailUrl"
                  placeholder="https://example.com/thumb.jpg"
                  value={formData.thumbnailUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, thumbnailUrl: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Status selector (only for create) */}
            {!editingProject && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value as ProjectStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">
                      <div className="flex items-center gap-2">
                        <FileEdit className="size-4 text-amber-500" />
                        Save as Draft
                      </div>
                    </SelectItem>
                    <SelectItem value="PUBLISHED">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-500" />
                        Publish Immediately
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setEditingProject(null);
                resetForm();
              }}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              )}
              {editingProject ? "Update Project" : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingProject}
        onOpenChange={(open) => {
          if (!open) setDeletingProject(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Project</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive &quot;{deletingProject?.title}&quot;. The project will be hidden
              from the marketplace but can be restored later by changing its
              status. This action is reversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              )}
              Archive Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Grid Card ──

function ProjectCardGrid({
  project,
  index,
  onEdit,
  onView,
  onToggleStatus,
  onDelete,
  isTogglingStatus,
}: {
  project: Project;
  index: number;
  onEdit: (p: Project) => void;
  onView: (p: Project) => void;
  onToggleStatus: (p: Project) => void;
  onDelete: (p: Project) => void;
  isTogglingStatus: boolean;
}) {
  const statusConfig = STATUS_CONFIG[project.status];
  const tags = parseJsonArrayField(project.tags);
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const salesCount = project.salesCount ?? project._count?.transactions ?? project.totalSales ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-border hover:border-emerald-500/30">
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-muted">
          {project.thumbnailUrl ? (
            <img
              src={project.thumbnailUrl}
              alt={project.title}
              className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div
              className={`size-full bg-gradient-to-br ${gradient} flex items-center justify-center`}
            >
              <CategoryIconDisplay category={project.category} className="size-12 text-muted-foreground/30" />
            </div>
          )}

          {/* Status badge */}
          <div className="absolute top-2 left-2">
            <Badge
              variant="secondary"
              className={`${statusConfig.bgColor} ${statusConfig.darkBgColor} ${statusConfig.color} text-[10px] font-medium backdrop-blur-sm`}
            >
              {statusConfig.label}
            </Badge>
          </div>

          {/* Featured badge */}
          {project.featured && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-amber-500 text-white text-[10px]">Featured</Badge>
            </div>
          )}

          {/* Hover overlay with quick actions */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs shadow-lg"
              onClick={() => onEdit(project)}
            >
              <Pencil className="size-3 mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs shadow-lg"
              onClick={() => onView(project)}
            >
              <Eye className="size-3 mr-1" />
              View
            </Button>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-4 space-y-3">
          {/* Title + Category */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm text-foreground line-clamp-1">
                {project.title}
              </h3>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                {formatCurrency(project.price)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <CategoryIconDisplay category={project.category} className="size-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {getCategoryLabel(project.category)}
              </span>
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-[10px] h-5 px-1.5 font-normal"
                >
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge
                  variant="outline"
                  className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground"
                >
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="size-3" />
              {project.totalViews}
            </div>
            <div className="flex items-center gap-1">
              <ShoppingCart className="size-3" />
              {salesCount}
            </div>
            {project.reviewCount > 0 && (
              <div className="flex items-center gap-1">
                <Star className="size-3 fill-amber-400 text-amber-400" />
                {project.averageRating.toFixed(1)}
              </div>
            )}
          </div>

          {/* Footer: Date + Actions */}
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <span className="text-[10px] text-muted-foreground">
              {formatDate(project.createdAt)}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => onEdit(project)}>
                  <Pencil className="size-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onView(project)}>
                  <ExternalLink className="size-4 mr-2" />
                  View
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onToggleStatus(project)}
                  disabled={isTogglingStatus}
                >
                  {project.status === "PUBLISHED" ? (
                    <>
                      <Pause className="size-4 mr-2" />
                      Pause
                    </>
                  ) : project.status === "PAUSED" ? (
                    <>
                      <Play className="size-4 mr-2" />
                      Resume
                    </>
                  ) : project.status === "DRAFT" ? (
                    <>
                      <Play className="size-4 mr-2" />
                      Publish
                    </>
                  ) : (
                    <>
                      <Archive className="size-4 mr-2" />
                      Restore
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                  onClick={() => onDelete(project)}
                >
                  <Trash2 className="size-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── List Card ──

function ProjectCardList({
  project,
  index,
  onEdit,
  onView,
  onToggleStatus,
  onDelete,
  isTogglingStatus,
}: {
  project: Project;
  index: number;
  onEdit: (p: Project) => void;
  onView: (p: Project) => void;
  onToggleStatus: (p: Project) => void;
  onDelete: (p: Project) => void;
  isTogglingStatus: boolean;
}) {
  const statusConfig = STATUS_CONFIG[project.status];
  const tags = parseJsonArrayField(project.tags);
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const salesCount = project.salesCount ?? project._count?.transactions ?? project.totalSales ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
    >
      <Card className="group hover:shadow-md hover:border-emerald-500/30 transition-all">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Thumbnail */}
            <div
              className="w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-muted cursor-pointer"
              onClick={() => onView(project)}
            >
              {project.thumbnailUrl ? (
                <img
                  src={project.thumbnailUrl}
                  alt={project.title}
                  className="size-full object-cover"
                />
              ) : (
                <div
                  className={`size-full bg-gradient-to-br ${gradient} flex items-center justify-center`}
                >
                  <CategoryIconDisplay category={project.category} className="size-6 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className="font-semibold text-sm text-foreground truncate cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      onClick={() => onView(project)}
                    >
                      {project.title}
                    </h3>
                    {project.featured && (
                      <Badge className="bg-amber-500 text-white text-[9px] h-4 px-1">
                        Featured
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge
                      variant="secondary"
                      className={`${statusConfig.bgColor} ${statusConfig.darkBgColor} ${statusConfig.color} text-[10px] h-5`}
                    >
                      {statusConfig.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CategoryIconDisplay category={project.category} className="size-3" />
                      {getCategoryLabel(project.category)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(project.createdAt)}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                  {formatCurrency(project.price)}
                </span>
              </div>

              {/* Tags + Stats Row */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  {tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-[10px] h-5 px-1.5 font-normal"
                    >
                      {tag}
                    </Badge>
                  ))}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground ml-2">
                    <div className="flex items-center gap-0.5">
                      <Eye className="size-3" />
                      {project.totalViews}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <ShoppingCart className="size-3" />
                      {salesCount}
                    </div>
                    {project.reviewCount > 0 && (
                      <div className="flex items-center gap-0.5">
                        <Star className="size-3 fill-amber-400 text-amber-400" />
                        {project.averageRating.toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onEdit(project)}
                  >
                    <Pencil className="size-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onToggleStatus(project)}
                    disabled={isTogglingStatus}
                  >
                    {project.status === "PUBLISHED" ? (
                      <>
                        <Pause className="size-3 mr-1" />
                        Pause
                      </>
                    ) : project.status === "PAUSED" ? (
                      <>
                        <Play className="size-3 mr-1" />
                        Resume
                      </>
                    ) : project.status === "DRAFT" ? (
                      <>
                        <Play className="size-3 mr-1" />
                        Publish
                      </>
                    ) : (
                      <>
                        <Archive className="size-3 mr-1" />
                        Restore
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    onClick={() => onDelete(project)}
                  >
                    <Trash2 className="size-3 mr-1" />
                    Archive
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
