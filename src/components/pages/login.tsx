"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  LogIn,
  Loader2,
  Shield,
  BadgeCheck,
  MessageCircle,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2,
  Hexagon,
  Triangle,
  Diamond,
  Globe,
  Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { useNavigationStore } from "@/store/navigation";
import { useAuthStore } from "@/store/auth";

// ─── Particle System ───
function ParticleField() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; duration: number; delay: number; opacity: number }>>([]);

  useEffect(() => {
    const pts = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.4 + 0.1,
    }));
    setParticles(pts);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-emerald-400 dark:bg-emerald-300"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, (Math.random() - 0.5) * 30, 0],
            opacity: [p.opacity, p.opacity * 1.5, p.opacity],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

// ─── Animated Geometric Shapes (CSS Keyframes) ───
function GeometricShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large Hexagon */}
      <div className="geo-shape geo-float-1 top-[8%] right-[18%]" style={{ animationDelay: "0s" }}>
        <Hexagon className="size-12 text-emerald-400/10 dark:text-emerald-400/8" strokeWidth={1.5} />
      </div>

      {/* Triangle */}
      <div className="geo-shape geo-float-2 bottom-[15%] left-[12%]" style={{ animationDelay: "1s" }}>
        <Triangle className="size-10 text-violet-400/10 dark:text-violet-400/8" strokeWidth={1.5} />
      </div>

      {/* Diamond */}
      <div className="geo-shape geo-float-3 top-[35%] right-[6%]" style={{ animationDelay: "2s" }}>
        <Diamond className="size-8 text-amber-400/10 dark:text-amber-400/8" strokeWidth={1.5} />
      </div>

      {/* Small hexagon */}
      <div className="geo-shape geo-float-4 bottom-[30%] left-[30%]" style={{ animationDelay: "0.5s" }}>
        <Hexagon className="size-6 text-teal-400/12 dark:text-teal-400/8" strokeWidth={1} />
      </div>

      {/* Rotated diamond */}
      <div className="geo-shape geo-float-5 top-[65%] right-[28%]" style={{ animationDelay: "3s" }}>
        <Diamond className="size-5 text-emerald-400/10 dark:text-emerald-400/8" strokeWidth={1} />
      </div>

      {/* CSS-only floating circles with dashed border */}
      <div
        className="geo-shape geo-float-3 top-[20%] left-[20%] w-16 h-16 rounded-full border border-dashed border-emerald-400/10 dark:border-emerald-400/8"
        style={{ animationDelay: "1.5s" }}
      />
      <div
        className="geo-shape geo-float-1 bottom-[25%] right-[35%] w-10 h-10 rounded-full border border-dashed border-violet-400/10 dark:border-violet-400/8"
        style={{ animationDelay: "2.5s" }}
      />

      {/* Squares */}
      <div
        className="geo-shape geo-float-4 top-[50%] left-[8%] w-8 h-8 rounded-sm border border-amber-400/10 rotate-45"
        style={{ animationDelay: "1.5s" }}
      />

      {/* Plus/cross shapes */}
      <div className="geo-shape geo-float-2 top-[75%] left-[45%]" style={{ animationDelay: "0.8s" }}>
        <div className="relative size-6">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-emerald-400/10 -translate-y-1/2" />
          <div className="absolute left-1/2 top-0 h-full w-0.5 bg-emerald-400/10 -translate-x-1/2" />
        </div>
      </div>

      {/* Dotted ring */}
      <div
        className="geo-shape geo-float-5 top-[12%] left-[40%] w-20 h-20 rounded-full border-2 border-dotted border-teal-400/8"
        style={{ animationDelay: "3s" }}
      />
    </div>
  );
}

// ─── Animated Gradient Mesh Background ───
function GradientMeshBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Main mesh gradient */}
      <div className="mesh-bg absolute inset-0" />

      {/* Animated color orbs */}
      <div className="mesh-orb-1 absolute top-[10%] left-[15%] w-72 h-72 rounded-full bg-emerald-500/8" />
      <div className="mesh-orb-2 absolute bottom-[10%] right-[10%] w-64 h-64 rounded-full bg-violet-500/8" />
      <div className="mesh-orb-3 absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-teal-500/5" />

      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}

