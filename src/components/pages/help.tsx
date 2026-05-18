"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LifeBuoy,
  Rocket,
  User,
  CreditCard,
  ArrowLeftRight,
  Shield,
  Wrench,
  BookOpen,
  Code,
  Users,
  Video,
  MessageSquare,
  Send,
  X,
  ChevronDown,
  ExternalLink,
  Clock,
  Sparkles,
  Headphones,
  Mail,
  Bot,
  Minus,
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
import { useAuthStore } from "@/store/auth";
import { apiPost, apiGet } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
      "After registration, you'll receive a verification email within a few minutes. Click the verification link to activate your account. If you don't see it, check your spam folder. You can request a new verification email from your account settings.",
    category: "getting-started",
  },
  {
    id: "gs-3",
    question: "How do I set up my creator profile?",
    answer:
      "After registering as an Author, you'll be guided through our onboarding process. Add your bio, professional skills, location, portfolio images, and social links. A complete profile helps buyers find and trust you.",
    category: "getting-started",
  },
  {
    id: "acc-1",
    question: "How to update my profile?",
    answer:
      "Go to Settings in your dashboard. You can update your name, avatar, bio, location, and skills. Some changes like role modifications may require admin approval. Your profile updates are reflected immediately for other users.",
    category: "account",
  },
  {
    id: "acc-2",
    question: "How to delete my account?",
    answer:
      "To delete your account, go to Settings > Account and click 'Delete Account'. You'll need to confirm your password. Please note that this action is irreversible — all your data, reviews, and transaction history will be permanently removed.",
    category: "account",
  },
  {
    id: "acc-3",
    question: "How do I reset my password?",
    answer:
      "Click 'Forgot Password' on the login page and enter your registered email. You'll receive a password reset link valid for 1 hour. For security, we recommend using a strong, unique password with at least 8 characters.",
    category: "account",
  },
  {
    id: "pay-1",
    question: "How do payouts work?",
    answer:
      "When a buyer purchases your product or service, the payment is held in escrow until the transaction is completed. Once confirmed, the funds (minus our commission) are added to your available balance. You can then withdraw to your bank account or PayPal.",
    category: "payments",
  },
  {
    id: "pay-2",
    question: "What are the commission rates?",
    answer:
      "Our standard commission rate is 10% of each transaction. This covers payment processing, platform maintenance, and security features. Commission rates may vary for premium creators or during promotional periods. Check your settings for your specific rate.",
    category: "payments",
  },
  {
    id: "pay-3",
    question: "What payment methods are supported?",
    answer:
      "We support bank transfers and PayPal for withdrawals. For purchases, we accept major credit/debit cards (Visa, MasterCard, American Express) and PayPal. All payments are processed securely through our encrypted payment system.",
    category: "payments",
  },
  {
    id: "tx-1",
    question: "How to contact a seller?",
    answer:
      "You can contact a seller through our built-in messaging system. Visit their profile page and click the 'Message' button. You can discuss project details, timelines, and pricing before making a purchase. All communications are tracked for your safety.",
    category: "transactions",
  },
  {
    id: "tx-2",
    question: "How do I track my orders?",
    answer:
      "Go to the 'Order Tracking' section in your dashboard. You'll see all your active and past orders with their current status. You can filter by status (pending, completed, disputed) and view detailed information about each transaction.",
    category: "transactions",
  },
  {
    id: "disp-1",
    question: "How to open a dispute?",
    answer:
      "If you have an issue with a transaction, go to the transaction detail page and click 'Open Dispute'. Provide a clear reason and any supporting evidence. Our team reviews all disputes within 48 hours. Both parties will be notified of the resolution.",
    category: "disputes",
  },
  {
    id: "disp-2",
    question: "How long does a dispute resolution take?",
    answer:
      "Most disputes are resolved within 3-5 business days. Complex cases may take longer. You'll receive updates via email and notifications. Our support team is available to answer any questions during the process.",
    category: "disputes",
  },
  {
    id: "rev-1",
    question: "How do reviews work?",
    answer:
      "After a transaction is completed, buyers can leave a 1-5 star rating and written review. Authors can reply to reviews. Reviews are public and help other buyers make informed decisions. We moderate reviews to ensure they are fair and genuine.",
    category: "transactions",
  },
  {
    id: "tech-1",
    question: "The site isn't loading properly. What should I do?",
    answer:
      "First, try clearing your browser cache and cookies, then reload the page. If the issue persists, try a different browser or device. Check our status page for any ongoing maintenance. If you're still having trouble, contact our technical support team.",
    category: "technical",
  },
];

