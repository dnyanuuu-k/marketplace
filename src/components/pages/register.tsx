"use client";

import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  UserPlus,
  ShoppingCart,
  Palette,
  Loader2,
  Check,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Shield,
  MessageCircle,
  Sparkles,
  PartyPopper,
  CreditCard,
  Lock,
  Zap,
  Info,
  TrendingUp,
  DollarSign,
  Users,
  Star,
  CheckCircle2,
  Hexagon,
  Triangle,
  Diamond,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { apiPost } from "@/lib/api-client";
import { useNavigationStore } from "@/store/navigation";
import { cn } from "@/lib/utils";

type Role = "BUYER" | "AUTHOR";

// ─── Password Strength Helper with gradient colors ───
function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  textColor: string;
  gradientFrom: string;
  gradientTo: string;
  barColor: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1)
    return {
      score,
      label: "Weak",
      color: "bg-red-500",
      textColor: "text-red-500",
      gradientFrom: "from-red-500",
      gradientTo: "to-red-400",
      barColor: "#ef4444",
    };
  if (score <= 2)
    return {
      score,
      label: "Fair",
      color: "bg-orange-500",
      textColor: "text-orange-500",
      gradientFrom: "from-orange-500",
      gradientTo: "to-yellow-500",
      barColor: "#f97316",
    };
  if (score <= 3)
    return {
      score,
      label: "Good",
      color: "bg-yellow-500",
      textColor: "text-yellow-500",
      gradientFrom: "from-yellow-500",
      gradientTo: "to-lime-500",
      barColor: "#eab308",
    };
  if (score <= 4)
    return {
      score,
      label: "Strong",
      color: "bg-emerald-500",
      textColor: "text-emerald-500",
      gradientFrom: "from-emerald-500",
      gradientTo: "to-teal-500",
      barColor: "#10b981",
    };
  return {
    score,
    label: "Very Strong",
    color: "bg-emerald-600",
    textColor: "text-emerald-600",
    gradientFrom: "from-emerald-600",
    gradientTo: "to-cyan-500",
    barColor: "#059669",
  };
}

// ─── Animated Checkmark SVG ───
function AnimatedCheckmark({ size = 16, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M3 8L6.5 11.5L13 4.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="checkmark-draw"
      />
    </svg>
  );
}

// ─── Confetti Burst ───
function ConfettiBurst() {
  return (
    <div className="relative h-6 w-full overflow-visible">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2"
          style={{
            width: Math.random() * 8 + 4,
            height: Math.random() * 8 + 4,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            backgroundColor: [
              "#10b981",
              "#8b5cf6",
              "#f59e0b",
              "#ef4444",
              "#06b6d4",
              "#ec4899",
              "#14b8a6",
            ][i % 7],
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: (Math.random() - 0.5) * 300,
            y: (Math.random() - 0.5) * 200 - 30,
            opacity: 0,
            scale: [1, 1.5, 0],
            rotate: [0, Math.random() * 360],
          }}
          transition={{
            duration: 1.5 + Math.random() * 0.5,
            delay: i * 0.04,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

// ─── Success Illustration ───
function SuccessIllustration({ role }: { role: Role }) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      className="flex flex-col items-center gap-4 py-6"
    >
      {/* Animated circles */}
      <div className="relative">
        <motion.div
          className="absolute -inset-4 rounded-full bg-emerald-500/20"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute -inset-8 rounded-full bg-emerald-500/10"
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
        />
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 12 }}
          className="relative size-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30"
        >
          <PartyPopper className="size-10 text-white" />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center"
      >
        <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
          Account Created!
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {role === "AUTHOR"
            ? "Let's set up your creator profile"
            : "You're all set to start browsing"}
        </p>
      </motion.div>

      {/* Enhanced confetti */}
      <ConfettiBurst />
    </motion.div>
  );
}

