"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Bell,
  Shield,
  Save,
  Upload,
  Plus,
  X,
  Github,
  Linkedin,
  Twitter,
  Globe,
  Loader2,
  Trash2,
  Mail,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Eye,
  EyeOff,
  Smartphone,
  Monitor,
  Tablet,
  Clock,
  MapPin,
  Link2,
  CreditCard,
  MessageSquare,
  Settings,
  BadgeCheck,
  QrCode,
  Copy,
  ChevronDown,
  ShieldCheck,
  Activity,
  CircleUser,
  FileText,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuthStore } from "@/store/auth";
import { useNavigationStore } from "@/store/navigation";
import { toast } from "sonner";
import { apiFetch, apiPatch } from "@/lib/api-client";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  profile: {
    bio: string | null;
    location: string | null;
    skills: string[];
    portfolioImages: string[];
    socialLinks: Record<string, string>;
    coverImageUrl: string | null;
  } | null;
}

// ─── Password Strength ───
function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  textColor: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1)
    return { score, label: "Weak", color: "bg-red-500", textColor: "text-red-500" };
  if (score <= 2)
    return { score, label: "Fair", color: "bg-orange-500", textColor: "text-orange-500" };
  if (score <= 3)
    return { score, label: "Good", color: "bg-yellow-500", textColor: "text-yellow-500" };
  if (score <= 4)
    return { score, label: "Strong", color: "bg-emerald-500", textColor: "text-emerald-500" };
  return { score, label: "Very Strong", color: "bg-emerald-600", textColor: "text-emerald-600" };
}

// ─── Notification Types (grouped) ───
const NOTIFICATION_GROUPS = [
  {
    key: "transaction",
    label: "Transaction",
    icon: CreditCard,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    types: [
      { key: "newSale", label: "New Sale", description: "When you make a sale" },
      { key: "transactionUpdate", label: "Transaction Update", description: "Transaction status changes" },
      { key: "payoutProcessed", label: "Payout Processed", description: "When a payout is completed" },
    ],
  },
  {
    key: "communication",
    label: "Communication",
    icon: MessageSquare,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-500/10",
    types: [
      { key: "newMessage", label: "New Message", description: "When you receive a message" },
      { key: "reviewReceived", label: "Review Received", description: "When you get a new review" },
    ],
  },
  {
    key: "account",
    label: "Account",
    icon: Shield,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    types: [
      { key: "accountUpdate", label: "Account Update", description: "Account setting changes" },
      { key: "disputeUpdate", label: "Dispute Update", description: "Dispute status changes" },
    ],
  },
];

const ALL_NOTIF_TYPES = NOTIFICATION_GROUPS.flatMap((g) => g.types);

// ─── Skill Suggestions ───
const SKILL_SUGGESTIONS = [
  "UI/UX Design", "Web Development", "Mobile Development", "Graphic Design",
  "Logo Design", "Illustration", "3D Modeling", "Animation",
  "Video Editing", "Photography", "Copywriting", "SEO",
  "Data Analysis", "Machine Learning", "DevOps", "Cloud Architecture",
  "React", "Next.js", "TypeScript", "Python",
];

// ─── Skill Category Colors ───
function getSkillColor(skill: string): string {
  const s = skill.toLowerCase();
  if (/react|next|typescript|javascript|vue|angular|node|web/.test(s))
    return "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-500/30";
  if (/design|ui|ux|figma|sketch|graphic|logo|illustration/.test(s))
    return "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30";
  if (/mobile|android|ios|flutter|react native/.test(s))
    return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30";
  if (/3d|model|animation|video|photo|blender|after effects/.test(s))
    return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30";
  if (/data|machine|ai|ml|python|analysis/.test(s))
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30";
  if (/seo|copy|writing|marketing|content/.test(s))
    return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30";
  if (/devops|cloud|aws|docker|kubernetes/.test(s))
    return "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/30";
  return "bg-primary/10 text-primary border-primary/20";
}