// ─── Network Illustration with Orbits ───
function NetworkIllustration() {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Glow backdrop */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-64 h-64 rounded-full bg-emerald-400/10 dark:bg-emerald-400/5 blur-3xl" />
      </div>
      <svg
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto relative"
      >
        <defs>
          <radialGradient id="lg1" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </radialGradient>
          <radialGradient id="lg2" cx="70%" cy="30%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#10b981" />
          </radialGradient>
          <radialGradient id="lg3" cx="50%" cy="70%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </radialGradient>
          <linearGradient id="lineGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Orbit rings */}
        <circle cx="200" cy="200" r="80" fill="none" stroke="#10b981" strokeWidth="0.5" opacity="0.2" strokeDasharray="4 6">
          <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="20s" repeatCount="indefinite" />
        </circle>
        <circle cx="200" cy="200" r="120" fill="none" stroke="#8b5cf6" strokeWidth="0.5" opacity="0.15" strokeDasharray="6 8">
          <animateTransform attributeName="transform" type="rotate" from="360 200 200" to="0 200 200" dur="30s" repeatCount="indefinite" />
        </circle>
        <circle cx="200" cy="200" r="160" fill="none" stroke="#14b8a6" strokeWidth="0.5" opacity="0.1" strokeDasharray="8 10">
          <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="40s" repeatCount="indefinite" />
        </circle>

        {/* Rotating circles (filled) */}
        <circle cx="200" cy="200" r="160" fill="url(#lg1)" opacity="0.06">
          <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="50s" repeatCount="indefinite" />
        </circle>
        <circle cx="200" cy="200" r="120" fill="url(#lg2)" opacity="0.08">
          <animateTransform attributeName="transform" type="rotate" from="360 200 200" to="0 200 200" dur="35s" repeatCount="indefinite" />
        </circle>

        {/* Connection lines with draw animation */}
        <line x1="140" y1="140" x2="200" y2="200" stroke="url(#lineGrad2)" strokeWidth="1.5" opacity="0.4" strokeDasharray="200" strokeDashoffset="0">
          <animate attributeName="stroke-dashoffset" from="200" to="0" dur="2s" fill="freeze" />
        </line>
        <line x1="260" y1="140" x2="200" y2="200" stroke="url(#lineGrad2)" strokeWidth="1.5" opacity="0.4" strokeDasharray="200" strokeDashoffset="0">
          <animate attributeName="stroke-dashoffset" from="200" to="0" dur="2s" begin="0.2s" fill="freeze" />
        </line>
        <line x1="200" y1="300" x2="200" y2="200" stroke="url(#lineGrad2)" strokeWidth="1.5" opacity="0.4" strokeDasharray="200" strokeDashoffset="0">
          <animate attributeName="stroke-dashoffset" from="200" to="0" dur="2s" begin="0.4s" fill="freeze" />
        </line>
        <line x1="130" y1="260" x2="200" y2="200" stroke="url(#lineGrad2)" strokeWidth="1.5" opacity="0.4" strokeDasharray="200" strokeDashoffset="0">
          <animate attributeName="stroke-dashoffset" from="200" to="0" dur="2s" begin="0.6s" fill="freeze" />
        </line>
        <line x1="270" y1="260" x2="200" y2="200" stroke="url(#lineGrad2)" strokeWidth="1.5" opacity="0.4" strokeDasharray="200" strokeDashoffset="0">
          <animate attributeName="stroke-dashoffset" from="200" to="0" dur="2s" begin="0.8s" fill="freeze" />
        </line>

        {/* Center node with pulse */}
        <circle cx="200" cy="200" r="28" fill="url(#lg1)" opacity="0.15">
          <animate attributeName="r" values="28;32;28" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="200" cy="200" r="20" fill="url(#lg1)" opacity="0.8" />
        <circle cx="200" cy="200" r="12" fill="white" opacity="0.9" />

        {/* Outer nodes with appear animation */}
        <g opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="1s" fill="freeze" />
          <circle cx="140" cy="140" r="14" fill="#10b981" opacity="0.7" />
          <circle cx="140" cy="140" r="7" fill="white" opacity="0.6" />
          <circle cx="260" cy="140" r="14" fill="#f59e0b" opacity="0.7" />
          <circle cx="260" cy="140" r="7" fill="white" opacity="0.6" />
          <circle cx="200" cy="300" r="14" fill="#8b5cf6" opacity="0.7" />
          <circle cx="200" cy="300" r="7" fill="white" opacity="0.6" />
          <circle cx="130" cy="260" r="14" fill="#14b8a6" opacity="0.7" />
          <circle cx="130" cy="260" r="7" fill="white" opacity="0.6" />
          <circle cx="270" cy="260" r="14" fill="#10b981" opacity="0.7" />
          <circle cx="270" cy="260" r="7" fill="white" opacity="0.6" />
        </g>

        {/* Orbiting dots */}
        <g>
          <circle cx="0" cy="0" r="3" fill="#10b981" opacity="0.6">
            <animateMotion dur="8s" repeatCount="indefinite" path="M200,200 m-80,0 a80,80 0 1,0 160,0 a80,80 0 1,0 -160,0" />
          </circle>
        </g>
        <g>
          <circle cx="0" cy="0" r="3" fill="#8b5cf6" opacity="0.5">
            <animateMotion dur="12s" repeatCount="indefinite" path="M200,200 m-120,0 a120,120 0 1,1 240,0 a120,120 0 1,1 -240,0" />
          </circle>
        </g>
        <g>
          <circle cx="0" cy="0" r="2.5" fill="#f59e0b" opacity="0.4">
            <animateMotion dur="16s" repeatCount="indefinite" path="M200,200 m-160,0 a160,160 0 1,0 320,0 a160,160 0 1,0 -320,0" />
          </circle>
        </g>

        {/* Small dots */}
        <circle cx="100" cy="200" r="4" fill="#8b5cf6" opacity="0.4" />
        <circle cx="300" cy="200" r="4" fill="#10b981" opacity="0.4" />
        <circle cx="200" cy="100" r="4" fill="#f59e0b" opacity="0.4" />
        <circle cx="170" cy="170" r="3" fill="#14b8a6" opacity="0.3" />
        <circle cx="230" cy="170" r="3" fill="#f59e0b" opacity="0.3" />

        {/* Floating card shapes */}
        <rect x="55" y="170" width="50" height="32" rx="6" fill="white" stroke="#10b981" strokeWidth="1.5" opacity="0.6" />
        <text x="80" y="190" textAnchor="middle" fontSize="11" fill="#10b981" fontWeight="bold" opacity="0.7">$</text>
        <rect x="295" y="230" width="50" height="32" rx="6" fill="white" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.6" />
        <text x="320" y="250" textAnchor="middle" fontSize="11" fill="#8b5cf6" fontWeight="bold" opacity="0.7">✓</text>
      </svg>
    </div>
  );
}

