"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  Shield,
  BadgeCheck,
  MessageCircle,
  Percent,
  Scale,
  BarChart3,
  Star,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
  TrendingUp,
  Award,
  Sparkles,
  Zap,
  Search,
  CreditCard,
  ClipboardCheck,
  Quote,
  ArrowDownRight,
  ArrowUp,
  Lock,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigationStore } from "@/store/navigation";
import { useAuthStore } from "@/store/auth";
import { apiGet } from "@/lib/api-client";

// ─── Feature Data ───
const features = [
  {
    icon: Shield,
    title: "Secure Payments",
    description:
      "Every transaction is protected with enterprise-grade encryption and escrow until delivery is confirmed. Your money stays safe until you're satisfied.",
    detail: "256-bit SSL encryption with escrow protection on every order.",
    color: "emerald",
  },
  {
    icon: BadgeCheck,
    title: "Verified Sellers",
    description:
      "All sellers undergo a thorough verification process including identity checks and portfolio reviews to ensure authenticity and quality of service.",
    detail: "Multi-step verification: ID, portfolio, and skill assessment.",
    color: "violet",
  },
  {
    icon: MessageCircle,
    title: "Real-time Chat",
    description:
      "Communicate directly with creators through our integrated real-time messaging system. Share files, discuss requirements, and close deals seamlessly.",
    detail: "Instant messaging with file sharing and read receipts.",
    color: "sky",
  },
  {
    icon: Percent,
    title: "Fair Commissions",
    description:
      "Industry-leading commission rates that reward great creators while keeping costs low for buyers. Transparent fee structure with no hidden charges.",
    detail: "Starting at just 5% — the lowest in the industry.",
    color: "amber",
  },
  {
    icon: Scale,
    title: "Dispute Protection",
    description:
      "Dedicated support team to resolve any issues quickly and fairly, protecting both buyers and sellers. Our mediation process ensures equitable outcomes.",
    detail: "Average resolution time under 48 hours with 95% satisfaction.",
    color: "rose",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Track your earnings, sales trends, and performance metrics with our comprehensive analytics tools. Make data-driven decisions to grow your business.",
    detail: "Real-time charts, revenue tracking, and exportable reports.",
    color: "teal",
  },
];

const featureColorMap: Record<string, { bg: string; icon: string; ring: string; border: string; glow: string }> = {
  emerald: { bg: "bg-emerald-500/10", icon: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/20", border: "hover:border-emerald-500/40", glow: "group-hover:shadow-emerald-500/10" },
  violet: { bg: "bg-violet-500/10", icon: "text-violet-600 dark:text-violet-400", ring: "ring-violet-500/20", border: "hover:border-violet-500/40", glow: "group-hover:shadow-violet-500/10" },
  sky: { bg: "bg-sky-500/10", icon: "text-sky-600 dark:text-sky-400", ring: "ring-sky-500/20", border: "hover:border-sky-500/40", glow: "group-hover:shadow-sky-500/10" },
  amber: { bg: "bg-amber-500/10", icon: "text-amber-600 dark:text-amber-400", ring: "ring-amber-500/20", border: "hover:border-amber-500/40", glow: "group-hover:shadow-amber-500/10" },
  rose: { bg: "bg-rose-500/10", icon: "text-rose-600 dark:text-rose-400", ring: "ring-rose-500/20", border: "hover:border-rose-500/40", glow: "group-hover:shadow-rose-500/10" },
  teal: { bg: "bg-teal-500/10", icon: "text-teal-600 dark:text-teal-400", ring: "ring-teal-500/20", border: "hover:border-teal-500/40", glow: "group-hover:shadow-teal-500/10" },
  cyan: { bg: "bg-cyan-500/10", icon: "text-cyan-600 dark:text-cyan-400", ring: "ring-cyan-500/20", border: "hover:border-cyan-500/40", glow: "group-hover:shadow-cyan-500/10" },
};

// ─── Testimonial Data (NEW section) ───
const testimonials = [
  {
    name: "Sarah Chen",
    role: "UX Designer",
    avatar: "SC",
    rating: 5,
    quote: "This platform transformed how I sell my design templates. The escrow system gives me peace of mind, and I've tripled my client base in just three months!",
    color: "emerald",
    avatarBg: "bg-emerald-500",
  },
  {
    name: "Marcus Johnson",
    role: "CTO at DataSync",
    avatar: "MJ",
    rating: 5,
    quote: "Finding reliable developers used to be a nightmare. The verification process means I can hire with confidence. The real-time chat makes collaboration seamless.",
    color: "violet",
    avatarBg: "bg-violet-500",
  },
  {
    name: "Elena Rodriguez",
    role: "Freelance Illustrator",
    avatar: "ER",
    rating: 4,
    quote: "The analytics dashboard is a game-changer. I can see exactly what's selling, track my earnings, and plan my content strategy. Best platform for creators!",
    color: "amber",
    avatarBg: "bg-amber-500",
  },
  {
    name: "David Kim",
    role: "Product Manager",
    avatar: "DK",
    rating: 5,
    quote: "We've used several marketplace platforms, but none come close to the buyer protection here. It's truly built with both sides in mind. Highly recommended!",
    color: "cyan",
    avatarBg: "bg-cyan-500",
  },
];

// ─── Default stats (fallback if API fails) ───
const defaultStats = [
  { key: "totalAuthors", value: 2500, suffix: "+", label: "Active Authors", sublabel: "Verified & active creators", icon: Users, decimals: 0, progress: 0.83 },
  { key: "totalTransactions", value: 15000, suffix: "+", label: "Transactions", sublabel: "Completed successfully", icon: TrendingUp, decimals: 0, progress: 0.91 },
  { key: "platformRevenue", value: 2.4, prefix: "$", suffix: "M+", label: "Platform Revenue", sublabel: "Total paid to creators", icon: Award, decimals: 1, progress: 0.76 },
  { key: "averageRating", value: 4.8, suffix: "/5", label: "Average Rating", sublabel: "Based on all reviews", icon: Star, decimals: 1, progress: 0.96 },
];

// ─── Animated Counter ───
function AnimatedCounter({
  target,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!isInView) return;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return (
    <span ref={ref} className="inline-block">
      {prefix}
      {decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString()}
      {suffix}
    </span>
  );
}

// ─── Progress Ring SVG ───
function ProgressRing({ progress, color, size = 120 }: { progress: number; color: string; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const colorMap: Record<string, string> = {
    emerald: "#10b981",
    violet: "#8b5cf6",
    amber: "#f59e0b",
    cyan: "#06b6d4",
    sky: "#0ea5e9",
    rose: "#f43f5e",
    teal: "#14b8a6",
    primary: "#6366f1",
  };

  return (
    <svg ref={ref} width={size} height={size} className="absolute inset-0 m-auto opacity-20 dark:opacity-10">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-border/50"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={colorMap[color] || colorMap.primary}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={isInView ? offset : circumference}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 2s ease-out" }}
      />
    </svg>
  );
}