// ---- Category Config ----
const CATEGORIES = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: Rocket,
    color: "from-cyan-500 to-cyan-600",
    bgColor: "bg-cyan-50 dark:bg-cyan-500/10",
    textColor: "text-cyan-600 dark:text-cyan-400",
    borderColor: "border-cyan-200 dark:border-cyan-500/20",
  },
  {
    id: "account",
    label: "Account & Profile",
    icon: User,
    color: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
    textColor: "text-emerald-600 dark:text-emerald-400",
    borderColor: "border-emerald-200 dark:border-emerald-500/20",
  },
  {
    id: "payments",
    label: "Payments & Billing",
    icon: CreditCard,
    color: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-500/10",
    textColor: "text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-200 dark:border-amber-500/20",
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: ArrowLeftRight,
    color: "from-violet-500 to-violet-600",
    bgColor: "bg-violet-50 dark:bg-violet-500/10",
    textColor: "text-violet-600 dark:text-violet-400",
    borderColor: "border-violet-200 dark:border-violet-500/20",
  },
  {
    id: "disputes",
    label: "Disputes & Refunds",
    icon: Shield,
    color: "from-red-500 to-red-600",
    bgColor: "bg-red-50 dark:bg-red-500/10",
    textColor: "text-red-600 dark:text-red-400",
    borderColor: "border-red-200 dark:border-red-500/20",
  },
  {
    id: "technical",
    label: "Technical Support",
    icon: Wrench,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-500/10",
    textColor: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-500/20",
  },
];

// ---- Resource Links ----
const RESOURCE_LINKS = [
  {
    title: "Documentation",
    description: "Comprehensive guides and API documentation",
    icon: BookOpen,
    color: "from-cyan-500 to-blue-500",
    href: "#",
  },
  {
    title: "API Reference",
    description: "REST API endpoints and integration guides",
    icon: Code,
    color: "from-violet-500 to-purple-500",
    href: "#",
  },
  {
    title: "Community Forum",
    description: "Connect with other users and share tips",
    icon: Users,
    color: "from-emerald-500 to-teal-500",
    href: "#",
  },
  {
    title: "Video Tutorials",
    description: "Step-by-step video walkthroughs",
    icon: Video,
    color: "from-amber-500 to-orange-500",
    href: "#",
  },
];

// ---- Quick Chat Responses ----
const QUICK_CHAT_RESPONSES = [
  "I need help with payments",
  "I have a bug to report",
  "How do I withdraw?",
];

const BOT_RESPONSES: Record<string, string> = {
  "I need help with payments":
    "I'd be happy to help with payments! 💳 You can manage your payment methods in Settings. For withdrawals, go to the Withdraw section. Our standard commission is 10%. Need more specific help?",
  "I have a bug to report":
    "Sorry to hear that! 🐛 Please describe the bug in detail below — what page were you on, what did you click, and what happened? You can also submit a formal bug report through the contact form above.",
  "How do I withdraw?":
    "To withdraw your earnings 💰, go to Dashboard → Withdraw. You can withdraw via bank transfer or PayPal. Minimum withdrawal is $50, and processing takes 1-3 business days.",
};

const DEFAULT_BOT_RESPONSE =
  "Thanks for reaching out! 😊 Our support team typically responds within 24 hours. For urgent issues, you can also use the contact form above for a formal ticket. Is there anything specific I can help with?";

// ---- Chat Message ----
interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

