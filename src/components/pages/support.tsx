"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  LifeBuoy,
  Send,
  Search,
  X,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Headphones,
  Mail,
  BookOpen,
  Users,
  CreditCard,
  ArrowLeftRight,
  Shield,
  Wrench,
  Rocket,
  User,
  Filter,
  Inbox,
  Eye,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuthStore } from "@/store/auth";
import { useNavigationStore } from "@/store/navigation";
import { apiGet, apiPost } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// ---- Types ----
interface SupportTicket {
  id: string;
  subject: string;
  priority: string;
  status: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

interface TicketsResponse {
  data: SupportTicket[];
  total: number;
  page: number;
  limit: number;
}

// ---- FAQ Data ----
interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQS: FAQ[] = [
  {
    id: "gs-1",
    question: "How do I create an account?",
    answer:
      "Click the 'Get Started' button on our homepage. You can sign up as a Buyer to browse and purchase services, or as an Author to sell your digital products. Fill in your name, email, and password, then verify your email to activate your account.",
    category: "getting-started",
  },
  {
    id: "gs-2",
    question: "How to verify my email?",
    answer:
      "After registration, you'll receive a verification email within a few minutes. Click the verification link to activate your account. If you don't see it, check your spam folder.",
    category: "getting-started",
  },
  {
    id: "acc-1",
    question: "How to update my profile?",
    answer:
      "Go to Settings in your dashboard. You can update your name, avatar, bio, location, and skills. Your profile updates are reflected immediately for other users.",
    category: "account",
  },
  {
    id: "acc-2",
    question: "How do I reset my password?",
    answer:
      "Click 'Forgot Password' on the login page and enter your registered email. You'll receive a password reset link valid for 1 hour. For security, we recommend using a strong, unique password.",
    category: "account",
  },
  {
    id: "pay-1",
    question: "How do payouts work?",
    answer:
      "When a buyer purchases your product or service, the payment is held in escrow until the transaction is completed. Once confirmed, the funds (minus our commission) are added to your available balance.",
    category: "payments",
  },
  {
    id: "pay-2",
    question: "What are the commission rates?",
    answer:
      "Our standard commission rate is 10% of each transaction. This covers payment processing, platform maintenance, and security features.",
    category: "payments",
  },
  {
    id: "tx-1",
    question: "How to contact a seller?",
    answer:
      "You can contact a seller through our built-in messaging system. Visit their profile page and click the 'Message' button. All communications are tracked for your safety.",
    category: "transactions",
  },
  {
    id: "tx-2",
    question: "How do I track my orders?",
    answer:
      "Go to the 'Order Tracking' section in your dashboard. You'll see all your active and past orders with their current status.",
    category: "transactions",
  },
  {
    id: "disp-1",
    question: "How to open a dispute?",
    answer:
      "If you have an issue with a transaction, go to the transaction detail page and click 'Open Dispute'. Provide a clear reason and any supporting evidence. Our team reviews all disputes within 48 hours.",
    category: "disputes",
  },
  {
    id: "disp-2",
    question: "How long does a dispute resolution take?",
    answer:
      "Most disputes are resolved within 3-5 business days. Complex cases may take longer. You'll receive updates via email and notifications.",
    category: "disputes",
  },
  {
    id: "tech-1",
    question: "The site isn't loading properly. What should I do?",
    answer:
      "First, try clearing your browser cache and cookies, then reload the page. If the issue persists, try a different browser or device.",
    category: "technical",
  },
];

// ---- Category Config ----
const CATEGORIES = [
  { id: "getting-started", label: "Getting Started", icon: Rocket, textColor: "text-cyan-600 dark:text-cyan-400" },
  { id: "account", label: "Account & Profile", icon: User, textColor: "text-emerald-600 dark:text-emerald-400" },
  { id: "payments", label: "Payments & Billing", icon: CreditCard, textColor: "text-amber-600 dark:text-amber-400" },
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight, textColor: "text-violet-600 dark:text-violet-400" },
  { id: "disputes", label: "Disputes & Refunds", icon: Shield, textColor: "text-red-600 dark:text-red-400" },
  { id: "technical", label: "Technical Support", icon: Wrench, textColor: "text-sky-600 dark:text-sky-400" },
];