// ─── 3D Tilt Card Wrapper with Glare ───
function TiltCard({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({
      x: (y - 0.5) * -12,
      y: (x - 0.5) * 12,
    });
    setGlarePos({ x: x * 100, y: y * 100 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transformStyle: "preserve-3d",
      }}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      {children}
      {/* 3D Glare overlay */}
      {isHovered && (
        <div
          className="absolute inset-0 pointer-events-none rounded-xl tilt-glare"
          style={{
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.15), transparent 60%)`,
          }}
        />
      )}
    </motion.div>
  );
}

// ─── Animated Gradient Mesh Background ───
function GradientMeshBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Main mesh gradient */}
      <div className="mesh-bg-register absolute inset-0" />

      {/* Animated color orbs */}
      <div className="mesh-orb-1 absolute top-[10%] left-[15%] w-72 h-72 rounded-full bg-violet-500/8" />
      <div className="mesh-orb-2 absolute bottom-[10%] right-[10%] w-64 h-64 rounded-full bg-rose-500/8" />
      <div className="mesh-orb-3 absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-purple-500/5" />

      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}

// ─── Why Join as Author Benefits ───
const authorBenefits = [
  {
    icon: DollarSign,
    title: "Earn Revenue",
    desc: "Set your own prices and earn from every sale",
    color: "text-emerald-500",
  },
  {
    icon: TrendingUp,
    title: "Grow Your Brand",
    desc: "Build a following and increase visibility",
    color: "text-violet-500",
  },
  {
    icon: Users,
    title: "Direct Access",
    desc: "Connect directly with buyers, no middleman",
    color: "text-amber-500",
  },
  {
    icon: Star,
    title: "Get Reviews",
    desc: "Build reputation through verified reviews",
    color: "text-rose-500",
  },
];

// ─── Benefits Data ───
const benefits = [
  {
    icon: BadgeCheck,
    title: "Verified Sellers",
    description: "All creators go through a thorough verification process",
    color: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
  {
    icon: Shield,
    title: "Secure Payments",
    description: "Enterprise-grade encryption with escrow protection",
    color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: MessageCircle,
    title: "Real-time Chat",
    description: "Communicate directly with creators seamlessly",
    color: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
];

export function RegisterPage() {
  const { navigate } = useNavigationStore();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role>("BUYER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password]
  );

  const maxStep = role === "AUTHOR" ? 3 : 2;

  const validateStep = (currentStep: number): boolean => {
    const errors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!role) {
        errors.role = "Please select a role";
      }
    }

    if (currentStep === 2) {
      if (!name.trim()) {
        errors.name = "Name is required";
      } else if (name.trim().length < 2) {
        errors.name = "Name must be at least 2 characters";
      }
      if (!email.trim()) {
        errors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = "Please enter a valid email address";
      }
      if (!password) {
        errors.password = "Password is required";
      } else if (password.length < 8) {
        errors.password = "Password must be at least 8 characters";
      }
      if (!confirmPassword) {
        errors.confirmPassword = "Please confirm your password";
      } else if (password !== confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
      if (!termsAccepted) {
        errors.terms = "You must accept the Terms of Service";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setError("");
      setStep((s) => Math.min(s + 1, maxStep));
    }
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 1));
    setFieldErrors({});
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(step)) return;

    setIsLoading(true);
    setError("");
    try {
      const body: Record<string, unknown> = { name, email, password, role };
      if (role === "AUTHOR") {
        body.bio = bio;
        body.location = location;
      }

      await apiPost("/api/auth/register", body);

      // Show success animation
      setShowSuccess(true);

      // Redirect after a brief delay
      setTimeout(() => {
        if (role === "AUTHOR") {
          navigate("onboarding");
        } else {
          navigate("login");
        }
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const stepLabels =
    role === "AUTHOR"
      ? ["Role", "Account", "Profile"]
      : ["Role", "Account"];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      {/* ─── Left Panel (Desktop only) ─── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-rose-600 dark:from-violet-900 dark:via-purple-900 dark:to-rose-950">
        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/30 via-transparent to-rose-500/20" />

        {/* Animated floating shapes (CSS keyframes) */}
        <div className="geo-shape geo-float-1 top-[10%] left-[12%]">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20" />
        </div>
        <div className="geo-shape geo-float-3 top-[55%] left-[8%]" style={{ animationDelay: "1s" }}>
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20" />
        </div>
        <div className="geo-shape geo-float-2 top-[20%] right-[12%]" style={{ animationDelay: "2s" }}>
          <div className="w-10 h-10 rounded-xl bg-amber-400/15 backdrop-blur-sm border border-amber-400/20" />
        </div>
        <div className="geo-shape geo-float-4 bottom-[18%] right-[18%]" style={{ animationDelay: "0.5s" }}>
          <div className="w-14 h-14 rounded-full bg-emerald-400/15 backdrop-blur-sm border border-emerald-400/20" />
        </div>
        <div className="geo-shape geo-float-5 top-[40%] left-[40%]" style={{ animationDelay: "1.5s" }}>
          <div className="w-8 h-8 rounded-lg bg-rose-400/15 backdrop-blur-sm border border-rose-400/20" />
        </div>
        <div className="geo-shape geo-float-1 bottom-[30%] left-[25%]" style={{ animationDelay: "3s" }}>
          <div className="w-6 h-6 rounded-full bg-white/15 backdrop-blur-sm border border-white/20" />
        </div>

        {/* Additional CSS-only geometric shapes */}
        <div className="geo-shape geo-float-3 top-[70%] right-[30%]" style={{ animationDelay: "2.5s" }}>
          <Hexagon className="size-8 text-white/8" strokeWidth={1} />
        </div>
        <div className="geo-shape geo-float-4 top-[15%] left-[50%]" style={{ animationDelay: "1s" }}>
          <Diamond className="size-6 text-white/8" strokeWidth={1} />
        </div>
        <div className="geo-shape geo-float-2 bottom-[40%] right-[10%]" style={{ animationDelay: "3.5s" }}>
          <div className="w-12 h-12 rounded-full border border-dashed border-white/10" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-md"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 12 }}
              className="size-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center mb-8"
            >
              <Sparkles className="size-7 text-white" />
            </motion.div>

            <h1 className="text-4xl xl:text-5xl font-extrabold text-white mb-4 leading-tight">
              Join our community
            </h1>
            <p className="text-lg text-white/75 mb-10 leading-relaxed">
              Connect with thousands of digital creators and buyers. Build your
              brand, find talent, and grow together.
            </p>

            {/* Benefit points */}
            <div className="space-y-5">
              {benefits.map((benefit, i) => {
                const Icon = benefit.icon;
                return (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.15 }}
                    className="flex items-start gap-4"
                  >
                    <div className="size-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shrink-0">
                      <Icon className="size-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">
                        {benefit.title}
                      </h3>
                      <p className="text-sm text-white/60 mt-0.5">
                        {benefit.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Decorative network nodes with animated SVG */}
            <div className="mt-12 opacity-40">
              <svg viewBox="0 0 300 120" fill="none" className="w-full max-w-xs">
                <line x1="60" y1="30" x2="150" y2="60" stroke="white" strokeWidth="1" opacity="0.3" strokeDasharray="200" strokeDashoffset="200">
                  <animate attributeName="stroke-dashoffset" from="200" to="0" dur="1.5s" begin="0.5s" fill="freeze" />
                </line>
                <line x1="150" y1="60" x2="240" y2="30" stroke="white" strokeWidth="1" opacity="0.3" strokeDasharray="200" strokeDashoffset="200">
                  <animate attributeName="stroke-dashoffset" from="200" to="0" dur="1.5s" begin="0.7s" fill="freeze" />
                </line>
                <line x1="150" y1="60" x2="90" y2="100" stroke="white" strokeWidth="1" opacity="0.3" strokeDasharray="200" strokeDashoffset="200">
                  <animate attributeName="stroke-dashoffset" from="200" to="0" dur="1.5s" begin="0.9s" fill="freeze" />
                </line>
                <line x1="150" y1="60" x2="210" y2="100" stroke="white" strokeWidth="1" opacity="0.3" strokeDasharray="200" strokeDashoffset="200">
                  <animate attributeName="stroke-dashoffset" from="200" to="0" dur="1.5s" begin="1.1s" fill="freeze" />
                </line>
                <circle cx="60" cy="30" r="6" fill="white" opacity="0.5">
                  <animate attributeName="r" values="6;8;6" dur="3s" repeatCount="indefinite" />
                </circle>
                <circle cx="240" cy="30" r="6" fill="white" opacity="0.5">
                  <animate attributeName="r" values="6;8;6" dur="3s" begin="0.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="150" cy="60" r="10" fill="white" opacity="0.6">
                  <animate attributeName="r" values="10;13;10" dur="4s" repeatCount="indefinite" />
                </circle>
                <circle cx="90" cy="100" r="5" fill="white" opacity="0.4" />
                <circle cx="210" cy="100" r="5" fill="white" opacity="0.4" />
              </svg>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ─── Right Panel (Form) ─── */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative overflow-y-auto">
        {/* Animated gradient mesh background */}
        <GradientMeshBackground />

        {/* CSS-only floating geometric shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="geo-shape geo-float-1 top-[6%] right-[15%]">
            <Hexagon className="size-10 text-violet-400/8" strokeWidth={1} />
          </div>
          <div className="geo-shape geo-float-3 bottom-[20%] left-[10%]" style={{ animationDelay: "1s" }}>
            <Triangle className="size-8 text-rose-400/8" strokeWidth={1} />
          </div>
          <div className="geo-shape geo-float-2 top-[40%] right-[5%]" style={{ animationDelay: "2s" }}>
            <Diamond className="size-6 text-violet-400/8" strokeWidth={1} />
          </div>
          <div className="geo-shape geo-float-4 bottom-[35%] left-[25%]" style={{ animationDelay: "0.5s" }}>
            <div className="w-10 h-10 rounded-full border border-dashed border-violet-400/8" />
          </div>
          <div className="geo-shape geo-float-5 top-[65%] right-[25%]" style={{ animationDelay: "3s" }}>
            <div className="w-6 h-6 rounded-sm border border-rose-400/8 rotate-45" />
          </div>
        </div>

        {/* Mobile gradient header */}
        <div className="lg:hidden absolute top-0 left-0 right-0 h-48 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-rose-500/5 dark:from-violet-500/5 dark:via-purple-500/3 dark:to-rose-500/3 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-lg relative z-10"
        >
          {/* Mobile-only branding */}
          <div className="lg:hidden text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 12 }}
              className="size-12 rounded-xl bg-violet-500/10 flex items-center justify-center mx-auto mb-3"
            >
              <UserPlus className="size-6 text-violet-600 dark:text-violet-400" />
            </motion.div>
            <h2 className="text-xl font-bold">Create your account</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Join the marketplace
            </p>
          </div>

          {/* Card with gradient border effect + glassmorphism */}
          <div className="relative rounded-xl p-[1px] bg-gradient-to-br from-violet-500/30 via-transparent to-rose-500/30">
            <Card className="border-0 shadow-2xl bg-card/80 dark:bg-card/60 backdrop-blur-xl relative overflow-hidden">
              {/* Inner glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-rose-500/5 pointer-events-none" />

              <CardHeader className="text-center pb-2 hidden lg:block relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  className="size-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4"
                >
                  <UserPlus className="size-7 text-violet-600 dark:text-violet-400" />
                </motion.div>
                <CardTitle className="text-2xl font-bold">
                  Create your account
                </CardTitle>
                <CardDescription className="text-base">
                  Join the marketplace as a buyer or creator
                </CardDescription>
              </CardHeader>

              {/* Step indicator with enhanced animated gradient connecting lines */}
              <div className="px-6 pt-4 lg:pt-2 relative z-10">
                <div className="flex items-center justify-center gap-0">
                  {Array.from({ length: maxStep }, (_, i) => i + 1).map(
                    (s, idx) => (
                      <React.Fragment key={s}>
                        <div className="flex flex-col items-center">
                          <motion.div
                            className={cn(
                              "size-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 relative",
                              s < step
                                ? "bg-gradient-to-br from-violet-500 to-rose-500 text-white shadow-md shadow-violet-500/20"
                                : s === step
                                ? "bg-gradient-to-br from-violet-500 to-rose-500 text-white shadow-md shadow-violet-500/30 ring-4 ring-violet-500/10 step-glow"
                                : "bg-muted text-muted-foreground"
                            )}
                            animate={
                              s === step
                                ? { scale: [1, 1.1, 1] }
                                : undefined
                            }
                            transition={{ duration: 0.3 }}
                          >
                            {s < step ? (
                              <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                className="flex items-center justify-center"
                              >
                                <AnimatedCheckmark size={14} color="white" />
                              </motion.div>
                            ) : (
                              s
                            )}
                          </motion.div>
                          <span
                            className={cn(
                              "text-[10px] mt-1.5 font-medium transition-all duration-300",
                              s <= step
                                ? "text-violet-600 dark:text-violet-400"
                                : "text-muted-foreground"
                            )}
                          >
                            {stepLabels[idx]}
                          </span>
                        </div>
                        {idx < maxStep - 1 && (
                          <div className="flex-1 mx-2 mb-5 relative h-1">
                            <div className="h-1 rounded-full bg-muted w-full" />
                            <motion.div
                              className="absolute top-0 left-0 h-1 rounded-full bg-gradient-to-r from-violet-500 to-rose-500"
                              initial={{ width: "0%" }}
                              animate={{ width: s < step ? "100%" : "0%" }}
                              transition={{ duration: 0.5, ease: "easeInOut" }}
                            />
                          </div>
                        )}
                      </React.Fragment>
                    )
                  )}
                </div>
              </div>

              <CardContent className="pt-4 relative z-10">
                <form onSubmit={handleSubmit}>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, x: -30, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: "auto" }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20 mb-4 flex items-center gap-2 overflow-hidden"
                    >
                      <motion.span
                        animate={{ rotate: [0, -10, 10, -10, 0] }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                      >
                        <Zap className="size-4 shrink-0" />
                      </motion.span>
                      {error}
                    </motion.div>
                  )}

                  {/* Success state */}
                  {showSuccess && <SuccessIllustration role={role} />}

                  <AnimatePresence mode="wait">
                    {/* Step 1: Role Selection with 3D tilt cards + glare */}
                    {step === 1 && !showSuccess && (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        <p className="text-sm font-medium text-center mb-4">
                          How would you like to use the platform?
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Buyer card with 3D tilt + glare */}
                          <TiltCard
                            onClick={() => setRole("BUYER")}
                            className={cn(
                              "relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer",
                              role === "BUYER"
                                ? "border-emerald-500 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 shadow-md shadow-emerald-500/10"
                                : "border-border hover:border-emerald-500/30 hover:bg-muted/30"
                            )}
                          >
                            {role === "BUYER" && (
                              <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                className="absolute top-3 right-3 size-5 rounded-full bg-emerald-500 flex items-center justify-center"
                              >
                                <AnimatedCheckmark size={12} color="white" />
                              </motion.div>
                            )}
                            <div
                              className={cn(
                                "size-14 rounded-xl flex items-center justify-center",
                                role === "BUYER"
                                  ? "bg-emerald-500/15"
                                  : "bg-muted"
                              )}
                              style={{ transform: "translateZ(20px)" }}
                            >
                              <ShoppingCart
                                className={cn(
                                  "size-7",
                                  role === "BUYER"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-muted-foreground"
                                )}
                              />
                            </div>
                            <div className="text-center" style={{ transform: "translateZ(10px)" }}>
                              <p
                                className={cn(
                                  "font-semibold",
                                  role === "BUYER"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-foreground"
                                )}
                              >
                                I want to Buy
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Discover & purchase digital products
                              </p>
                            </div>
                          </TiltCard>

                          {/* Author card with 3D tilt + glare */}
                          <div className="relative">
                            <TiltCard
                              onClick={() => setRole("AUTHOR")}
                              className={cn(
                                "relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer",
                                role === "AUTHOR"
                                  ? "border-violet-500 bg-gradient-to-br from-violet-500/10 to-purple-500/5 shadow-md shadow-violet-500/10"
                                  : "border-border hover:border-violet-500/30 hover:bg-muted/30"
                              )}
                            >
                              {role === "AUTHOR" && (
                                <motion.div
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                  className="absolute top-3 right-3 size-5 rounded-full bg-violet-500 flex items-center justify-center"
                                >
                                  <AnimatedCheckmark size={12} color="white" />
                                </motion.div>
                              )}
                              <div
                                className={cn(
                                  "size-14 rounded-xl flex items-center justify-center",
                                  role === "AUTHOR"
                                    ? "bg-violet-500/15"
                                    : "bg-muted"
                                )}
                                style={{ transform: "translateZ(20px)" }}
                              >
                                <Palette
                                  className={cn(
                                    "size-7",
                                    role === "AUTHOR"
                                      ? "text-violet-600 dark:text-violet-400"
                                      : "text-muted-foreground"
                                  )}
                                />
                              </div>
                              <div className="text-center" style={{ transform: "translateZ(10px)" }}>
                                <p
                                  className={cn(
                                    "font-semibold",
                                    role === "AUTHOR"
                                      ? "text-violet-600 dark:text-violet-400"
                                      : "text-foreground"
                                  )}
                                >
                                  I want to Sell
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Create & sell your digital work
                                </p>
                              </div>
                            </TiltCard>

                            {/* Why join as Author popover */}
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="absolute -top-2 -right-2 size-6 rounded-full bg-violet-500 text-white flex items-center justify-center hover:bg-violet-600 transition-colors shadow-sm z-10"
                                >
                                  <Info className="size-3" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-3" side="right" align="start">
                                <p className="font-semibold text-sm mb-2">Why join as Author?</p>
                                <div className="space-y-2">
                                  {authorBenefits.map((b) => {
                                    const BIcon = b.icon;
                                    return (
                                      <div key={b.title} className="flex items-start gap-2">
                                        <BIcon className={`size-4 ${b.color} shrink-0 mt-0.5`} />
                                        <div>
                                          <p className="text-xs font-medium">{b.title}</p>
                                          <p className="text-[10px] text-muted-foreground">{b.desc}</p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        {fieldErrors.role && (
                          <p className="text-sm text-destructive">
                            {fieldErrors.role}
                          </p>
                        )}

                        <Button
                          type="button"
                          onClick={handleNext}
                          className="w-full h-11 text-base bg-gradient-to-r from-violet-600 to-rose-600 hover:from-violet-700 hover:to-rose-700 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden group"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                          Continue
                          <ArrowRight className="ml-2 size-4" />
                        </Button>
                      </motion.div>
                    )}

                    {/* Step 2: Account Details */}
                    {step === 2 && !showSuccess && (
                      <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label
                            htmlFor="name"
                            className={cn(
                              "transition-all duration-200",
                              focusedField === "name"
                                ? "text-violet-600 dark:text-violet-400 font-medium"
                                : ""
                            )}
                          >
                            Full name
                          </Label>
                          <div className="relative">
                            <motion.div
                              animate={focusedField === "name" ? { opacity: 1 } : { opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="absolute -inset-1 rounded-lg bg-violet-500/10 blur-sm pointer-events-none"
                            />
                            <Input
                              id="name"
                              type="text"
                              placeholder="John Doe"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              onFocus={() => setFocusedField("name")}
                              onBlur={() => setFocusedField(null)}
                              autoComplete="name"
                              className={cn(
                                "relative h-11 transition-all duration-300",
                                focusedField === "name"
                                  ? "border-violet-500/50 ring-2 ring-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                                  : "",
                                fieldErrors.name && "border-destructive"
                              )}
                            />
                          </div>
                          {fieldErrors.name && (
                            <p className="text-xs text-destructive">
                              {fieldErrors.name}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="email"
                            className={cn(
                              "transition-all duration-200",
                              focusedField === "email"
                                ? "text-violet-600 dark:text-violet-400 font-medium"
                                : ""
                            )}
                          >
                            Email
                          </Label>
                          <div className="relative">
                            <motion.div
                              animate={focusedField === "email" ? { opacity: 1 } : { opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="absolute -inset-1 rounded-lg bg-violet-500/10 blur-sm pointer-events-none"
                            />
                            <Input
                              id="email"
                              type="email"
                              placeholder="your@email.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              onFocus={() => setFocusedField("email")}
                              onBlur={() => setFocusedField(null)}
                              autoComplete="email"
                              className={cn(
                                "relative h-11 transition-all duration-300",
                                focusedField === "email"
                                  ? "border-violet-500/50 ring-2 ring-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                                  : "",
                                fieldErrors.email && "border-destructive"
                              )}
                            />
                          </div>
                          {fieldErrors.email && (
                            <p className="text-xs text-destructive">
                              {fieldErrors.email}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="reg-password"
                            className={cn(
                              "transition-all duration-200",
                              focusedField === "reg-password"
                                ? "text-violet-600 dark:text-violet-400 font-medium"
                                : ""
                            )}
                          >
                            Password
                          </Label>
                          <div className="relative">
                            <motion.div
                              animate={focusedField === "reg-password" ? { opacity: 1 } : { opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="absolute -inset-1 rounded-lg bg-violet-500/10 blur-sm pointer-events-none"
                            />
                            <Input
                              id="reg-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              onFocus={() => setFocusedField("reg-password")}
                              onBlur={() => setFocusedField(null)}
                              autoComplete="new-password"
                              className={cn(
                                "h-11 pr-10 transition-all duration-300 relative",
                                focusedField === "reg-password"
                                  ? "border-violet-500/50 ring-2 ring-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                                  : "",
                                fieldErrors.password && "border-destructive"
                              )}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
                            >
                              {showPassword ? (
                                <EyeOff className="size-4" />
                              ) : (
                                <Eye className="size-4" />
                              )}
                            </button>
                          </div>
                          {fieldErrors.password && (
                            <p className="text-xs text-destructive">
                              {fieldErrors.password}
                            </p>
                          )}
                          {/* Enhanced password strength with continuous gradient + shimmer */}
                          {password && (
                            <div className="space-y-2">
                              <div className="relative h-2 rounded-full overflow-hidden bg-muted">
                                {/* Background gradient track */}
                                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-yellow-500/10 to-emerald-500/10 rounded-full" />
                                {/* Animated fill bar with continuous color gradient */}
                                <motion.div
                                  className="absolute inset-y-0 left-0 rounded-full"
                                  initial={{ width: "0%" }}
                                  animate={{
                                    width: `${(passwordStrength.score / 5) * 100}%`,
                                  }}
                                  transition={{ duration: 0.5, ease: "easeOut" }}
                                  style={{
                                    background: `linear-gradient(90deg, #ef4444 0%, #f97316 25%, #eab308 50%, #10b981 75%, #059669 100%)`,
                                  }}
                                />
                                {/* Shimmer overlay on filled portion */}
                                <motion.div
                                  className="absolute inset-y-0 left-0 rounded-full strength-shimmer"
                                  style={{
                                    width: `${(passwordStrength.score / 5) * 100}%`,
                                    backgroundImage: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)`,
                                    backgroundSize: "200% 100%",
                                  }}
                                  initial={{ width: "0%" }}
                                  animate={{
                                    width: `${(passwordStrength.score / 5) * 100}%`,
                                  }}
                                  transition={{ duration: 0.5, ease: "easeOut" }}
                                />
                              </div>
                              {/* Individual segment indicators (small dots below) */}
                              <div className="flex justify-between">
                                {[1, 2, 3, 4, 5].map((level) => (
                                  <motion.div
                                    key={level}
                                    className={cn(
                                      "size-1.5 rounded-full transition-colors duration-300",
                                      passwordStrength.score >= level
                                        ? "bg-current"
                                        : "bg-muted-foreground/20"
                                    )}
                                    style={{
                                      color: passwordStrength.barColor,
                                    }}
                                    animate={
                                      passwordStrength.score >= level
                                        ? { scale: [1, 1.5, 1] }
                                        : undefined
                                    }
                                    transition={{ duration: 0.2, delay: level * 0.05 }}
                                  />
                                ))}
                              </div>
                              <p
                                className={cn(
                                  "text-xs font-medium transition-colors",
                                  passwordStrength.textColor
                                )}
                              >
                                {passwordStrength.label}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="confirmPassword"
                            className={cn(
                              "transition-all duration-200",
                              focusedField === "confirmPassword"
                                ? "text-violet-600 dark:text-violet-400 font-medium"
                                : ""
                            )}
                          >
                            Confirm password
                          </Label>
                          <div className="relative">
                            <motion.div
                              animate={focusedField === "confirmPassword" ? { opacity: 1 } : { opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="absolute -inset-1 rounded-lg bg-violet-500/10 blur-sm pointer-events-none"
                            />
                            <Input
                              id="confirmPassword"
                              type={
                                showConfirmPassword ? "text" : "password"
                              }
                              placeholder="••••••••"
                              value={confirmPassword}
                              onChange={(e) =>
                                setConfirmPassword(e.target.value)
                              }
                              onFocus={() =>
                                setFocusedField("confirmPassword")
                              }
                              onBlur={() => setFocusedField(null)}
                              autoComplete="new-password"
                              className={cn(
                                "h-11 pr-10 transition-all duration-300 relative",
                                focusedField === "confirmPassword"
                                  ? "border-violet-500/50 ring-2 ring-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                                  : "",
                                fieldErrors.confirmPassword &&
                                  "border-destructive"
                              )}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="size-4" />
                              ) : (
                                <Eye className="size-4" />
                              )}
                            </button>
                          </div>
                          {fieldErrors.confirmPassword && (
                            <p className="text-xs text-destructive">
                              {fieldErrors.confirmPassword}
                            </p>
                          )}
                          {/* Password match indicator */}
                          {confirmPassword && password && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center gap-1.5"
                            >
                              {password === confirmPassword ? (
                                <>
                                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                                  <span className="text-xs text-emerald-500 font-medium">Passwords match</span>
                                </>
                              ) : (
                                <>
                                  <Zap className="size-3.5 text-destructive" />
                                  <span className="text-xs text-destructive font-medium">Passwords don&apos;t match</span>
                                </>
                              )}
                            </motion.div>
                          )}
                        </div>

                        {/* Enhanced terms checkbox with custom animated styling */}
                        <motion.div
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border transition-all duration-300",
                            termsAccepted
                              ? "bg-violet-500/5 border-violet-500/20 shadow-sm shadow-violet-500/5"
                              : "bg-muted/30 border-transparent hover:bg-muted/50"
                          )}
                          animate={termsAccepted ? { scale: [1, 1.005, 1] } : {}}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="relative mt-0.5">
                            <motion.div
                              animate={termsAccepted ? { scale: [1, 1.2, 1] } : {}}
                              transition={{ duration: 0.3 }}
                            >
                              <Checkbox
                                id="terms"
                                checked={termsAccepted}
                                onCheckedChange={(checked) =>
                                  setTermsAccepted(checked === true)
                                }
                                className="size-4 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600 transition-all duration-200"
                              />
                            </motion.div>
                            {/* Confetti burst on checkbox accept */}
                            <AnimatePresence>
                              {termsAccepted && (
                                <>
                                  {[...Array(6)].map((_, i) => (
                                    <motion.div
                                      key={i}
                                      className="absolute size-1 rounded-full"
                                      style={{
                                        backgroundColor: ["#8b5cf6", "#f43f5e", "#10b981", "#f59e0b", "#06b6d4", "#ec4899"][i],
                                        left: "50%",
                                        top: "50%",
                                      }}
                                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                      animate={{
                                        x: (Math.random() - 0.5) * 40,
                                        y: (Math.random() - 0.5) * 40,
                                        opacity: 0,
                                        scale: 0,
                                      }}
                                      exit={{ opacity: 0 }}
                                      transition={{ duration: 0.5, ease: "easeOut" }}
                                    />
                                  ))}
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                          <Label
                            htmlFor="terms"
                            className="text-sm text-muted-foreground cursor-pointer leading-relaxed"
                          >
                            I agree to the{" "}
                            <button
                              type="button"
                              className="text-violet-600 dark:text-violet-400 font-semibold hover:underline hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                            >
                              Terms of Service
                            </button>{" "}
                            and{" "}
                            <button
                              type="button"
                              className="text-violet-600 dark:text-violet-400 font-semibold hover:underline hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                            >
                              Privacy Policy
                            </button>
                          </Label>
                        </motion.div>
                        {fieldErrors.terms && (
                          <p className="text-xs text-destructive">
                            {fieldErrors.terms}
                          </p>
                        )}

                        <div className="flex gap-3 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleBack}
                            className="h-11"
                          >
                            <ArrowLeft className="mr-2 size-4" />
                            Back
                          </Button>
                          {role === "AUTHOR" ? (
                            <Button
                              type="button"
                              onClick={handleNext}
                              className="flex-1 h-11 text-base bg-gradient-to-r from-violet-600 to-rose-600 hover:from-violet-700 hover:to-rose-700 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden group"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                              Continue
                              <ArrowRight className="ml-2 size-4" />
                            </Button>
                          ) : (
                            <Button
                              type="submit"
                              disabled={isLoading}
                              className="flex-1 h-11 text-base bg-gradient-to-r from-violet-600 to-rose-600 hover:from-violet-700 hover:to-rose-700 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden group"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                              {isLoading ? (
                                <>
                                  <Loader2 className="mr-2 size-4 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                <>
                                  Create Account
                                  <ArrowRight className="ml-2 size-4" />
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* Step 3: Author Info */}
                    {step === 3 && !showSuccess && (
                      <motion.div
                        key="step3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label
                            htmlFor="bio"
                            className={cn(
                              "transition-all duration-200",
                              focusedField === "bio"
                                ? "text-violet-600 dark:text-violet-400 font-medium"
                                : ""
                            )}
                          >
                            Bio
                          </Label>
                          <div className="relative">
                            <motion.div
                              animate={focusedField === "bio" ? { opacity: 1 } : { opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="absolute -inset-1 rounded-lg bg-violet-500/10 blur-sm pointer-events-none"
                            />
                            <Textarea
                              id="bio"
                              placeholder="Tell buyers about yourself, your skills, and your experience..."
                              value={bio}
                              onChange={(e) => setBio(e.target.value)}
                              onFocus={() => setFocusedField("bio")}
                              onBlur={() => setFocusedField(null)}
                              rows={4}
                              className={cn(
                                "relative transition-all duration-300",
                                focusedField === "bio"
                                  ? "border-violet-500/50 ring-2 ring-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                                  : ""
                              )}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            A compelling bio helps buyers trust and connect with you
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="location"
                            className={cn(
                              "transition-all duration-200",
                              focusedField === "location"
                                ? "text-violet-600 dark:text-violet-400 font-medium"
                                : ""
                            )}
                          >
                            Location
                          </Label>
                          <div className="relative">
                            <motion.div
                              animate={focusedField === "location" ? { opacity: 1 } : { opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="absolute -inset-1 rounded-lg bg-violet-500/10 blur-sm pointer-events-none"
                            />
                            <Input
                              id="location"
                              type="text"
                              placeholder="San Francisco, CA"
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                              onFocus={() => setFocusedField("location")}
                              onBlur={() => setFocusedField(null)}
                              className={cn(
                                "relative h-11 transition-all duration-300",
                                focusedField === "location"
                                  ? "border-violet-500/50 ring-2 ring-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                                  : ""
                              )}
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleBack}
                            className="h-11"
                          >
                            <ArrowLeft className="mr-2 size-4" />
                            Back
                          </Button>
                          <Button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 h-11 text-base bg-gradient-to-r from-violet-600 to-rose-600 hover:from-violet-700 hover:to-rose-700 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden group"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 size-4 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              <>
                                Create Account
                                <ArrowRight className="ml-2 size-4" />
                              </>
                            )}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              </CardContent>
              <CardFooter className="justify-center pb-6 relative z-10">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    onClick={() => navigate("login")}
                    className="text-violet-600 dark:text-violet-400 font-semibold hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </CardFooter>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