// ─── Author type ───
interface AuthorCardData {
  id: string;
  name: string;
  avatarUrl: string | null;
  profile: {
    bio: string | null;
    skills: string[];
    location: string | null;
    isVerified: boolean;
    totalSales: number;
    averageRating: number;
  } | null;
}

// ─── Fade-up on scroll wrapper ───
function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Floating Particles ───
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Large blurred orbs - animated mesh gradient */}
      <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] bg-emerald-500/8 dark:bg-emerald-500/5 rounded-full blur-[100px] animate-float-slow" />
      <div className="absolute top-[20%] right-[5%] w-[400px] h-[400px] bg-violet-500/8 dark:bg-violet-500/5 rounded-full blur-[100px] animate-float-slower" />
      <div className="absolute bottom-[10%] left-[30%] w-[600px] h-[600px] bg-sky-500/6 dark:bg-sky-500/3 rounded-full blur-[120px] animate-float-medium" />
      <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-rose-500/4 dark:bg-rose-500/2 rounded-full blur-[150px] animate-float-slow" />

      {/* Floating geometric shapes */}
      <div className="absolute top-[15%] left-[8%] w-3 h-3 bg-emerald-500/30 rounded-full animate-float-1" />
      <div className="absolute top-[25%] right-[12%] w-2 h-2 bg-violet-500/40 rounded-full animate-float-2" />
      <div className="absolute top-[60%] left-[15%] w-4 h-4 bg-sky-500/20 rotate-45 animate-float-3" />
      <div className="absolute top-[40%] right-[20%] w-2.5 h-2.5 bg-amber-500/30 rounded-full animate-float-4" />
      <div className="absolute bottom-[25%] left-[25%] w-3 h-3 bg-rose-500/25 rounded-full animate-float-5" />
      <div className="absolute top-[70%] right-[8%] w-2 h-2 bg-teal-500/35 animate-float-6" />
      <div className="absolute top-[10%] left-[45%] w-1.5 h-1.5 bg-emerald-500/40 rounded-full animate-float-7" />
      <div className="absolute bottom-[15%] right-[30%] w-3.5 h-3.5 bg-violet-500/20 rotate-12 animate-float-8" />
    </div>
  );
}

// ─── Sparkle Decorations ───
function SparkleDecorations() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="absolute top-[10%] left-[10%] w-6 h-6 text-amber-400/40 animate-twinkle" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41Z" />
      </svg>
      <svg className="absolute top-[30%] right-[15%] w-4 h-4 text-emerald-400/30 animate-twinkle-delayed" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41Z" />
      </svg>
      <svg className="absolute bottom-[20%] left-[20%] w-5 h-5 text-sky-400/30 animate-twinkle-slow" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41Z" />
      </svg>
      <svg className="absolute top-[50%] right-[40%] w-3 h-3 text-rose-400/25 animate-twinkle" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41Z" />
      </svg>
    </div>
  );
}

// ─── Noise Texture Overlay ───
function NoiseTexture() {
  return (
    <div
      className="absolute inset-0 pointer-events-none -z-5 opacity-[0.015] dark:opacity-[0.025]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "128px 128px",
      }}
    />
  );
}