// ---- Status & Priority Config ----
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: "Open", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400", icon: Loader2 },
  resolved: { label: "Resolved", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400", icon: CheckCircle2 },
  closed: { label: "Closed", color: "bg-muted text-muted-foreground", icon: AlertCircle },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" },
  high: { label: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400" },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
};

// ---- Time Ago ----
function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ---- Skeletons ----
function TicketsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Skeleton className="size-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---- Contact Form ----
function ContactForm() {
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("medium");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const maxChars = 500;
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSending(true);
    try {
      await apiPost("/api/support/tickets", {
        subject,
        priority,
        message: message.trim(),
      });
      toast.success("Support ticket submitted! We'll get back to you within 24 hours.");
      setSubject("");
      setPriority("medium");
      setMessage("");
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit ticket. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Ticket Submitted!</h3>
        <p className="text-muted-foreground text-sm mb-4">
          We&apos;ll respond to your inquiry within 24 hours.
        </p>
        <Button variant="outline" onClick={() => setSubmitted(false)}>
          Submit Another Ticket
        </Button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="support-subject">Subject</Label>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger id="support-subject">
            <SelectValue placeholder="Select a subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General Inquiry</SelectItem>
            <SelectItem value="bug">Bug Report</SelectItem>
            <SelectItem value="feature">Feature Request</SelectItem>
            <SelectItem value="payment">Payment Issue</SelectItem>
            <SelectItem value="account">Account Issue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Priority</Label>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "low", label: "Low", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
            { value: "medium", label: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" },
            { value: "high", label: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400" },
            { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
          ].map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                priority === p.value
                  ? `${p.color} border-current`
                  : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="support-message">Message</Label>
          <span className={cn(
            "text-xs",
            message.length > maxChars * 0.9 ? "text-red-500" : "text-muted-foreground"
          )}>
            {message.length}/{maxChars}
          </span>
        </div>
        <Textarea
          id="support-message"
          placeholder="Describe your issue in detail..."
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, maxChars))}
          rows={5}
          className="resize-none"
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        disabled={sending || !subject || !message.trim()}
      >
        {sending ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="size-4 mr-2" />
            Submit Ticket
          </>
        )}
      </Button>
    </form>
  );
}

// ---- Ticket Card ----
function TicketCard({
  ticket,
  isSelected,
  onClick,
}: {
  ticket: SupportTicket;
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const priorityConfig = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          isSelected && "ring-2 ring-emerald-500 dark:ring-emerald-400"
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "size-10 rounded-lg flex items-center justify-center shrink-0",
              statusConfig.color
            )}>
              <StatusIcon className={cn("size-5", ticket.status === "in_progress" && "animate-spin")} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold truncate">{ticket.subject}</h3>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {ticket.message}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className={cn("text-[10px]", statusConfig.color)}>
                  {statusConfig.label}
                </Badge>
                <Badge variant="secondary" className={cn("text-[10px]", priorityConfig.color)}>
                  {priorityConfig.label}
                </Badge>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3" />
                  {timeAgo(ticket.createdAt)}
                </span>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground shrink-0 mt-1" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---- Ticket Detail View ----