// ─── URL Validation ───
function isValidUrl(str: string): boolean {
  if (!str) return false;
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

// ─── Social Platform Config ───
const SOCIAL_PLATFORMS = [
  { key: "github", label: "GitHub", icon: Github, placeholder: "https://github.com/username" },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, placeholder: "https://linkedin.com/in/username" },
  { key: "twitter", label: "Twitter", icon: Twitter, placeholder: "https://twitter.com/username" },
  { key: "portfolio", label: "Portfolio", icon: Globe, placeholder: "https://your-portfolio.com" },
];

// ─── Mock Active Sessions ───
const MOCK_SESSIONS = [
  { id: "1", device: "Chrome on macOS", icon: Monitor, lastActive: "Now", current: true, location: "San Francisco, US" },
  { id: "2", device: "Safari on iPhone", icon: Smartphone, lastActive: "2 hours ago", current: false, location: "San Francisco, US" },
  { id: "3", device: "Firefox on Windows", icon: Tablet, lastActive: "1 day ago", current: false, location: "New York, US" },
];

// ─── Animation Variants ───
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" },
  }),
};

// ─── Circular Progress Component ───
function CircularProgress({ value, size = 120, strokeWidth = 8 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-emerald-500 transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold">{value}%</span>
        <span className="text-[10px] text-muted-foreground">Complete</span>
      </div>
    </div>
  );
}

