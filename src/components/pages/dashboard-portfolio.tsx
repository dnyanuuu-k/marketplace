"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  GripVertical,
  Upload,
  Loader2,
  Eye,
  LayoutGrid,
  List,
  Briefcase,
  FileEdit,
  Clock,
  CheckCircle2,
  PenSquare,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUploader } from "@/components/shared/file-uploader";
import { EmptyState } from "@/components/shared/empty-state";
import { apiFetch, apiPatch } from "@/lib/api-client";

interface PortfolioImage {
  id: string;
  url: string;
  name?: string;
  status?: "published" | "draft";
  description?: string;
  viewCount?: number;
  createdAt?: string;
}

// Predefined gradient backgrounds for portfolio card placeholders
const CARD_GRADIENTS = [
  "from-amber-500/20 to-orange-500/20",
  "from-emerald-500/20 to-teal-500/20",
  "from-violet-500/20 to-purple-500/20",
  "from-cyan-500/20 to-sky-500/20",
  "from-rose-500/20 to-pink-500/20",
  "from-teal-500/20 to-cyan-500/20",
];

function SortableImage({
  image,
  onRemove,
  viewMode,
  gradientIndex,
}: {
  image: PortfolioImage;
  onRemove: (id: string) => void;
  viewMode: "grid" | "list";
  gradientIndex: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: image.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const gradient = CARD_GRADIENTS[gradientIndex % CARD_GRADIENTS.length];
  const status = image.status || "published";

  if (viewMode === "list") {
    return (
      <div ref={setNodeRef} style={style} className="group">
        <div className="flex items-center gap-4 p-3 rounded-lg border border-border hover:border-primary/30 hover:shadow-sm transition-all">
          <div className="w-16 h-16 rounded-md overflow-hidden shrink-0 bg-muted">
            {image.url ? (
              <img src={image.url} alt={image.name || "Portfolio image"} className="size-full object-cover" />
            ) : (
              <div className={`size-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                <ImageIcon className="size-6 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{image.name || "Untitled"}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {image.description || "No description"}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {image.viewCount !== undefined && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="size-3.5" />
                {image.viewCount}
              </div>
            )}
            <Badge
              variant="secondary"
              className={
                status === "published"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-[10px]"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 text-[10px]"
              }
            >
              {status === "published" ? "Published" : "Draft"}
            </Badge>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                className="p-1 rounded hover:bg-muted transition-colors cursor-grab"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="size-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => onRemove(image.id)}
                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="size-4 text-red-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div className="aspect-square rounded-lg border border-border overflow-hidden bg-muted hover:border-primary/30 hover:shadow-md transition-all">
        {image.url ? (
          <img src={image.url} alt={image.name || "Portfolio image"} className="size-full object-cover" />
        ) : (
          <div className={`size-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <ImageIcon className="size-10 text-muted-foreground/30" />
          </div>
        )}
        {/* Status badge overlay */}
        <div className="absolute top-2 left-2">
          <Badge
            variant="secondary"
            className={
              status === "published"
                ? "bg-emerald-500/90 text-white text-[10px] backdrop-blur-sm"
                : "bg-amber-500/90 text-white text-[10px] backdrop-blur-sm"
            }
          >
            {status === "published" ? "Published" : "Draft"}
          </Badge>
        </div>
        {/* View count overlay */}
        {image.viewCount !== undefined && (
          <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
            <Eye className="size-3" />
            {image.viewCount}
          </div>
        )}
        {/* Hover overlay with actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded-lg flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors cursor-grab"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          <button
            onClick={() => onRemove(image.id)}
            className="p-1.5 rounded-full bg-red-500/80 hover:bg-red-600 text-white transition-colors"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
      {/* Card info below image */}
      <div className="mt-2 px-0.5">
        <p className="text-xs font-medium text-foreground truncate">{image.name || "Untitled"}</p>
        {image.createdAt && (
          <p className="text-[10px] text-muted-foreground">
            {new Date(image.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        )}
      </div>
    </div>
  );
}

export function DashboardPortfolioPage() {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterTab, setFilterTab] = useState<"all" | "published" | "draft">("all");

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const json = await apiFetch("/api/users/me");
      return json.data as {
        profile: {
          portfolioImages: string[];
          skills: string[];
          bio: string | null;
          socialLinks: Record<string, string>;
        } | null;
      };
    },
  });

  const [images, setImages] = useState<PortfolioImage[]>([]);

  // Sync images from profile data
  React.useEffect(() => {
    if (profileData?.profile?.portfolioImages) {
      const urls = profileData.profile.portfolioImages;
      setImages(
        urls.map((url, i) => ({
          id: `img-${i}-${url.slice(-8)}`,
          url,
          name: `Portfolio ${i + 1}`,
          status: i % 3 === 2 ? "draft" : "published",
          description: "A showcase of creative work",
          viewCount: Math.floor(Math.random() * 500),
          createdAt: new Date(Date.now() - i * 86400000 * 3).toISOString(),
        }))
      );
    }
  }, [profileData]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        savePortfolioOrder(newItems.map((i) => i.url));
        return newItems;
      });
    }
  };

  const savePortfolioOrder = async (urls: string[]) => {
    try {
      await apiPatch("/api/users/me", { portfolioImages: urls });
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    } catch {
      // Silently handle
    }
  };

  const handleRemoveImage = (id: string) => {
    const newImages = images.filter((img) => img.id !== id);
    setImages(newImages);
    savePortfolioOrder(newImages.map((i) => i.url));
  };

  const handleUpload = (files: File[]) => {
    setIsUploading(true);
    setUploadProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);

        const newImages: PortfolioImage[] = files.map((file, i) => ({
          id: `img-new-${Date.now()}-${i}`,
          url: URL.createObjectURL(file),
          name: file.name,
          status: "draft" as const,
          description: "Newly uploaded",
          viewCount: 0,
          createdAt: new Date().toISOString(),
        }));

        setImages((prev) => {
          const updated = [...prev, ...newImages];
          savePortfolioOrder(updated.map((img) => img.url));
          return updated;
        });

        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 500);
      }
      setUploadProgress(Math.min(Math.round(progress), 100));
    }, 200);
  };

  // Filter images
  const filteredImages = images.filter((img) => {
    if (filterTab === "all") return true;
    return img.status === filterTab;
  });

  // Stats
  const totalItems = images.length;
  const publishedCount = images.filter((i) => i.status === "published").length;
  const draftCount = images.filter((i) => i.status === "draft").length;
  const totalViews = images.reduce((acc, i) => acc + (i.viewCount || 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-muted-foreground mt-1">
            Manage your showcase and portfolio images
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border border-border rounded-md p-0.5">
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
      </div>

      {/* Portfolio Stats Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Briefcase className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">{totalItems}</p>
                <p className="text-xs text-muted-foreground">Total Items</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">{publishedCount}</p>
                <p className="text-xs text-muted-foreground">Published</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <PenSquare className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">{draftCount}</p>
                <p className="text-xs text-muted-foreground">Drafts</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                <Eye className="size-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">{totalViews.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Views</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload Images</CardTitle>
          <CardDescription>Add images to showcase your work</CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploader
            onUpload={handleUpload}
            accept="image/*"
            maxSize={10}
            multiple
            isUploading={isUploading}
            progress={uploadProgress}
          />
        </CardContent>
      </Card>

      {/* Portfolio Grid with Filter Tabs */}
      {images.length === 0 ? (
        <EmptyState
          icon={<ImageIcon />}
          title="No portfolio images"
          description="Upload your first portfolio piece to showcase your work to potential clients"
          action={{ label: "Upload Image", onClick: () => {} }}
        />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Your Portfolio</CardTitle>
                <CardDescription>
                  {images.length} image{images.length !== 1 ? "s" : ""} · Drag to reorder
                </CardDescription>
              </div>
              <Tabs
                value={filterTab}
                onValueChange={(v) => setFilterTab(v as "all" | "published" | "draft")}
              >
                <TabsList className="h-8">
                  <TabsTrigger value="all" className="text-xs px-3 h-6">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="published" className="text-xs px-3 h-6">
                    Published
                  </TabsTrigger>
                  <TabsTrigger value="draft" className="text-xs px-3 h-6">
                    Draft
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={filteredImages.map((i) => i.id)} strategy={rectSortingStrategy}>
                {filteredImages.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                    <ImageIcon className="size-12 opacity-20 mb-3" />
                    <p className="text-sm font-medium">No {filterTab} items</p>
                    <p className="text-xs mt-1">
                      {filterTab === "published"
                        ? "Publish some portfolio items to see them here"
                        : "Save some items as drafts to see them here"}
                    </p>
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredImages.map((image, i) => (
                      <SortableImage
                        key={image.id}
                        image={image}
                        onRemove={handleRemoveImage}
                        viewMode="grid"
                        gradientIndex={i}
                      />
                    ))}
                    {/* Add New Card with animated dashed border */}
                    <motion.button
                      whileHover={{ scale: 1.02, borderColor: "hsl(var(--primary))" }}
                      whileTap={{ scale: 0.98 }}
                      className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
                    >
                      <motion.div
                        animate={{ rotate: [0, 90] }}
                        transition={{ duration: 0.3, repeat: 0 }}
                        className="size-10 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors"
                      >
                        <Plus className="size-5" />
                      </motion.div>
                      <span className="text-xs font-medium">Add New</span>
                    </motion.button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredImages.map((image, i) => (
                      <SortableImage
                        key={image.id}
                        image={image}
                        onRemove={handleRemoveImage}
                        viewMode="list"
                        gradientIndex={i}
                      />
                    ))}
                  </div>
                )}
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