function TicketDetail({
  ticket,
  onBack,
}: {
  ticket: SupportTicket;
  onBack: () => void;
}) {
  const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
  const priorityConfig = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium;
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="space-y-4">
        {/* Back button */}
        <Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
          <ChevronLeft className="size-4 mr-1" />
          Back to Tickets
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "size-12 rounded-lg flex items-center justify-center shrink-0",
                  statusConfig.color
                )}>
                  <StatusIcon className={cn("size-6", ticket.status === "in_progress" && "animate-spin")} />
                </div>
                <div>
                  <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge className={cn("text-[10px]", statusConfig.color)}>
                      {statusConfig.label}
                    </Badge>
                    <Badge className={cn("text-[10px]", priorityConfig.color)}>
                      {priorityConfig.label} Priority
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Separator />
            <div>
              <h4 className="text-sm font-semibold mb-2">Original Message</h4>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm whitespace-pre-line">{ticket.message}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Created</span>
                <p className="font-medium">{new Date(ticket.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Updated</span>
                <p className="font-medium">{new Date(ticket.updatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Ticket ID</span>
                <p className="font-medium font-mono text-xs">{ticket.id}</p>
              </div>
            </div>

            {(ticket.status === "resolved" || ticket.status === "closed") && (
              <>
                <Separator />
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      {ticket.status === "resolved" ? "Resolved" : "Closed"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This ticket has been {ticket.status}. If you need further assistance, please submit a new ticket.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

// ---- Main Support Page ----
export function SupportPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { navigate } = useNavigationStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("faq");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch tickets
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ["support-tickets", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", limit: "50" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const json = await apiGet(`/api/support/tickets?${params.toString()}`);
      return (json.data ?? json) as TicketsResponse;
    },
    enabled: isAuthenticated && !!user,
  });

  const tickets = ticketsData?.data || [];
  const totalTickets = ticketsData?.total || 0;

  // Find selected ticket
  const selectedTicket = selectedTicketId
    ? tickets.find((t) => t.id === selectedTicketId) || null
    : null;

  // Filter FAQs by search
  const filteredFAQs = useMemo(() => {
    if (!searchQuery.trim()) return FAQS;
    const q = searchQuery.toLowerCase();
    return FAQS.filter(
      (faq) =>
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Group FAQs by category
  const groupedFAQs = useMemo(() => {
    const groups: Record<string, FAQ[]> = {};
    for (const faq of filteredFAQs) {
      if (!groups[faq.category]) groups[faq.category] = [];
      groups[faq.category].push(faq);
    }
    return groups;
  }, [filteredFAQs]);

  return (
    <div className="py-2">
      {/* Gradient Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-6 md:p-8 text-white mb-8"
      >
        <div className="absolute -top-8 -right-8 size-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-4 -left-4 size-24 rounded-full bg-white/10 blur-xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
              <LifeBuoy className="size-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Support Center
              </h1>
              <p className="text-white/80 mt-1 text-sm">
                Find answers, submit tickets, or reach out to our team
              </p>
            </div>
          </div>
          {isAuthenticated && (
            <div className="flex items-center gap-3">
              <div className="bg-white/15 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2">
                <Inbox className="size-4 text-white" />
                <span className="text-white font-semibold text-lg">{totalTickets}</span>
                <span className="text-white/80 text-sm">tickets</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto mb-6">
          <TabsTrigger value="faq" className="gap-1.5">
            <HelpCircle className="size-3.5" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-1.5">
            <MessageSquare className="size-3.5" />
            Contact Us
          </TabsTrigger>
          {isAuthenticated && (
            <TabsTrigger value="tickets" className="gap-1.5">
              <Inbox className="size-3.5" />
              My Tickets
              {totalTickets > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                  {totalTickets}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* FAQ Tab */}
        <TabsContent value="faq">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Search */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <Input
                placeholder="Search frequently asked questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 text-base rounded-xl"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-8"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>

            {/* Quick category cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const count = FAQS.filter((f) => f.category === cat.id).length;
                return (
                  <Card key={cat.id} className="hover:shadow-md transition-all cursor-pointer"
                    onClick={() => {
                      setSearchQuery("");
                      const el = document.getElementById(`faq-cat-${cat.id}`);
                      el?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-muted flex items-center justify-center">
                        <Icon className={cn("size-4", cat.textColor)} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{cat.label}</p>
                        <p className="text-xs text-muted-foreground">{count} articles</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* FAQ Accordion Groups */}
            {filteredFAQs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="size-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No results found for &ldquo;{searchQuery}&rdquo;
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try different keywords or browse by category
                  </p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(groupedFAQs).map(([categoryId, faqs]) => {
                const category = CATEGORIES.find((c) => c.id === categoryId);
                if (!category) return null;
                const CategoryIcon = category.icon;

                return (
                  <div key={categoryId} id={`faq-cat-${categoryId}`} className="scroll-mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CategoryIcon className={cn("size-5", category.textColor)} />
                      <h3 className="text-base font-semibold">{category.label}</h3>
                      <Badge variant="secondary" className="text-xs">{faqs.length}</Badge>
                    </div>
                    <Card>
                      <Accordion type="single" collapsible className="w-full">
                        {faqs.map((faq, index) => (
                          <AccordionItem
                            key={faq.id}
                            value={faq.id}
                            className={index === faqs.length - 1 ? "border-b-0" : ""}
                          >
                            <AccordionTrigger className="text-sm text-left hover:no-underline hover:text-emerald-600 dark:hover:text-emerald-400 px-4 py-3">
                              {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-sm text-muted-foreground px-4 pb-4 leading-relaxed">
                              {faq.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </Card>
                  </div>
                );
              })
            )}

            {/* CTA to contact */}
            {isAuthenticated && (
              <Card className="border-emerald-200/50 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-50/80 to-teal-50/80 dark:from-emerald-500/5 dark:to-teal-500/5">
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center size-12 rounded-full bg-emerald-500/10 mb-4">
                    <Headphones className="size-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Can&apos;t find your answer?</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                    Submit a support ticket and our team will get back to you within 24 hours.
                  </p>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setActiveTab("contact")}
                  >
                    <MessageSquare className="size-4 mr-2" />
                    Contact Support
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid lg:grid-cols-[1fr_1fr] gap-8">
              {/* Contact Form */}
              <Card className="border-emerald-200/50 dark:border-emerald-500/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                      <Headphones className="size-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Submit a Ticket</CardTitle>
                      <CardDescription>
                        We&apos;ll respond within 24 hours
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isAuthenticated ? (
                    <ContactForm />
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground text-sm mb-4">
                        Please log in to submit a support ticket.
                      </p>
                      <Button onClick={() => navigate("login")} className="bg-emerald-600 hover:bg-emerald-700">
                        Log In
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Alternative Contact */}
              <div className="space-y-4">
                <Card className="border-emerald-200/50 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-50/80 to-teal-50/80 dark:from-emerald-500/5 dark:to-teal-500/5">
                  <CardContent className="p-6 text-center">
                    <div className="inline-flex items-center justify-center size-12 rounded-full bg-emerald-500/10 mb-4">
                      <Sparkles className="size-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">Need Quick Help?</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                      Check our FAQ section for instant answers to common questions.
                    </p>
                    <Button variant="outline" onClick={() => setActiveTab("faq")}>
                      <HelpCircle className="size-4 mr-2" />
                      Browse FAQ
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-semibold text-sm">Other Ways to Reach Us</h4>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                        <Mail className="size-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Email Support</p>
                        <p className="text-xs text-muted-foreground">support@marketplace.com</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                        <BookOpen className="size-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Knowledge Base</p>
                        <p className="text-xs text-muted-foreground">50+ articles and guides</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="size-9 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                        <Users className="size-4 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Community Forum</p>
                        <p className="text-xs text-muted-foreground">Connect with 10K+ members</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* My Tickets Tab */}
        {isAuthenticated && (
          <TabsContent value="tickets">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {selectedTicket ? (
                <TicketDetail
                  ticket={selectedTicket}
                  onBack={() => setSelectedTicketId(null)}
                />
              ) : (
                <>
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Filter className="size-4" />
                      <span>Filter by status:</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { value: "all", label: "All" },
                        { value: "open", label: "Open" },
                        { value: "in_progress", label: "In Progress" },
                        { value: "resolved", label: "Resolved" },
                        { value: "closed", label: "Closed" },
                      ].map((f) => (
                        <Button
                          key={f.value}
                          variant={statusFilter === f.value ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "text-xs",
                            statusFilter === f.value && "bg-emerald-600 hover:bg-emerald-700"
                          )}
                          onClick={() => setStatusFilter(f.value)}
                        >
                          {f.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Tickets list */}
                  {ticketsLoading ? (
                    <TicketsSkeleton />
                  ) : tickets.length === 0 ? (
                    <EmptyState
                      icon={<Inbox />}
                      title={statusFilter !== "all" ? "No matching tickets" : "No support tickets yet"}
                      description={
                        statusFilter !== "all"
                          ? "Try changing the filter or submit a new ticket"
                          : "Submit a ticket if you need help with anything"
                      }
                      action={{
                        label: "Submit a Ticket",
                        onClick: () => setActiveTab("contact"),
                      }}
                    />
                  ) : (
                    <div className="space-y-3">
                      <AnimatePresence mode="popLayout">
                        {tickets.map((ticket) => (
                          <TicketCard
                            key={ticket.id}
                            ticket={ticket}
                            isSelected={selectedTicketId === ticket.id}
                            onClick={() => setSelectedTicketId(ticket.id)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