export function DashboardSettingsPage() {
  const { user, updateUser } = useAuthStore();
  const { navigate } = useNavigationStore();
  const queryClient = useQueryClient();

  // Profile state
  const [localEdits, setLocalEdits] = useState<Record<string, unknown>>({});
  const [skillInput, setSkillInput] = useState("");
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);

  // Account state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [emailStep, setEmailStep] = useState(0); // 0=viewing, 1=entering, 2=verifying
  const [newEmail, setNewEmail] = useState("");

  // Notification state
  const [localNotifOverrides, setLocalNotifOverrides] = useState<Record<string, boolean>>({});
  const [pushOverrides, setPushOverrides] = useState<Record<string, boolean>>({});

  // Fetch profile data
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const json = await apiFetch("/api/users/me");
      return json.data as ProfileData;
    },
  });

  // Fetch notification preferences
  const { data: notifData } = useQuery({
    queryKey: ["notification-prefs"],
    queryFn: async () => {
      const json = await apiFetch("/api/notifications/preferences");
      return json.data as Record<string, boolean>;
    },
  });

  // Derived state
  const name = (localEdits.name as string) ?? profileData?.name ?? user?.name ?? "";
  const bio = (localEdits.bio as string) ?? profileData?.profile?.bio ?? "";
  const location = (localEdits.location as string) ?? profileData?.profile?.location ?? "";
  const skills = (localEdits.skills as string[]) ?? profileData?.profile?.skills ?? [];
  const avatarPreview = (localEdits.avatarUrl as string | null) ?? profileData?.avatarUrl ?? user?.avatarUrl ?? null;
  const coverPreview = (localEdits.coverImageUrl as string | null) ?? profileData?.profile?.coverImageUrl ?? null;
  const socialLinks = (localEdits.socialLinks as Record<string, string>) ?? profileData?.profile?.socialLinks ?? {};
  const notifPrefs = { ...notifData, ...localNotifOverrides };

  // Dirty check
  const hasUnsavedChanges = Object.keys(localEdits).length > 0 || Object.keys(localNotifOverrides).length > 0;

  const setName = (v: string) => setLocalEdits((prev) => ({ ...prev, name: v }));
  const setBio = (v: string) => setLocalEdits((prev) => ({ ...prev, bio: v }));
  const setLocation = (v: string) => setLocalEdits((prev) => ({ ...prev, location: v }));
  const setSkills = (v: string[]) => setLocalEdits((prev) => ({ ...prev, skills: v }));
  const setAvatarPreview = (v: string | null) => setLocalEdits((prev) => ({ ...prev, avatarUrl: v }));
  const setCoverPreview = (v: string | null) => setLocalEdits((prev) => ({ ...prev, coverImageUrl: v }));
  const setSocialLinks = (v: Record<string, string>) => setLocalEdits((prev) => ({ ...prev, socialLinks: v }));
  const setNotifPrefs = (v: Record<string, boolean>) => setLocalNotifOverrides((prev) => ({ ...prev, ...v }));

  // Profile completion calculation
  const profileCompletion = useMemo(() => {
    const checks = [
      { filled: !!avatarPreview, weight: 10 },
      { filled: !!name.trim(), weight: 10 },
      { filled: !!bio.trim(), weight: 20 },
      { filled: !!location.trim(), weight: 10 },
      { filled: skills.length > 0, weight: 20 },
      { filled: Object.values(socialLinks).some((v) => v && v.trim().length > 0), weight: 15 },
      { filled: !!coverPreview, weight: 15 },
    ];
    const total = checks.reduce((sum, c) => sum + (c.filled ? c.weight : 0), 0);
    return total;
  }, [avatarPreview, name, bio, location, skills, socialLinks, coverPreview]);

  const completionItems = [
    { label: "Avatar", filled: !!avatarPreview, weight: 10, icon: Camera },
    { label: "Name", filled: !!name.trim(), weight: 10, icon: CircleUser },
    { label: "Bio", filled: !!bio.trim(), weight: 20, icon: FileText },
    { label: "Location", filled: !!location.trim(), weight: 10, icon: MapPin },
    { label: "Skills", filled: skills.length > 0, weight: 20, icon: Sparkles },
    { label: "Social Links", filled: Object.values(socialLinks).some((v) => v && v.trim().length > 0), weight: 15, icon: Link2 },
    { label: "Cover Banner", filled: !!coverPreview, weight: 15, icon: CreditCard },
  ];

  // Password strength
  const passwordStrength = useMemo(
    () => (newPassword ? getPasswordStrength(newPassword) : null),
    [newPassword]
  );

  // Filtered skill suggestions
  const filteredSuggestions = useMemo(() => {
    if (!skillInput.trim()) return [];
    return SKILL_SUGGESTIONS.filter(
      (s) =>
        s.toLowerCase().includes(skillInput.toLowerCase()) &&
        !skills.some((existing) => existing.toLowerCase() === s.toLowerCase())
    ).slice(0, 5);
  }, [skillInput, skills]);

  // Profile update mutation
  const profileMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiPatch("/api/users/me", data);
    },
    onSuccess: (data) => {
      updateUser(data.data);
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      setLocalEdits({});
      toast.success("Profile updated", {
        description: "Your profile changes have been saved successfully.",
      });
    },
    onError: () => {
      toast.error("Failed to update profile", {
        description: "Please try again later.",
      });
    },
  });

  // Notification prefs mutation
  const notifMutation = useMutation({
    mutationFn: async (prefs: Record<string, boolean>) => {
      return apiPatch("/api/notifications/preferences", prefs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-prefs"] });
      setLocalNotifOverrides({});
      toast.success("Notification preferences saved", {
        description: "Your notification settings have been updated.",
      });
    },
    onError: () => {
      toast.error("Failed to save preferences", {
        description: "Please try again later.",
      });
    },
  });

  const handleSaveProfile = () => {
    profileMutation.mutate({
      name: name.trim(),
      bio: bio.trim() || null,
      location: location.trim() || null,
      skills,
      socialLinks,
      avatarUrl: avatarPreview,
      coverImageUrl: coverPreview,
    });
  };

  const handleSaveNotifs = () => {
    notifMutation.mutate(notifPrefs);
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }
    setSkillInput("");
    setShowSkillSuggestions(false);
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setCoverPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const enableAllNotifs = () => {
    const all: Record<string, boolean> = {};
    ALL_NOTIF_TYPES.forEach((t) => {
      all[t.key] = true;
    });
    setNotifPrefs(all);
  };

  const disableAllNotifs = () => {
    const all: Record<string, boolean> = {};
    ALL_NOTIF_TYPES.forEach((t) => {
      all[t.key] = false;
    });
    setNotifPrefs(all);
  };

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid sm:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48 sm:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Gradient Header Banner ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="overflow-hidden border-0">
          <div className="relative bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 p-6 md:p-8">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNykiLz48cGF0aCBkPSJNMCAzMGg2ME0zMCAwdjYwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNCkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNnKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-60" />
            <div className="relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="size-5 text-amber-200" />
                    <p className="text-amber-100 text-sm font-medium">Account Settings</p>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    Account Settings
                  </h1>
                  <p className="text-amber-100/80 mt-1 text-sm">
                    Manage your profile, security, and notification preferences
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2.5">
                    <div className="text-center">
                      <p className="text-xl font-bold text-white">{profileCompletion}%</p>
                      <p className="text-[10px] text-amber-100/80">Profile Complete</p>
                    </div>
                    <div className="w-px h-8 bg-white/20" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-white">
                        {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      <p className="text-[10px] text-amber-100/80">Last Updated</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ─── Unsaved Changes Banner ─── */}
      {hasUnsavedChanges && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg px-4 py-3">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              You have unsaved changes. Don&apos;t forget to save your updates.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20"
              onClick={() => {
                setLocalEdits({});
                setLocalNotifOverrides({});
              }}
            >
              Discard
            </Button>
          </div>
        </motion.div>
      )}

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="profile" className="gap-2">
            <User className="size-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2">
            <Shield className="size-4" />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="size-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════
            PROFILE TAB
        ════════════════════════════════════════════ */}
        <TabsContent value="profile">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* ─── Profile Completion Tracker ─── */}
            <motion.div
              custom={0}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BadgeCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                    Profile Completion
                  </CardTitle>
                  <CardDescription>Complete your profile to build trust</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center">
                    <CircularProgress value={profileCompletion} />
                  </div>
                  <Separator />
                  <div className="space-y-2.5">
                    {completionItems.map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className={`size-6 rounded-full flex items-center justify-center shrink-0 ${
                          item.filled
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {item.filled ? (
                            <CheckCircle2 className="size-3.5" />
                          ) : (
                            <item.icon className="size-3.5" />
                          )}
                        </div>
                        <span className={`text-sm flex-1 ${item.filled ? "text-foreground" : "text-muted-foreground"}`}>
                          {item.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{item.weight}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ─── Profile Form ─── */}
            <motion.div
              custom={1}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="lg:col-span-2 space-y-6"
            >
              {/* Avatar & Cover Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Camera className="size-4 text-violet-600 dark:text-violet-400" />
                    Avatar & Cover
                  </CardTitle>
                  <CardDescription>Customize how you appear to others</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar Section */}
                  <div className="flex items-center gap-6">
                    <div
                      className="relative group shrink-0"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleAvatarDrop}
                    >
                      <div className="rounded-full p-[3px] bg-gradient-to-tr from-emerald-500 via-teal-500 to-violet-500">
                        <Avatar className="size-20 ring-2 ring-background">
                          {avatarPreview ? (
                            <AvatarImage src={avatarPreview} alt="Avatar" />
                          ) : (
                            <AvatarFallback className="text-xl bg-muted text-muted-foreground">
                              {name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2) || "U"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      </div>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                        <Upload className="size-5 text-white" />
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                        />
                      </label>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium">Profile Photo</p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG or GIF. Max 5MB.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => document.getElementById("avatar-upload-btn")?.click()}>
                          <Upload className="size-3 mr-1" />
                          Upload
                        </Button>
                        <input
                          id="avatar-upload-btn"
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                        />
                        {avatarPreview && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => setAvatarPreview(null)}>
                            Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                        <Upload className="size-2.5" />
                        Drag & drop to upload
                      </p>
                    </div>
                  </div>

                  {/* Cover Banner Section */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Cover Banner</Label>
                    <div className="relative group">
                      {coverPreview ? (
                        <div className="h-40 rounded-xl overflow-hidden">
                          <img
                            src={coverPreview}
                            alt="Cover"
                            className="size-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <div className="absolute bottom-3 left-3 flex items-center gap-2">
                            <Avatar className="size-8 ring-2 ring-white/50">
                              {avatarPreview ? (
                                <AvatarImage src={avatarPreview} alt="Avatar" />
                              ) : (
                                <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                                  {name.split(" ").map((n) => n[0]).join("").slice(0, 2) || "U"}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <span className="text-white text-sm font-medium drop-shadow-md">{name || "Your Name"}</span>
                          </div>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <label className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="secondary" size="sm" className="backdrop-blur-sm">
                                <Camera className="size-3.5 mr-1.5" />
                                Change cover
                              </Button>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleCoverUpload}
                              />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center h-40 rounded-xl border-2 border-dashed border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer group">
                          <div className="text-center">
                            <div className="size-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-2 group-hover:bg-emerald-500/10 transition-colors">
                              <Upload className="size-5 text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">Upload cover banner</p>
                            <p className="text-xs text-muted-foreground/60 mt-0.5">Recommended: 1500 x 500px</p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleCoverUpload}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Basic Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="size-4 text-teal-600 dark:text-teal-400" />
                    Basic Information
                  </CardTitle>
                  <CardDescription>Your personal details and public profile</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="settings-name" className="text-sm">Display Name</Label>
                      <Input
                        id="settings-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="transition-shadow focus-within:ring-2 focus-within:ring-emerald-500/30"
                      />
                      <p className="text-[10px] text-muted-foreground">{name.length}/50 characters</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="settings-email" className="text-sm">Email</Label>
                      <Input
                        id="settings-email"
                        value={user?.email || ""}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Email can be changed in Account tab
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="settings-bio" className="text-sm">Bio</Label>
                      <span className={`text-xs ${bio.length > 900 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                        {bio.length}/1000
                      </span>
                    </div>
                    <Textarea
                      id="settings-bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value.slice(0, 1000))}
                      placeholder="Tell others about yourself, your expertise, and what you can offer..."
                      rows={4}
                      className="transition-shadow focus-within:ring-2 focus-within:ring-emerald-500/30 resize-none"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="settings-location" className="text-sm flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-muted-foreground" />
                        Location
                      </Label>
                      <Input
                        id="settings-location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="City, Country"
                        className="transition-shadow focus-within:ring-2 focus-within:ring-emerald-500/30"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Skills Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="size-4 text-amber-600 dark:text-amber-400" />
                    Skills
                  </CardTitle>
                  <CardDescription>Highlight your areas of expertise</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className={`px-3 py-1.5 gap-1.5 text-xs font-medium transition-colors ${getSkillColor(skill)}`}
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="ml-0.5 hover:text-destructive transition-colors rounded-full hover:bg-destructive/10 p-0.5"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          value={skillInput}
                          onChange={(e) => {
                            setSkillInput(e.target.value);
                            setShowSkillSuggestions(true);
                          }}
                          onFocus={() => setShowSkillSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowSkillSuggestions(false), 200)}
                          placeholder="Type to search or add a skill..."
                          className="transition-shadow focus-within:ring-2 focus-within:ring-emerald-500/30"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && skillInput.trim()) {
                              e.preventDefault();
                              addSkill();
                            }
                          }}
                        />
                        {/* Skill Suggestions Dropdown */}
                        {showSkillSuggestions && filteredSuggestions.length > 0 && (
                          <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                            {filteredSuggestions.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                className="w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors flex items-center gap-2"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  if (!skills.includes(suggestion)) {
                                    setSkills([...skills, suggestion]);
                                  }
                                  setSkillInput("");
                                  setShowSkillSuggestions(false);
                                }}
                              >
                                <Plus className="size-3 text-muted-foreground" />
                                <span>{suggestion}</span>
                                <Badge
                                  variant="outline"
                                  className={`ml-auto text-[10px] px-1.5 py-0 ${getSkillColor(suggestion)}`}
                                >
                                  +
                                </Badge>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button variant="outline" onClick={addSkill} disabled={!skillInput.trim()}>
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Social Links Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Link2 className="size-4 text-rose-600 dark:text-rose-400" />
                    Social Links
                  </CardTitle>
                  <CardDescription>Connect your online presence</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {SOCIAL_PLATFORMS.map((platform) => {
                    const value = socialLinks[platform.key] || "";
                    const isValid = value ? isValidUrl(value) : true;
                    return (
                      <div key={platform.key} className="space-y-1.5">
                        <Label className="flex items-center gap-2 text-sm">
                          <platform.icon className="size-4 text-muted-foreground" />
                          {platform.label}
                          {value && isValidUrl(value) && (
                            <CheckCircle2 className="size-3.5 text-emerald-500" />
                          )}
                          {value && !isValid && (
                            <AlertTriangle className="size-3.5 text-amber-500" />
                          )}
                        </Label>
                        <div className="relative">
                          <Input
                            value={value}
                            onChange={(e) =>
                              setSocialLinks({ ...socialLinks, [platform.key]: e.target.value })
                            }
                            placeholder={platform.placeholder}
                            type="url"
                            className={`pr-10 transition-shadow focus-within:ring-2 ${
                              value && !isValid
                                ? "border-amber-300 dark:border-amber-500/40 focus-within:ring-amber-500/30"
                                : "focus-within:ring-emerald-500/30"
                            }`}
                          />
                          {value && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {isValidUrl(value) ? (
                                <CheckCircle2 className="size-4 text-emerald-500" />
                              ) : (
                                <AlertTriangle className="size-4 text-amber-500" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Save Button */}
              <motion.div
                custom={5}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="flex items-center gap-3"
              >
                <Button
                  onClick={handleSaveProfile}
                  disabled={profileMutation.isPending || !hasUnsavedChanges}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {profileMutation.isPending ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="size-4 mr-2" />
                  )}
                  Save Changes
                </Button>
                {hasUnsavedChanges && (
                  <p className="text-xs text-muted-foreground">You have unsaved changes</p>
                )}
              </motion.div>
            </motion.div>
          </div>
        </TabsContent>

        {/* ════════════════════════════════════════════
            ACCOUNT TAB
        ════════════════════════════════════════════ */}
        <TabsContent value="account">
          <div className="space-y-6">
            {/* Change Email */}
            <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="size-4 text-violet-600 dark:text-violet-400" />
                    Change Email
                  </CardTitle>
                  <CardDescription>Update your email address</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Verification Step Indicator */}
                  <div className="flex items-center gap-2 mb-2">
                    {[
                      { step: 0, label: "Current" },
                      { step: 1, label: "New Email" },
                      { step: 2, label: "Verify" },
                    ].map((s, i) => (
                      <React.Fragment key={s.label}>
                        <div className="flex items-center gap-1.5">
                          <div className={`size-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                            emailStep >= s.step
                              ? "bg-violet-500 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {emailStep > s.step ? <CheckCircle2 className="size-3.5" /> : i + 1}
                          </div>
                          <span className={`text-xs ${emailStep >= s.step ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                            {s.label}
                          </span>
                        </div>
                        {i < 2 && (
                          <div className={`flex-1 h-px ${emailStep > s.step ? "bg-violet-500" : "bg-muted"}`} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {emailStep === 0 && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Current Email</Label>
                        <div className="flex items-center gap-2">
                          <Input value={user?.email || ""} disabled className="bg-muted" />
                          <Badge
                            variant={user?.emailVerified ? "default" : "secondary"}
                            className={`shrink-0 ${user?.emailVerified ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30" : ""}`}
                          >
                            {user?.emailVerified ? "Verified" : "Unverified"}
                          </Badge>
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => setEmailStep(1)}>
                        <Mail className="size-4 mr-2" />
                        Change Email
                      </Button>
                    </div>
                  )}

                  {emailStep === 1 && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="new-email">New Email Address</Label>
                        <Input
                          id="new-email"
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="new@email.com"
                          className="transition-shadow focus-within:ring-2 focus-within:ring-violet-500/30"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => { setEmailStep(0); setNewEmail(""); }}
                        >
                          Back
                        </Button>
                        <Button
                          className="bg-violet-600 hover:bg-violet-700 text-white"
                          disabled={!newEmail || !newEmail.includes("@")}
                          onClick={() => {
                            setEmailStep(2);
                            toast.success("Verification email sent", {
                              description: `Check ${newEmail} for a verification link.`,
                            });
                          }}
                        >
                          <Mail className="size-4 mr-2" />
                          Send Verification
                        </Button>
                      </div>
                    </div>
                  )}

                  {emailStep === 2 && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30">
                        <div className="flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300">
                          <Mail className="size-4" />
                          Verification email sent to <strong>{newEmail}</strong>
                        </div>
                        <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-1 ml-6">
                          Click the link in the email to confirm your new address.
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => { setEmailStep(0); setNewEmail(""); }}>
                        Back to Settings
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Change Password */}
            <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lock className="size-4 text-amber-600 dark:text-amber-400" />
                    Change Password
                  </CardTitle>
                  <CardDescription>Update your account password</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-pw">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="current-pw"
                        type={showCurrentPw ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="pr-10 transition-shadow focus-within:ring-2 focus-within:ring-amber-500/30"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                      >
                        {showCurrentPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-pw">New Password</Label>
                      <div className="relative">
                        <Input
                          id="new-pw"
                          type={showNewPw ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pr-10 transition-shadow focus-within:ring-2 focus-within:ring-amber-500/30"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowNewPw(!showNewPw)}
                        >
                          {showNewPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-pw">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm-pw"
                          type={showConfirmPw ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pr-10 transition-shadow focus-within:ring-2 focus-within:ring-amber-500/30"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowConfirmPw(!showConfirmPw)}
                        >
                          {showConfirmPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Password Strength Meter */}
                  {newPassword && passwordStrength && (
                    <div className="space-y-2">
                      <div className="flex gap-1.5">
                        {Array.from({ length: 5 }).map((_, level) => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                              passwordStrength.score >= level + 1
                                ? passwordStrength.color
                                : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs ${passwordStrength.textColor}`}>
                        Password strength: {passwordStrength.label}
                      </p>
                    </div>
                  )}

                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}

                  <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                    <Lock className="size-4 mr-2" />
                    Update Password
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Two-Factor Authentication */}
            <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="size-4 text-teal-600 dark:text-teal-400" />
                    Two-Factor Authentication
                  </CardTitle>
                  <CardDescription>Add an extra layer of security to your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Enable 2FA</p>
                      <p className="text-xs text-muted-foreground">
                        Require a verification code when signing in
                      </p>
                    </div>
                    <Switch
                      checked={twoFactorEnabled}
                      onCheckedChange={setTwoFactorEnabled}
                    />
                  </div>

                  {!twoFactorEnabled && (
                    <div className="p-4 rounded-xl bg-muted/50 border border-border">
                      <p className="text-sm font-medium mb-3">Setup steps:</p>
                      <div className="space-y-2">
                        {[
                          "Install an authenticator app (Google Authenticator, Authy)",
                          "Scan the QR code with your authenticator",
                          "Enter the 6-digit code to verify setup",
                          "Save your backup codes in a secure location",
                        ].map((step, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="size-5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-[10px] font-bold">{i + 1}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {twoFactorEnabled && (
                    <div className="space-y-4">
                      <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
                        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="size-4" />
                          Two-factor authentication is enabled
                        </div>
                      </div>

                      {/* QR Code Placeholder */}
                      <div className="p-4 rounded-xl bg-muted/50 border border-border">
                        <p className="text-sm font-medium mb-3">Authenticator QR Code</p>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                          <div className="size-36 bg-white rounded-lg flex items-center justify-center border-2 border-dashed border-border">
                            <div className="text-center">
                              <QrCode className="size-16 text-muted-foreground/40 mx-auto" />
                              <p className="text-[9px] text-muted-foreground mt-1">QR Code</p>
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <p className="text-muted-foreground">Manual entry key:</p>
                            <div className="flex items-center gap-2">
                              <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                                JBSW Y3DP EHPK 3PXP
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => {
                                  navigator.clipboard.writeText("JBSWY3DPEHPK3PXP");
                                  toast.success("Copied to clipboard");
                                }}
                              >
                                <Copy className="size-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Backup Codes */}
                      <div className="p-4 rounded-xl bg-muted/50 border border-border">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium">Backup Codes</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                "4829-1053\n7391-6284\n1856-4037\n9247-5618\n3610-8472\n5083-2916"
                              );
                              toast.success("Backup codes copied to clipboard");
                            }}
                          >
                            <Copy className="size-3 mr-1" />
                            Copy All
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            "4829-1053", "7391-6284", "1856-4037",
                            "9247-5618", "3610-8472", "5083-2916",
                          ].map((code) => (
                            <div
                              key={code}
                              className="px-3 py-1.5 bg-background rounded border border-border text-center font-mono text-xs"
                            >
                              {code}
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          Store these codes securely. Each code can only be used once.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Active Sessions */}
            <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="size-4 text-emerald-600 dark:text-emerald-400" />
                    Active Sessions
                  </CardTitle>
                  <CardDescription>Manage your active login sessions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {MOCK_SESSIONS.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors group"
                    >
                      <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <session.icon className="size-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{session.device}</p>
                          {session.current && (
                            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30 text-[10px] px-1.5 py-0">
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          <span>{session.lastActive}</span>
                          <span className="text-muted-foreground/40">|</span>
                          <MapPin className="size-3" />
                          <span>{session.location}</span>
                        </div>
                      </div>
                      {!session.current && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            toast.success("Session revoked", {
                              description: `${session.device} has been logged out.`,
                            });
                          }}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Danger Zone */}
            <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible">
              <Card className="border-red-200 dark:border-red-500/30">
                <CardHeader>
                  <CardTitle className="text-base text-destructive flex items-center gap-2">
                    <AlertTriangle className="size-4" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>
                    Irreversible and destructive actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="size-4 mr-2" />
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your
                          account and all associated data, including your profile, transactions,
                          reviews, and messages.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        {/* ════════════════════════════════════════════
            NOTIFICATIONS TAB
        ════════════════════════════════════════════ */}
        <TabsContent value="notifications">
          <motion.div
            custom={0}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Bell className="size-4 text-amber-600 dark:text-amber-400" />
                      Notification Preferences
                    </CardTitle>
                    <CardDescription>Choose which notifications you want to receive</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={enableAllNotifs}
                    >
                      Enable All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={disableAllNotifs}
                    >
                      Disable All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {NOTIFICATION_GROUPS.map((group) => (
                  <div key={group.key}>
                    {/* Group Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`size-7 rounded-lg ${group.bgColor} flex items-center justify-center`}>
                        <group.icon className={`size-3.5 ${group.color}`} />
                      </div>
                      <h3 className="text-sm font-semibold">{group.label}</h3>
                      <Separator className="flex-1" />
                    </div>

                    {/* Notification Items */}
                    <div className="space-y-1 ml-9">
                      {group.types.map((type) => (
                        <div
                          key={type.key}
                          className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{type.label}</p>
                            <p className="text-xs text-muted-foreground">{type.description}</p>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="flex items-center gap-2">
                              <Label className="text-[10px] text-muted-foreground hidden sm:block">Email</Label>
                              <Switch
                                checked={notifPrefs[type.key] ?? true}
                                onCheckedChange={(checked) =>
                                  setNotifPrefs({ ...notifPrefs, [type.key]: checked })
                                }
                                className="data-[state=checked]:bg-emerald-500"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-[10px] text-muted-foreground hidden sm:block">Push</Label>
                              <Switch
                                checked={pushOverrides[type.key] ?? true}
                                onCheckedChange={(checked) =>
                                  setPushOverrides((prev) => ({ ...prev, [type.key]: checked }))
                                }
                                className="data-[state=checked]:bg-violet-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <Separator />

                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleSaveNotifs}
                    disabled={notifMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {notifMutation.isPending ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="size-4 mr-2" />
                    )}
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