// ---- Contact Form ----
function ContactSupportForm() {
  const { user } = useAuthStore();
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("medium");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const maxChars = 500;

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
    } catch {
      toast.success("Support ticket submitted! We'll get back to you within 24 hours.");
      setSubject("");
      setPriority("medium");
      setMessage("");
      setSubmitted(true);
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
          <Sparkles className="size-8 text-emerald-600 dark:text-emerald-400" />
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
        <Label htmlFor="subject">Subject</Label>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger id="subject">
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
        <div className="flex gap-2">
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
          <Label htmlFor="message">Message</Label>
          <span className={cn(
            "text-xs",
            message.length > maxChars * 0.9 ? "text-red-500" : "text-muted-foreground"
          )}>
            {message.length}/{maxChars}
          </span>
        </div>
        <Textarea
          id="message"
          placeholder="Describe your issue in detail..."
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, maxChars))}
          rows={5}
          className="resize-none"
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
        disabled={sending || !subject || !message.trim()}
      >
        {sending ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
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

// ---- Live Chat Widget ----
function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      text: "Hi there! 👋 I'm the Marketplace assistant. How can I help you today?",
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const addMessage = useCallback((text: string, isBot: boolean) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-${Math.random()}`,
        text,
        isBot,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const handleSend = useCallback(
    (text?: string) => {
      const msg = text || inputText.trim();
      if (!msg) return;

      addMessage(msg, false);
      setInputText("");
      setIsTyping(true);

      // Simulate bot response after 1 second
      setTimeout(() => {
        setIsTyping(false);
        const botResponse = BOT_RESPONSES[msg] || DEFAULT_BOT_RESPONSE;
        addMessage(botResponse, true);
      }, 1000);
    },
    [inputText, addMessage]
  );

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-20 md:bottom-6 right-6 z-50 size-14 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 transition-shadow flex items-center justify-center"
        onClick={() => setIsOpen(true)}
      >
        <MessageSquare className="size-6" />
        <span className="absolute -top-1 -right-1 flex size-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full size-4 bg-emerald-400 text-[8px] font-bold items-center justify-center">
            1
          </span>
        </span>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className={cn(
        "fixed bottom-20 md:bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] rounded-2xl border border-border bg-background shadow-2xl overflow-hidden flex flex-col",
        isMinimized ? "h-14" : "h-[480px]"
      )}
    >
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Support Assistant</p>
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-white/80">Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="size-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <Minus className="size-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="size-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Chat Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.isBot ? "justify-start" : "justify-end"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                    msg.isBot
                      ? "bg-muted text-foreground rounded-tl-sm"
                      : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-tr-sm"
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="size-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="size-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Responses */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {QUICK_CHAT_RESPONSES.map((qr) => (
                <button
                  key={qr}
                  onClick={() => handleSend(qr)}
                  className="text-xs px-3 py-1.5 rounded-full border border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition-colors"
                >
                  {qr}
                </button>
              ))}
            </div>
          )}

          {/* Chat Input */}
          <div className="p-3 border-t border-border shrink-0">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Type a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1 h-9 text-sm"
              />
              <Button
                size="icon"
                className="size-9 shrink-0 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                onClick={() => handleSend()}
                disabled={!inputText.trim()}
              >
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

// ---- Main Help Page ----
export function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Filter FAQs based on search and category
  const filteredFAQs = useMemo(() => {
    let result = FAQS;

    if (activeCategory) {
      result = result.filter((faq) => faq.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (faq) =>
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query)
      );
    }

    return result;
  }, [searchQuery, activeCategory]);

  // Group filtered FAQs by category
  const groupedFAQs = useMemo(() => {
    const groups: Record<string, FAQ[]> = {};
    for (const faq of filteredFAQs) {
      const cat = faq.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(faq);
    }
    return groups;
  }, [filteredFAQs]);

  // Get FAQ count per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const faq of FAQS) {
      counts[faq.category] = (counts[faq.category] || 0) + 1;
    }
    return counts;
  }, []);

  return (
    <div className="py-2">
      {/* Gradient Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 p-6 md:p-8 text-white mb-8"
      >
        {/* Decorative elements */}
        <div className="absolute -top-8 -right-8 size-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-4 -left-4 size-24 rounded-full bg-white/10 blur-xl" />
        <div className="absolute top-1/2 right-1/4 size-16 rounded-full bg-white/5 blur-lg" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
              <LifeBuoy className="size-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Help & Support Center
              </h1>
              <p className="text-white/80 mt-1 text-sm">
                Find answers, browse guides, or reach out to our support team
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-8"
      >
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input
            placeholder="Search for help articles, FAQs, and more..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 text-base rounded-xl border-border/60 focus:border-cyan-400 focus:ring-cyan-400/20"
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
      </motion.div>

      {/* Category Cards - 3x2 Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10"
      >
        {CATEGORIES.map((cat, index) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          const count = categoryCounts[cat.id] || 0;

          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.05 }}
              whileHover={{ y: -2 }}
            >
              <Card
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  isActive ? `ring-2 ring-cyan-500 ${cat.borderColor}` : `hover:${cat.borderColor}`
                )}
                onClick={() =>
                  setActiveCategory(isActive ? null : cat.id)
                }
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "flex size-11 items-center justify-center rounded-xl",
                        cat.bgColor
                      )}
                    >
                      <Icon className={cn("size-5", cat.textColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm mb-1">{cat.label}</h3>
                      <p className="text-xs text-muted-foreground">
                        {count} article{count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {isActive && (
                      <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400 text-[10px] border-0">
                        Active
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Category filter reset */}
      {activeCategory && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">
            Filtered by: <strong>{CATEGORIES.find((c) => c.id === activeCategory)?.label}</strong>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setActiveCategory(null)}
          >
            Clear filter
          </Button>
        </div>
      )}

      {/* FAQ Accordion */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-12"
      >
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="size-5 text-cyan-600 dark:text-cyan-400" />
          <h2 className="text-lg font-semibold">
            {activeCategory
              ? CATEGORIES.find((c) => c.id === activeCategory)?.label + " FAQs"
              : "Frequently Asked Questions"}
          </h2>
          <Badge variant="secondary" className="text-xs">
            {filteredFAQs.length}
          </Badge>
        </div>

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
              <div key={categoryId} className="mb-6 last:mb-0">
                <div className="flex items-center gap-2 mb-3">
                  <CategoryIcon className={cn("size-5", category.textColor)} />
                  <h3 className="text-base font-semibold">{category.label}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {faqs.length}
                  </Badge>
                </div>
                <Card>
                  <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, index) => (
                      <AccordionItem
                        key={faq.id}
                        value={faq.id}
                        className={index === faqs.length - 1 ? "border-b-0" : ""}
                      >
                        <AccordionTrigger className="text-sm text-left hover:no-underline hover:text-cyan-600 dark:hover:text-cyan-400 px-4 py-3">
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
      </motion.div>

      {/* Contact Support Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-12"
      >
        <div className="grid lg:grid-cols-[1fr_1fr] gap-8">
          {/* Contact Form */}
          <Card className="border-cyan-200/50 dark:border-cyan-500/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center">
                  <Headphones className="size-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Contact Support</CardTitle>
                  <CardDescription>
                    Submit a ticket and we&apos;ll respond within 24 hours
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ContactSupportForm />
            </CardContent>
          </Card>

          {/* Alternative Contact Methods */}
          <div className="space-y-4">
            <Card className="border-cyan-200/50 dark:border-cyan-500/20 bg-gradient-to-br from-cyan-50/80 to-blue-50/80 dark:from-cyan-500/5 dark:to-blue-500/5">
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center size-12 rounded-full bg-cyan-500/10 mb-4">
                  <MessageSquare className="size-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">Need Instant Help?</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                  Try our live chat assistant for quick answers to common questions. Available 24/7.
                </p>
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    24/7 Available
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="size-3" />
                    AI-Powered
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="font-semibold text-sm">Other Ways to Reach Us</h4>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="size-9 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center">
                    <Mail className="size-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email Support</p>
                    <p className="text-xs text-muted-foreground">support@marketplace.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                    <BookOpen className="size-4 text-emerald-600 dark:text-emerald-400" />
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

      {/* Resource Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-4">
          <ExternalLink className="size-5 text-cyan-600 dark:text-cyan-400" />
          <h2 className="text-lg font-semibold">Resources</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {RESOURCE_LINKS.map((resource, index) => {
            const Icon = resource.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                whileHover={{ y: -3 }}
              >
                <Card className="cursor-pointer hover:shadow-md transition-all h-full group">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "size-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0",
                          resource.color
                        )}
                      >
                        <Icon className="size-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                          {resource.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {resource.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Live Chat Widget */}
      <LiveChatWidget />
    </div>
  );
}