// ─── Back to Top Button ───
function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (!visible) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 size-12 rounded-full bg-card border border-border shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:bg-primary hover:text-primary-foreground"
      aria-label="Back to top"
    >
      <ArrowUp className="size-5" />
    </motion.button>
  );
}

export function LandingPage() {
  const { navigate } = useNavigationStore();
  const { isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState(defaultStats);
  const [authors, setAuthors] = useState<AuthorCardData[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch stats
  useEffect(() => {
    apiGet("/api/public/stats")
      .then((res: unknown) => {
        const data = (res as { data?: Record<string, unknown> }).data;
        if (data) {
          const d = data;
          setStats([
            { key: "totalAuthors", value: (d.totalAuthors as number) || 2500, suffix: "+", label: "Active Authors", sublabel: "Verified & active creators", icon: Users, decimals: 0, progress: 0.83 },
            { key: "totalTransactions", value: (d.totalTransactions as number) || 15000, suffix: "+", label: "Transactions", sublabel: "Completed successfully", icon: TrendingUp, decimals: 0, progress: 0.91 },
            {
              key: "platformRevenue",
              value: (d.platformRevenue as number) >= 1000000 ? (d.platformRevenue as number) / 1000000 : (d.platformRevenue as number) >= 1000 ? (d.platformRevenue as number) / 1000 : (d.platformRevenue as number),
              prefix: (d.platformRevenue as number) >= 1000000 ? "$" : (d.platformRevenue as number) >= 1000 ? "$" : "$",
              suffix: (d.platformRevenue as number) >= 1000000 ? "M+" : (d.platformRevenue as number) >= 1000 ? "K+" : "+",
              decimals: (d.platformRevenue as number) >= 1000 ? 1 : 0,
              label: "Platform Revenue",
              sublabel: "Total paid to creators",
              icon: Award,
              progress: 0.76,
            },
            {
              key: "averageRating",
              value: (d.averageRating as number) || 4.8,
              suffix: "/5",
              decimals: 1,
              label: "Average Rating",
              sublabel: "Based on all reviews",
              icon: Star,
              progress: 0.96,
            },
          ]);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch top authors
  useEffect(() => {
    apiGet("/api/public/authors?limit=10")
      .then((res: unknown) => {
        const data = (res as { data?: AuthorCardData[] }).data;
        if (data && Array.isArray(data) && data.length > 0) {
          setAuthors(data);
        }
      })
      .catch(() => {});
  }, []);

  const scrollCarousel = useCallback((direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const amount = 320;
    carouselRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }, []);

  // Auto-scroll carousel every 3 seconds, pause on hover
  useEffect(() => {
    if (authors.length === 0) return;

    const startAutoScroll = () => {
      autoScrollRef.current = setInterval(() => {
        if (!isCarouselPaused && carouselRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
          if (scrollLeft + clientWidth >= scrollWidth - 10) {
            carouselRef.current.scrollTo({ left: 0, behavior: "smooth" });
          } else {
            carouselRef.current.scrollBy({ left: 320, behavior: "smooth" });
          }
        }
      }, 3000);
    };

    startAutoScroll();
    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [authors.length, isCarouselPaused]);

  return (
    <div className="flex flex-col min-h-screen relative">
      <BackToTopButton />

      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden px-4 md:px-6 pt-16 pb-20 md:pt-28 md:pb-32">
        <FloatingParticles />
        <NoiseTexture />

        {/* Animated mesh gradient background */}
        <div className="absolute inset-0 -z-10 opacity-60 dark:opacity-30">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/80 via-white to-sky-50/80 dark:from-emerald-950/30 dark:via-background dark:to-sky-950/30" />
          <div className="absolute top-0 left-0 w-full h-full animate-gradient-shift bg-gradient-to-tr from-violet-50/50 via-transparent to-amber-50/50 dark:from-violet-950/20 dark:via-transparent dark:to-amber-950/20" style={{ backgroundSize: "200% 200%" }} />
        </div>

        <div className="max-w-[1280px] mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
            >
              {/* Shimmer badge above headline */}
              <div className="mb-6 relative inline-flex">
                <Badge variant="secondary" className="text-sm px-4 py-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 overflow-hidden relative">
                  <Rocket className="size-3.5 mr-1.5" />
                  Trusted by 10,000+ creators
                  <div className="absolute inset-0 animate-shimmer" />
                </Badge>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.05]">
                Welcome to{" "}
                <span className="bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                  Albostech
                </span>{" "}
                <span className="bg-gradient-to-r from-violet-600 to-purple-500 dark:from-violet-400 dark:to-purple-300 bg-clip-text text-transparent">
                  Market
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-10 leading-relaxed">
                Discover enterprise software from Albos Technology — HRMS, Garage Management, and more. Buy with confidence from verified creators.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <Button
                  size="lg"
                  onClick={() => navigate(isAuthenticated ? "dashboard" : "register")}
                  className="text-base px-8 h-12 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Get Started as Buyer
                  <ArrowRight className="ml-2 size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    navigate("register");
                  }}
                  className="text-base px-8 h-12 border-2 border-violet-500/30 text-violet-700 dark:text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Sparkles className="mr-2 size-4" />
                  Become a Seller
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="mt-10 flex items-center gap-4 md:gap-6 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-emerald-500" />
                  <span>SSL Secured</span>
                </div>
                <div className="flex items-center gap-2">
                  <BadgeCheck className="size-4 text-violet-500" />
                  <span>Verified Sellers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Scale className="size-4 text-sky-500" />
                  <span>Buyer Protection</span>
                </div>
              </div>
            </motion.div>

            {/* Right: Abstract gradient illustration with floating animation */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="hidden lg:flex items-center justify-center"
            >
              <div className="relative w-full max-w-md animate-hero-float">
                {/* Animated gradient blob */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-80 h-80 rounded-full bg-gradient-to-br from-emerald-400/20 via-violet-400/20 to-sky-400/20 blur-3xl animate-float-slow" />
                </div>

                {/* Main illustration shape */}
                <div className="relative">
                  <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                    {/* Animated background circles */}
                    <circle cx="200" cy="200" r="180" fill="url(#grad1)" opacity="0.15">
                      <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="60s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="200" cy="200" r="140" fill="url(#grad2)" opacity="0.2">
                      <animateTransform attributeName="transform" type="rotate" from="360 200 200" to="0 200 200" dur="45s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="200" cy="200" r="100" fill="url(#grad3)" opacity="0.25" />

                    {/* Gradient definitions */}
                    <defs>
                      <radialGradient id="grad1" cx="30%" cy="30%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </radialGradient>
                      <radialGradient id="grad2" cx="70%" cy="30%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#0ea5e9" />
                      </radialGradient>
                      <radialGradient id="grad3" cx="50%" cy="70%">
                        <stop offset="0%" stopColor="#0ea5e9" />
                        <stop offset="100%" stopColor="#10b981" />
                      </radialGradient>
                      <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4" />
                      </linearGradient>
                    </defs>

                    {/* Connection lines */}
                    <line x1="120" y1="120" x2="200" y2="200" stroke="url(#lineGrad)" strokeWidth="2" opacity="0.5" />
                    <line x1="280" y1="120" x2="200" y2="200" stroke="url(#lineGrad)" strokeWidth="2" opacity="0.5" />
                    <line x1="200" y1="320" x2="200" y2="200" stroke="url(#lineGrad)" strokeWidth="2" opacity="0.5" />
                    <line x1="120" y1="280" x2="200" y2="200" stroke="url(#lineGrad)" strokeWidth="2" opacity="0.5" />
                    <line x1="280" y1="280" x2="200" y2="200" stroke="url(#lineGrad)" strokeWidth="2" opacity="0.5" />

                    {/* Center node with glow */}
                    <circle cx="200" cy="200" r="32" fill="url(#grad1)" opacity="0.2" />
                    <circle cx="200" cy="200" r="24" fill="url(#grad1)" opacity="0.9" />
                    <circle cx="200" cy="200" r="16" fill="white" opacity="0.9" />

                    {/* Outer nodes with different colors */}
                    <circle cx="120" cy="120" r="18" fill="#10b981" opacity="0.8" />
                    <circle cx="120" cy="120" r="10" fill="white" opacity="0.6" />
                    <circle cx="280" cy="120" r="18" fill="#8b5cf6" opacity="0.8" />
                    <circle cx="280" cy="120" r="10" fill="white" opacity="0.6" />
                    <circle cx="200" cy="320" r="18" fill="#f59e0b" opacity="0.8" />
                    <circle cx="200" cy="320" r="10" fill="white" opacity="0.6" />
                    <circle cx="120" cy="280" r="18" fill="#0ea5e9" opacity="0.7" />
                    <circle cx="120" cy="280" r="10" fill="white" opacity="0.6" />
                    <circle cx="280" cy="280" r="18" fill="#10b981" opacity="0.7" />
                    <circle cx="280" cy="280" r="10" fill="white" opacity="0.6" />

                    {/* Small decorative dots */}
                    <circle cx="80" cy="200" r="5" fill="#8b5cf6" opacity="0.5" />
                    <circle cx="320" cy="200" r="5" fill="#10b981" opacity="0.5" />
                    <circle cx="200" cy="80" r="5" fill="#f59e0b" opacity="0.5" />
                    <circle cx="160" cy="160" r="4" fill="#8b5cf6" opacity="0.4" />
                    <circle cx="240" cy="160" r="4" fill="#10b981" opacity="0.4" />
                    <circle cx="160" cy="240" r="4" fill="#0ea5e9" opacity="0.4" />
                    <circle cx="240" cy="240" r="4" fill="#f59e0b" opacity="0.4" />

                    {/* Floating card shapes */}
                    <rect x="45" y="150" width="56" height="36" rx="8" fill="white" stroke="#10b981" strokeWidth="1.5" opacity="0.7" />
                    <text x="73" y="172" textAnchor="middle" fontSize="10" fill="#10b981" fontWeight="bold" opacity="0.8">$</text>
                    <rect x="300" y="220" width="56" height="36" rx="8" fill="white" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.7" />
                    <text x="328" y="242" textAnchor="middle" fontSize="10" fill="#8b5cf6" fontWeight="bold" opacity="0.8">✓</text>
                    <rect x="155" y="340" width="90" height="32" rx="8" fill="white" stroke="#0ea5e9" strokeWidth="1.5" opacity="0.6" />
                    <text x="200" y="360" textAnchor="middle" fontSize="9" fill="#0ea5e9" fontWeight="600" opacity="0.8">Secure</text>
                  </svg>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Stats Section ─── */}
      <section className="px-4 md:px-6 py-20 md:py-28 relative">
        <NoiseTexture />
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {stats.map((stat, i) => {
              const Icon = stat.icon || TrendingUp;
              return (
                <FadeUp key={stat.key} delay={i * 0.1}>
                  <div className="text-center p-6 md:p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/20 hover:shadow-xl transition-all duration-500 group relative overflow-hidden">
                    {/* Subtle background glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Progress ring behind icon */}
                    <div className="relative inline-flex items-center justify-center mb-4">
                      <ProgressRing progress={stat.progress} color="primary" size={64} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Icon className="size-5 text-primary" />
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <p className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
                        <AnimatedCounter
                          target={stat.value}
                          prefix={stat.prefix || ""}
                          suffix={stat.suffix || ""}
                          decimals={stat.decimals || 0}
                        />
                      </p>
                      <p className="text-sm text-muted-foreground mt-2 font-medium">{stat.label}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">{stat.sublabel}</p>
                    </div>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Trusted By / Partner Logos Section ─── */}
      <section className="px-4 md:px-6 py-12 md:py-16 relative">
        <div className="max-w-[1280px] mx-auto">
          <FadeUp>
            <div className="border-t border-b border-border/50 py-8 md:py-10">
              <div className="flex flex-col items-center gap-6">
                <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
                  Trusted by teams at
                </p>
                <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 md:gap-x-14">
                  {[
                    { name: "Acme Corp", color: "text-emerald-600/60 dark:text-emerald-400/50" },
                    { name: "TechFlow", color: "text-violet-600/60 dark:text-violet-400/50" },
                    { name: "DesignHub", color: "text-sky-600/60 dark:text-sky-400/50" },
                    { name: "CloudBase", color: "text-amber-600/60 dark:text-amber-400/50" },
                    { name: "DataSync", color: "text-rose-600/60 dark:text-rose-400/50" },
                    { name: "NexGen", color: "text-teal-600/60 dark:text-teal-400/50" },
                  ].map((company) => (
                    <span
                      key={company.name}
                      className={`text-lg md:text-xl font-bold tracking-tight ${company.color} transition-opacity hover:opacity-80`}
                    >
                      {company.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ─── Features Grid Section ─── */}
      <section className="px-4 md:px-6 py-20 md:py-28 relative">
        {/* Grid pattern background */}
        <div className="absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <NoiseTexture />

        <div className="max-w-[1280px] mx-auto">
          <FadeUp>
            <div className="text-center mb-14 md:mb-20">
              <Badge variant="secondary" className="mb-4 px-4 py-1.5">Features</Badge>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-5">
                Everything you need in a{" "}
                <span className="bg-gradient-to-r from-emerald-600 to-violet-600 dark:from-emerald-400 dark:to-violet-400 bg-clip-text text-transparent">
                  marketplace
                </span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                Built for creators and buyers who value quality, security, and transparency. Every feature designed to make digital commerce seamless.
              </p>
            </div>
          </FadeUp>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              const colors = featureColorMap[feature.color] || featureColorMap.emerald;
              return (
                <FadeUp key={feature.title} delay={i * 0.08}>
                  <Card className={`h-full transition-all duration-500 border-border/50 group hover:-translate-y-1.5 hover:scale-[1.02] ${colors.border} hover:shadow-xl ${colors.glow}`}>
                    <CardHeader className="pb-3">
                      <div className={`size-14 rounded-2xl ${colors.bg} ring-1 ${colors.ring} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`size-7 ${colors.icon}`} />
                      </div>
                      <CardTitle className="text-lg font-bold">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                        {feature.description}
                      </CardDescription>
                      {/* Detail text on hover */}
                      <p className="text-xs mt-3 text-muted-foreground/0 group-hover:text-muted-foreground/70 transition-all duration-500 leading-relaxed">
                        {feature.detail}
                      </p>
                    </CardContent>
                  </Card>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── NEW Testimonials Section (between Features and Authors) ─── */}
      <section className="px-4 md:px-6 py-20 md:py-28 relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-violet-500/[0.02] to-transparent dark:via-violet-500/[0.03]" />
        <NoiseTexture />

        <div className="max-w-[1280px] mx-auto">
          <FadeUp>
            <div className="text-center mb-14 md:mb-20">
              <Badge variant="secondary" className="mb-4 px-4 py-1.5">Testimonials</Badge>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-5">
                Loved by{" "}
                <span className="bg-gradient-to-r from-amber-600 to-rose-600 dark:from-amber-400 dark:to-rose-400 bg-clip-text text-transparent">
                  thousands
                </span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                Don&apos;t just take our word for it. Here&apos;s what our community has to say about their experience on the platform.
              </p>
            </div>
          </FadeUp>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {testimonials.map((testimonial, i) => {
              const colorStyles = featureColorMap[testimonial.color] || featureColorMap.emerald;
              return (
                <FadeUp key={testimonial.name} delay={i * 0.1}>
                  <div
                    className="h-full rounded-2xl border border-border/50 bg-card p-6 transition-all duration-500 hover:shadow-xl hover:-translate-y-1.5 group cursor-default"
                    style={{
                      transform: i % 2 === 0 ? "rotate(-0.5deg)" : "rotate(0.5deg)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = i % 2 === 0 ? "rotate(0deg) scale(1.02)" : "rotate(0deg) scale(1.02)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = i % 2 === 0 ? "rotate(-0.5deg)" : "rotate(0.5deg)";
                    }}
                  >
                    {/* Quote icon */}
                    <Quote className={`size-8 ${colorStyles.icon} opacity-30 mb-4`} />

                    {/* Quote text */}
                    <p className="text-sm italic leading-relaxed text-muted-foreground mb-6">
                      &ldquo;{testimonial.quote}&rdquo;
                    </p>

                    {/* Star rating */}
                    <div className="flex items-center gap-0.5 mb-4">
                      {Array.from({ length: 5 }).map((_, si) => (
                        <Star
                          key={si}
                          className={`size-4 ${
                            si < testimonial.rating
                              ? "text-amber-500 fill-amber-500"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Author */}
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10 ring-2 ring-border/50 group-hover:ring-primary/20 transition-all duration-300">
                        <AvatarFallback className={`${testimonial.avatarBg} text-white font-bold text-sm`}>
                          {testimonial.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold">{testimonial.name}</p>
                        <Badge variant="secondary" className="text-xs px-2 py-0.5 mt-0.5">
                          {testimonial.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── How It Works Section ─── */}
      <section className="px-4 md:px-6 py-20 md:py-28 relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-emerald-500/[0.02] to-transparent dark:via-emerald-500/[0.03]" />

        <div className="max-w-[1280px] mx-auto">
          <FadeUp>
            <div className="text-center mb-14 md:mb-20">
              <Badge variant="secondary" className="mb-4 px-4 py-1.5">How It Works</Badge>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-5">
                Simple as{" "}
                <span className="bg-gradient-to-r from-emerald-600 to-sky-600 dark:from-emerald-400 dark:to-sky-400 bg-clip-text text-transparent">
                  1, 2, 3
                </span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                Get started in minutes. Our streamlined process makes it easy to find, hire, and collaborate with top digital creators.
              </p>
            </div>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-8 md:gap-6 relative">
            {/* Connecting dashed line (desktop only) */}
            <div className="hidden md:block absolute top-24 left-[20%] right-[20%] h-0.5 border-t-2 border-dashed border-emerald-500/20 dark:border-emerald-500/15" />

            {[
              {
                step: 1,
                icon: Search,
                title: "Browse Creators",
                description: "Explore our curated marketplace of verified digital creators. Filter by skills, ratings, and specialties to find your perfect match.",
                gradient: "from-emerald-500 to-teal-500",
                bgGlow: "bg-emerald-500/5",
              },
              {
                step: 2,
                icon: CreditCard,
                title: "Hire & Pay Securely",
                description: "Book services and make payments through our secure escrow system. Your funds are protected until the work is delivered to your satisfaction.",
                gradient: "from-violet-500 to-purple-500",
                bgGlow: "bg-violet-500/5",
              },
              {
                step: 3,
                icon: ClipboardCheck,
                title: "Receive & Review",
                description: "Get your deliverables, review the work, and leave feedback. Our dispute resolution ensures you're always covered if something goes wrong.",
                gradient: "from-sky-500 to-cyan-500",
                bgGlow: "bg-sky-500/5",
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <FadeUp key={item.step} delay={i * 0.15}>
                  <div className="relative text-center group">
                    {/* Background glow */}
                    <div className={`absolute inset-0 rounded-3xl ${item.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                    <div className="relative p-6 md:p-8">
                      {/* Step number circle */}
                      <div className="relative mx-auto mb-6">
                        <div className={`size-20 rounded-full bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <span className="text-2xl font-extrabold text-white">{item.step}</span>
                        </div>
                        {/* Icon badge */}
                        <div className="absolute -bottom-1 -right-1 size-10 rounded-full bg-card border-2 border-border shadow-md flex items-center justify-center">
                          <Icon className="size-5 text-muted-foreground" />
                        </div>
                      </div>

                      <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                        {item.description}
                      </p>

                      {/* Arrow for mobile (vertical) */}
                      {i < 2 && (
                        <div className="md:hidden flex justify-center my-4">
                          <ArrowDownRight className="size-5 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Top Authors Carousel ─── */}
      {authors.length > 0 && (
        <section className="py-20 md:py-28 relative">
          <div className="max-w-[1280px] mx-auto px-4 md:px-6">
            <FadeUp>
              <div className="flex items-end justify-between mb-10 md:mb-14">
                <div>
                  <Badge variant="secondary" className="mb-4 px-4 py-1.5">Top Creators</Badge>
                  <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3">
                    Meet our{" "}
                    <span className="bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
                      top sellers
                    </span>
                  </h2>
                  <p className="text-muted-foreground text-lg">
                    Trusted creators delivering exceptional digital products.
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => scrollCarousel("left")}
                    className="size-11 rounded-full hover:bg-primary/10"
                  >
                    <ChevronLeft className="size-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => scrollCarousel("right")}
                    className="size-11 rounded-full hover:bg-primary/10"
                  >
                    <ChevronRight className="size-5" />
                  </Button>
                </div>
              </div>
            </FadeUp>
          </div>

          {/* Carousel with gradient overlays */}
          <div className="relative">
            {/* Left gradient overlay */}
            <div className="absolute left-0 top-0 bottom-4 w-8 md:w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            {/* Right gradient overlay */}
            <div className="absolute right-0 top-0 bottom-4 w-8 md:w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

            <div
              ref={carouselRef}
              className="flex gap-5 overflow-x-auto pb-4 px-4 md:px-6 custom-scroll snap-x snap-mandatory scroll-smooth"
              onMouseEnter={() => setIsCarouselPaused(true)}
              onMouseLeave={() => setIsCarouselPaused(false)}
            >
              {authors.map((author, i) => (
                <FadeUp key={author.id} delay={i * 0.06}>
                  <Card className="min-w-[280px] max-w-[280px] shrink-0 snap-start hover:shadow-xl transition-all duration-500 hover:-translate-y-1.5 group relative">
                    <CardContent className="pt-6">
                      {/* Featured badge on first card */}
                      {i === 0 && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs px-3 py-1 shadow-lg border-0">
                            <Award className="size-3 mr-1" />
                            Featured
                          </Badge>
                        </div>
                      )}

                      {/* Top Rated label for 4.5+ rating */}
                      {(author.profile?.averageRating ?? 0) >= 4.5 && (
                        <div className="absolute -top-3 right-4 z-10">
                          <Badge className="bg-emerald-500/90 text-white text-xs px-2 py-0.5 shadow-md border-0">
                            <Star className="size-3 mr-0.5 fill-white" />
                            Top Rated
                          </Badge>
                        </div>
                      )}

                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="size-14 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all duration-300">
                          <AvatarImage src={author.avatarUrl || undefined} alt={author.name} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                            {author.name?.charAt(0)?.toUpperCase() || "A"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate flex items-center gap-1.5">
                            {author.name}
                            {author.profile?.isVerified && (
                              <span className="inline-flex items-center justify-center size-5 rounded-full bg-violet-500/15 ring-1 ring-violet-500/30">
                                <BadgeCheck className="size-3.5 text-violet-600 dark:text-violet-400" />
                              </span>
                            )}
                          </p>
                          {author.profile?.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                              <MapPin className="size-3 shrink-0" />
                              {author.profile.location}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Skills */}
                      {author.profile?.skills && author.profile.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {author.profile.skills.slice(0, 3).map((skill: string) => (
                            <Badge key={skill} variant="secondary" className="text-xs px-2.5 py-0.5 font-medium">
                              {skill}
                            </Badge>
                          ))}
                          {author.profile.skills.length > 3 && (
                            <Badge variant="secondary" className="text-xs px-2.5 py-0.5">
                              +{author.profile.skills.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Stats row */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-5">
                        <span className="flex items-center gap-1 font-medium">
                          <Star className="size-3.5 text-amber-500 fill-amber-500" />
                          {author.profile?.averageRating?.toFixed(1) || "0.0"}
                        </span>
                        <span className="font-medium">{author.profile?.totalSales || 0} sales</span>
                      </div>

                      <Button
                        size="sm"
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white shadow-sm hover:shadow-md transition-all duration-300"
                        onClick={() => navigate("profile", { userId: author.id })}
                      >
                        View Profile
                        <ArrowRight className="ml-1.5 size-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Extended Testimonials / Reviews Section ─── */}
      <section className="px-4 md:px-6 py-20 md:py-28 relative">
        <div className="absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="max-w-[1280px] mx-auto">
          <FadeUp>
            <div className="text-center mb-14 md:mb-20">
              <Badge variant="secondary" className="mb-4 px-4 py-1.5">More Reviews</Badge>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-5">
                What our{" "}
                <span className="bg-gradient-to-r from-sky-600 to-emerald-600 dark:from-sky-400 dark:to-emerald-400 bg-clip-text text-transparent">
                  community
                </span>{" "}
                says
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                Real stories from real people who use our platform every day.
              </p>
            </div>
          </FadeUp>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "Sarah Chen",
                role: "UX Designer at TechFlow",
                avatar: "SC",
                rating: 5,
                quote: "This platform transformed how I sell my design templates. The escrow system gives me peace of mind, and I've tripled my client base in just three months!",
                color: "emerald",
              },
              {
                name: "Marcus Johnson",
                role: "CTO at DataSync",
                avatar: "MJ",
                rating: 5,
                quote: "Albostech Market made it easy to evaluate and purchase our HRMS. Albos Technology's verification and documentation gave us confidence before checkout.",
                color: "violet",
              },
              {
                name: "Elena Rodriguez",
                role: "Freelance Illustrator",
                avatar: "ER",
                rating: 5,
                quote: "The analytics dashboard is a game-changer. I can see exactly what's selling, track my earnings, and plan my content strategy accordingly. Best platform for creators!",
                color: "sky",
              },
              {
                name: "David Kim",
                role: "Product Manager at NexGen",
                avatar: "DK",
                rating: 4,
                quote: "We've used several marketplace platforms, but none come close to the buyer protection and dispute resolution here. It's truly built with both sides in mind.",
                color: "amber",
              },
              {
                name: "Amara Obi",
                role: "Full-Stack Developer",
                avatar: "AO",
                rating: 5,
                quote: "Fair commissions and instant payouts — finally a platform that values creators. I switched from competitors and haven't looked back. The community here is incredible.",
                color: "rose",
              },
              {
                name: "James Wright",
                role: "Creative Director at DesignHub",
                avatar: "JW",
                rating: 5,
                quote: "The quality of verified sellers on this platform is unmatched. We've found amazing talent for our projects every time. The process is smooth from start to finish.",
                color: "teal",
              },
            ].map((testimonial, i) => {
              const colorStyles = featureColorMap[testimonial.color] || featureColorMap.emerald;
              return (
                <FadeUp key={testimonial.name} delay={i * 0.08}>
                  <Card className="h-full hover:shadow-xl transition-all duration-500 border-border/50 group hover:-translate-y-1.5 hover:border-primary/20">
                    <CardContent className="pt-6 p-6">
                      {/* Quote icon */}
                      <Quote className={`size-8 ${colorStyles.icon} opacity-30 mb-4`} />

                      {/* Quote text */}
                      <p className="text-sm leading-relaxed text-muted-foreground mb-6">
                        &ldquo;{testimonial.quote}&rdquo;
                      </p>

                      {/* Star rating */}
                      <div className="flex items-center gap-0.5 mb-4">
                        {Array.from({ length: 5 }).map((_, si) => (
                          <Star
                            key={si}
                            className={`size-4 ${
                              si < testimonial.rating
                                ? "text-amber-500 fill-amber-500"
                                : "text-muted-foreground/30"
                            }`
                            }
                          />
                        ))}
                      </div>

                      {/* Author */}
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10 ring-2 ring-border/50 group-hover:ring-primary/20 transition-all duration-300">
                          <AvatarFallback className={`${colorStyles.bg} ${colorStyles.icon} font-bold text-sm`}>
                            {testimonial.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold">{testimonial.name}</p>
                          <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="px-4 md:px-6 py-20 md:py-28 relative">
        <div className="max-w-[1280px] mx-auto">
          <FadeUp>
            <div className="relative rounded-3xl overflow-hidden p-10 md:p-20 text-center bg-gradient-to-br from-violet-600/10 via-emerald-600/5 to-sky-600/10 dark:from-violet-600/15 dark:via-emerald-600/8 dark:to-sky-600/15 border border-primary/10">
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 -z-10">
                <div className="absolute inset-0 animate-gradient-shift bg-gradient-to-tr from-emerald-500/5 via-transparent to-violet-500/5" style={{ backgroundSize: "200% 200%" }} />
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/3 rounded-full blur-3xl" />
              </div>

              <SparkleDecorations />
              <NoiseTexture />

              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-5 relative">
                Ready to{" "}
                <span className="bg-gradient-to-r from-emerald-600 to-violet-600 dark:from-emerald-400 dark:to-violet-400 bg-clip-text text-transparent">
                  get started
                </span>
                ?
              </h2>
              <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto relative leading-relaxed">
                Join thousands of creators and buyers already building and buying on the platform. Start your journey today.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap relative">
                <Button
                  size="lg"
                  onClick={() => navigate(isAuthenticated ? "dashboard" : "register")}
                  className="text-base px-10 h-13 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] animate-pulse-glow"
                >
                  Join Now
                  <ArrowRight className="ml-2 size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate("browse-projects")}
                  className="text-base px-10 h-13 border-2 hover:bg-primary/5 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] animate-pulse-glow-violet"
                >
                  Browse Projects
                </Button>
              </div>

              {/* Trust badges below buttons */}
              <div className="mt-10 flex items-center justify-center gap-6 md:gap-8 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-2">
                  <Lock className="size-4 text-emerald-500" />
                  <span>Secure Payments</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="size-4 text-amber-500 fill-amber-500" />
                  <span>4.9/5 Rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-violet-500" />
                  <span>Money-Back Guarantee</span>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