// ─── Success Animation ───
function LoginSuccess() {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-card/95 backdrop-blur-sm rounded-xl"
    >
      <div className="flex flex-col items-center gap-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.1 }}
          className="relative"
        >
          <motion.div
            className="absolute -inset-3 rounded-full bg-emerald-500/20"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <div className="relative size-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="size-10 text-white" />
          </div>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-lg font-semibold text-emerald-600 dark:text-emerald-400"
        >
          Welcome back!
        </motion.p>
      </div>
      {/* Mini confetti */}
      {[...Array(16)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute size-2 rounded-full left-1/2 top-1/2"
          style={{
            backgroundColor: ["#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"][i % 6],
          }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{
            x: (Math.random() - 0.5) * 250,
            y: (Math.random() - 0.5) * 200,
            opacity: 0,
            scale: [1, 1.5, 0],
          }}
          transition={{ duration: 1.2, delay: 0.05 * i, ease: "easeOut" }}
        />
      ))}
    </motion.div>
  );
}

export function LoginPage() {
  const { navigate } = useNavigationStore();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorKey, setErrorKey] = useState(0);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      setErrorKey((k) => k + 1);
      return;
    }
    if (!password) {
      setError("Password is required");
      setErrorKey((k) => k + 1);
      return;
    }

    try {
      await login(email, password);
      setShowSuccess(true);
      // Delay navigation to show success animation
      setTimeout(() => {
        const { user } = useAuthStore.getState();
        if (user?.role === "SUPER_ADMIN" || user?.role === "MODERATOR") {
          navigate("admin");
        } else if (user?.role === "AUTHOR") {
          if (!user.profile?.bio && user.status === "PENDING") {
            navigate("onboarding");
          } else {
            navigate("dashboard");
          }
        } else {
          navigate("dashboard");
        }
      }, 1200);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please check your credentials."
      );
      setErrorKey((k) => k + 1);
    }
  }, [email, password, login, navigate]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      {/* ─── Left Panel (Desktop only) ─── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 dark:from-emerald-900 dark:via-teal-900 dark:to-cyan-950">
        {/* Mesh gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/30 via-transparent to-violet-500/20" />

        {/* Particle animation */}
        <ParticleField />

        {/* Animated floating shapes (CSS keyframes) */}
        <div className="geo-shape geo-float-1 top-[12%] left-[15%]">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20" />
        </div>
        <div className="geo-shape geo-float-3 top-[60%] left-[10%]" style={{ animationDelay: "1s" }}>
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20" />
        </div>
        <div className="geo-shape geo-float-2 top-[25%] right-[15%]" style={{ animationDelay: "2s" }}>
          <div className="w-10 h-10 rounded-xl bg-amber-400/15 backdrop-blur-sm border border-amber-400/20" />
        </div>
        <div className="geo-shape geo-float-4 bottom-[20%] right-[20%]" style={{ animationDelay: "0.5s" }}>
          <div className="w-14 h-14 rounded-full bg-violet-400/15 backdrop-blur-sm border border-violet-400/20" />
        </div>
        <div className="geo-shape geo-float-5 top-[45%] left-[45%]" style={{ animationDelay: "1.5s" }}>
          <div className="w-8 h-8 rounded-lg bg-rose-400/15 backdrop-blur-sm border border-rose-400/20" />
        </div>
        <div className="geo-shape geo-float-1 bottom-[35%] left-[30%]" style={{ animationDelay: "3s" }}>
          <div className="w-6 h-6 rounded-full bg-white/15 backdrop-blur-sm border border-white/20" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center px-12 xl:px-16 w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-md text-center"
          >
            {/* Logo/Brand Mark */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
              className="size-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center mx-auto mb-8"
            >
              <Sparkles className="size-8 text-white" />
            </motion.div>

            <h1 className="text-4xl xl:text-5xl font-extrabold text-white mb-4 leading-tight">
              Welcome back
            </h1>
            <p className="text-lg text-white/75 mb-10 leading-relaxed">
              Sign in to access your dashboard, manage orders, and connect with
              top digital creators on the marketplace.
            </p>

            {/* Network illustration */}
            <NetworkIllustration />

            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-white/60">
              <div className="flex items-center gap-1.5">
                <Shield className="size-4" />
                <span>Secure</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BadgeCheck className="size-4" />
                <span>Verified</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageCircle className="size-4" />
                <span>24/7 Support</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ─── Right Panel (Form) ─── */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative">
        {/* Animated gradient mesh background */}
        <GradientMeshBackground />

        {/* Geometric background shapes (CSS keyframes) */}
        <GeometricShapes />

        {/* Mobile gradient header */}
        <div className="lg:hidden absolute top-0 left-0 right-0 h-48 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-500/5 dark:via-teal-500/3 dark:to-transparent pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile-only branding */}
          <div className="lg:hidden text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 12 }}
              className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3"
            >
              <Sparkles className="size-6 text-emerald-600 dark:text-emerald-400" />
            </motion.div>
            <h2 className="text-xl font-bold">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to your account
            </p>
          </div>

          {/* Card with gradient border effect + glassmorphism */}
          <div className="relative rounded-xl p-[1px] bg-gradient-to-br from-emerald-500/30 via-transparent to-violet-500/30">
            {/* Subtle shimmer on the border */}
            <div className="absolute inset-0 rounded-xl social-btn-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity" />

            <Card className="border-0 shadow-2xl relative overflow-hidden bg-card/80 dark:bg-card/60 backdrop-blur-xl">
              {/* Inner glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-violet-500/5 pointer-events-none" />

              {/* Success overlay */}
              <AnimatePresence>
                {showSuccess && <LoginSuccess />}
              </AnimatePresence>

              <CardHeader className="text-center pb-2 hidden lg:block relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  className="size-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4"
                >
                  <LogIn className="size-7 text-emerald-600 dark:text-emerald-400" />
                </motion.div>
                <CardTitle className="text-2xl font-bold">
                  Sign in
                </CardTitle>
                <CardDescription className="text-base">
                  Enter your credentials to continue
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 lg:pt-4 relative z-10">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Error message with slide-in animation */}
                  <AnimatePresence mode="wait">
                    {error && (
                      <motion.div
                        key={errorKey}
                        initial={{ opacity: 0, x: -30, height: 0 }}
                        animate={{ opacity: 1, x: 0, height: "auto" }}
                        exit={{ opacity: 0, x: -20, height: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="error-slide overflow-hidden"
                      >
                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20 flex items-center gap-2">
                          <motion.span
                            animate={{ rotate: [0, -10, 10, -10, 0] }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                          >
                            <Zap className="size-4 shrink-0" />
                          </motion.span>
                          {error}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Email field with animated glowing focus effect */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className={`transition-all duration-300 ${
                        focusedField === "email"
                          ? "text-emerald-600 dark:text-emerald-400 font-medium"
                          : ""
                      }`}
                    >
                      Email
                    </Label>
                    <div className="relative">
                      <motion.div
                        animate={focusedField === "email" ? { opacity: 1 } : { opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute -inset-1 rounded-lg bg-emerald-500/10 blur-sm pointer-events-none"
                      />
                      <motion.div
                        animate={focusedField === "email" ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      >
                        <Globe className="size-4 text-emerald-500/50" />
                      </motion.div>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField("email")}
                        onBlur={() => setFocusedField(null)}
                        required
                        autoComplete="email"
                        className={`relative h-11 pl-9 transition-all duration-300 ${
                          focusedField === "email"
                            ? "input-focused border-emerald-500/50"
                            : ""
                        }`}
                      />
                    </div>
                  </div>

                  {/* Password field with animated glowing focus effect */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="password"
                        className={`transition-all duration-300 ${
                          focusedField === "password"
                            ? "text-emerald-600 dark:text-emerald-400 font-medium"
                            : ""
                        }`}
                      >
                        Password
                      </Label>
                      <button
                        type="button"
                        className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                        onClick={() => navigate("forgot-password")}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <motion.div
                        animate={focusedField === "password" ? { opacity: 1 } : { opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute -inset-1 rounded-lg bg-emerald-500/10 blur-sm pointer-events-none"
                      />
                      <motion.div
                        animate={focusedField === "password" ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      >
                        <Fingerprint className="size-4 text-emerald-500/50" />
                      </motion.div>
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => setFocusedField(null)}
                        required
                        autoComplete="current-password"
                        className={`relative h-11 pl-9 pr-10 transition-all duration-300 ${
                          focusedField === "password"
                            ? "input-focused border-emerald-500/50"
                            : ""
                        }`}
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
                  </div>

                  {/* Remember me with custom Switch styling */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={setRememberMe}
                        className="data-[state=checked]:bg-emerald-600"
                      />
                      <Label
                        htmlFor="remember"
                        className="text-sm text-muted-foreground cursor-pointer select-none"
                      >
                        Remember me
                      </Label>
                    </div>
                    <span className="text-xs text-muted-foreground">30 days</span>
                  </div>

                  {/* Sign in button */}
                  <Button
                    type="submit"
                    className="w-full h-11 text-base bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden group"
                    disabled={isLoading || showSuccess}
                  >
                    {/* Shimmer effect on button */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="ml-2 size-4" />
                      </>
                    )}
                  </Button>
                </form>

              </CardContent>
              <CardFooter className="flex-col gap-4 pb-6 relative z-10">
                <p className="text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => navigate("register")}
                    className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                  >
                    Sign up
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
